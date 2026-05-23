import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── NIGO-aware ETL system prompt ──────────────────────────────────────────────
// Returns TWO arrays: clean_records (all critical fields present) and
// nigo_queue (missing critical data) so nothing is ever silently dropped.
const CLAUDE_SYSTEM = `You are an enterprise-grade ETL pipeline for a student organization platform. You receive raw CSV/spreadsheet data with inconsistent column names. Clean every row and classify it.

TRANSFORMATION RULES:
- first_name / last_name: Infer from any "Name", "Full Name", "Student" column. Split combined names on the first space. Capitalize properly.
- email: Find any column with "@". Lowercase and trim. Must contain "@" and a "." after the @.
- major: Normalize slang to official titles. Examples: "Comm", "PR" → "Communications"; "CS", "Comp Sci" → "Computer Science"; "Bio" → "Biology"; "Poli Sci" → "Political Science"; "Psych" → "Psychology"; "Econ" → "Economics". Unknown values: keep as-is.
- status: Map to exactly one of: applicant | member | alumni. Default "applicant" if missing.
- gender: Map to exactly one of: male | female | non-binary | unspecified. Default "unspecified" if missing.
- grad_year: Extract 4-digit integer. Text like "Junior" → null.

NIGO CLASSIFICATION — A row is NIGO (Not In Good Order) if ANY of:
- first_name is empty or cannot be determined
- last_name is empty or cannot be determined
- email is missing, has no "@", or is clearly not an email

RETURN FORMAT — valid JSON only, no explanation, no markdown:
{
  "clean_records": [
    { "first_name": "string", "last_name": "string", "email": "string", "major": "string|null", "status": "applicant|member|alumni", "gender": "male|female|non-binary|unspecified", "grad_year": "integer|null" }
  ],
  "nigo_queue": [
    { "first_name": "string|null", "last_name": "string|null", "email": "string|null", "major": "string|null", "status": "applicant|member|alumni", "gender": "male|female|non-binary|unspecified", "grad_year": "integer|null", "flag_reason": "Specific human-readable reason e.g. 'Missing email address' or 'Name could not be determined'" }
  ]
}

Every input row must appear in exactly one array. Never drop a row.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await serviceClient.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clubId = (formData.get("club_id") as string || "").trim();

    if (!file) return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!clubId) return new Response(JSON.stringify({ error: "club_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── EXTRACT ───────────────────────────────────────────────────────────────
    let csvText: string;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      csvText = XLSX.utils.sheet_to_csv(firstSheet);
    } else {
      csvText = await file.text();
    }
    if (csvText.length > 80000) csvText = csvText.slice(0, 80000);

    // ── TRANSFORM (Claude) with 25s timeout ───────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let cleanRecords: any[] = [];
    let nigoQueue: any[] = [];

    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8192,
          system: CLAUDE_SYSTEM,
          messages: [{ role: "user", content: csvText }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!claudeRes.ok) throw new Error(`Claude HTTP ${claudeRes.status}`);

      const claudeData = await claudeRes.json();
      const rawText = claudeData.content?.[0]?.text || "{}";

      try {
        const parsed = JSON.parse(rawText);
        cleanRecords = Array.isArray(parsed.clean_records) ? parsed.clean_records : [];
        nigoQueue = Array.isArray(parsed.nigo_queue) ? parsed.nigo_queue : [];
      } catch {
        // Claude returned malformed JSON — everything goes to NIGO
        nigoQueue = [{ flag_reason: "AI could not parse the file. Check that it contains valid tabular data." }];
      }
    } catch (claudeErr: any) {
      clearTimeout(timeoutId);
      // Claude timed out or errored — return gracefully, don't crash
      return new Response(JSON.stringify({
        inserted: 0,
        nigo_count: 0,
        nigo_queue: [],
        error: claudeErr?.name === "AbortError"
          ? "AI processing timed out. Try a smaller file (under 500 rows)."
          : "AI processing failed. Please try again.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── LOAD (clean records only) ─────────────────────────────────────────────
    let inserted = 0;

    if (cleanRecords.length > 0) {
      const payload = cleanRecords.map((r: any) => ({
        organization_id: clubId,
        first_name: String(r.first_name || "").trim(),
        last_name: String(r.last_name || "").trim(),
        email: String(r.email || "").trim().toLowerCase(),
        major: r.major || null,
        status: ["applicant", "member", "alumni"].includes(r.status) ? r.status : "applicant",
        grad_year: Number.isInteger(r.grad_year) ? r.grad_year : null,
        stage: "applied",
      }));

      for (let i = 0; i < payload.length; i += 100) {
        const { error: upsertErr } = await serviceClient
          .from("people")
          .upsert(payload.slice(i, i + 100), { onConflict: "email,organization_id", ignoreDuplicates: false });
        if (!upsertErr) inserted += Math.min(100, payload.length - i);
      }
    }

    // Return inserted count + full NIGO queue for the frontend
    return new Response(JSON.stringify({
      inserted,
      nigo_count: nigoQueue.length,
      nigo_queue: nigoQueue,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
