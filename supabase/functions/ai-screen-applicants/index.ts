import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Applicant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  year: string | null;
  gpa: number | null;
  metadata: Record<string, string> | null;
}

interface FormQuestion {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
}

interface Requirement {
  id: string;
  type: "strict" | "ai";
  criterion: string;
  value: Record<string, unknown>;
}

interface ScreeningResult {
  applicant_id: string;
  fit_score: number;
  ai_summary: string;
  passes_strict_filters: boolean;
  is_standout: boolean;
}

interface ClaudeResponse {
  fit_score: number;
  summary: string;
  recommendation?: string;
  is_standout?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { club_id, applicant_ids } = await req.json();
    if (!club_id || !applicant_ids || !Array.isArray(applicant_ids)) {
      return new Response(
        JSON.stringify({ error: "Missing club_id or applicant_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify club ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from("club_owners")
      .select("id")
      .eq("club_id", club_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownershipError || !ownership) {
      return new Response(JSON.stringify({ error: "Not authorized for this club" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch requirements, form questions, and applicants in parallel
    const [reqRes, formRes, appRes] = await Promise.all([
      supabase.from("recruitment_requirements").select("*").eq("club_id", club_id),
      supabase.from("application_forms").select("questions").eq("club_id", club_id).maybeSingle(),
      supabase.from("applicants").select("*").eq("club_id", club_id).in("id", applicant_ids),
    ]);

    if (reqRes.error) {
      return new Response(JSON.stringify({ error: "Failed to fetch requirements" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (appRes.error) {
      return new Response(JSON.stringify({ error: "Failed to fetch applicants" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requirements = (reqRes.data || []) as Requirement[];
    const formQuestions = ((formRes.data?.questions as FormQuestion[]) || []);
    const strictFilters = requirements.filter((r) => r.type === "strict");
    const aiCriteria = requirements.filter((r) => r.type === "ai");

    // Build a map: questionId → label for human-readable responses
    const questionLabels = new Map<string, string>();
    for (const q of formQuestions) {
      questionLabels.set(q.id, q.label);
    }

    const results: ScreeningResult[] = [];

    for (const applicant of appRes.data as Applicant[]) {
      // ── Strict filter check ────────────────────────────────────────────────
      let passesStrict = true;
      for (const filter of strictFilters) {
        const value = filter.value as Record<string, unknown>;
        if (filter.criterion === "min_gpa") {
          const minGpa = value.min_gpa as number;
          if (applicant.gpa === null || applicant.gpa < minGpa) { passesStrict = false; break; }
        }
        if (filter.criterion === "allowed_majors") {
          const allowed = (value.majors as string[]).map((m) => m.toLowerCase());
          if (!applicant.major || !allowed.includes(applicant.major.toLowerCase())) { passesStrict = false; break; }
        }
        if (filter.criterion === "allowed_years") {
          const allowed = (value.years as string[]).map((y) => y.toLowerCase());
          if (!applicant.year || !allowed.includes(applicant.year.toLowerCase())) { passesStrict = false; break; }
        }
      }

      // ── AI screening ───────────────────────────────────────────────────────
      let fitScore = passesStrict ? 50 : 20;
      let aiSummary = "";
      let isStandout = false;

      const hasResponses = applicant.metadata && Object.keys(applicant.metadata).length > 0;

      if (aiCriteria.length > 0 && hasResponses && anthropicApiKey) {
        // Map question IDs to human-readable Q&A pairs
        const qaPairs = Object.entries(applicant.metadata!)
          .map(([key, answer]) => {
            const label = questionLabels.get(key) || key;
            return `Q: ${label}\nA: ${answer}`;
          })
          .join("\n\n");

        const criteriaWithIds = aiCriteria.map((c, i) => {
          const val = c.value as { description: string; weight?: number };
          return { index: i + 1, description: val.description, weight: val.weight ?? 3 };
        });

        const criteriaText = criteriaWithIds
          .map((c) => `${c.index}. ${c.description} [weight: ${c.weight}/5]`)
          .join("\n");

        const criteriaScoreFields = criteriaWithIds
          .map((c) => `  "criterion_${c.index}": <integer 1-10>`)
          .join(",\n");

        const prompt = `You are an objective recruitment screening assistant. Score this candidate against each criterion individually, then we will compute the weighted total.

CANDIDATE:
Name: ${applicant.first_name} ${applicant.last_name}
Major: ${applicant.major || "Not specified"}
Year: ${applicant.year || "Not specified"}
GPA: ${applicant.gpa ?? "Not specified"}

FORM RESPONSES:
${qaPairs}

EVALUATION CRITERIA (score each 1-10):
${criteriaText}

INSTRUCTIONS:
- Score each criterion independently on a 1-10 scale based only on evidence in the responses.
- Be factual and specific. Do NOT make a hiring decision.
- Write a 2-3 sentence summary focused on the strongest signals — positive or negative.
- Set is_standout to true ONLY for candidates who demonstrate something genuinely exceptional. Expect ~10-15% to be standouts.

Respond ONLY with valid JSON in exactly this format:
{
${criteriaScoreFields},
  "summary": "<2-3 sentence factual summary>",
  "recommendation": "<Accept | Waitlist | Reject>",
  "is_standout": <true | false>
}`;

        try {
          const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": anthropicApiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 512,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const content = aiData.content?.[0]?.text || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as ClaudeResponse;

              // Compute weighted score from per-criterion scores
              let weightedSum = 0;
              let totalWeight = 0;
              for (const c of criteriaWithIds) {
                const rawScore = (parsed as any)[`criterion_${c.index}`];
                if (typeof rawScore === "number") {
                  weightedSum += rawScore * c.weight;
                  totalWeight += c.weight;
                }
              }

              if (totalWeight > 0) {
                // Convert weighted average (1-10 scale) to 1-100
                fitScore = Math.max(1, Math.min(100, Math.round((weightedSum / totalWeight) * 10)));
              } else if (typeof parsed.fit_score === "number") {
                fitScore = Math.max(1, Math.min(100, parsed.fit_score));
              }

              aiSummary = parsed.recommendation
                ? `[${parsed.recommendation}] ${parsed.summary}`
                : parsed.summary || "";
              isStandout = parsed.is_standout === true;
            }
          } else {
            const errText = await aiRes.text();
            console.error("Claude API error:", aiRes.status, errText);
            aiSummary = "AI screening unavailable";
          }
        } catch (aiError) {
          console.error("AI screening error:", aiError);
          aiSummary = "AI screening failed";
        }
      } else if (aiCriteria.length === 0) {
        aiSummary = "No AI criteria defined";
      } else if (!hasResponses) {
        aiSummary = "No form responses to analyze";
      } else {
        // No API key — fall back to a neutral message
        aiSummary = "AI screening not configured (missing ANTHROPIC_API_KEY)";
      }

      // Cap score if strict filters failed
      if (!passesStrict) {
        fitScore = Math.min(fitScore, 30);
        aiSummary = `[Does not meet strict requirements] ${aiSummary}`;
      }

      // Standouts must also pass strict filters
      if (!passesStrict) isStandout = false;

      results.push({
        applicant_id: applicant.id,
        fit_score: fitScore,
        ai_summary: aiSummary,
        passes_strict_filters: passesStrict,
        is_standout: isStandout,
      });

      // Persist to DB
      await supabase
        .from("applicants")
        .update({ fit_score: fitScore, ai_summary: aiSummary, passes_strict_filters: passesStrict, is_standout: isStandout })
        .eq("id", applicant.id);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Screening error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
