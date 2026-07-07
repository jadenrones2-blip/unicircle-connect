import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await serviceClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download PDF from the resumes bucket (uploaded by upload-resume function)
    const { data: pdfBlob, error: storageErr } = await serviceClient.storage
      .from("resumes")
      .download(`${user.id}/resume.pdf`);

    if (storageErr || !pdfBlob) {
      return new Response(JSON.stringify({ error: "Resume not found — upload it first" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert PDF to base64 in chunks to avoid spread argument limit
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Pdf = btoa(binary);

    // Call Claude Haiku with native PDF document support
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf,
                },
              },
              {
                type: "text",
                text: `Extract skills, job titles, technologies, and domain keywords from this resume for matching the student to college clubs and organizations.

Return ONLY a JSON array of 10-25 lowercase strings. Example: ["machine learning", "python", "pre-med", "finance", "research", "data analysis"].

Focus on domain-specific terms. Skip generic words like "communication", "teamwork", or "leadership".`,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("Claude error:", claudeRes.status, errText);
      throw new Error("AI extraction failed");
    }

    const claudeJson = await claudeRes.json();
    const content: string = claudeJson.content?.[0]?.text ?? "";

    let signals: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          signals = parsed
            .filter((s: unknown) => typeof s === "string")
            .map((s: string) => s.toLowerCase().trim())
            .slice(0, 30);
        }
      }
    } catch {
      console.error("Failed to parse Claude response:", content);
    }

    // Save signals to profiles.resume_signals
    await serviceClient
      .from("profiles")
      .upsert({ user_id: user.id, resume_signals: signals }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ signals }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-resume error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
