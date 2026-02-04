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
  metadata: Record<string, string>;
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { club_id, applicant_ids } = await req.json();

    if (!club_id || !applicant_ids || !Array.isArray(applicant_ids)) {
      return new Response(
        JSON.stringify({ error: "Missing club_id or applicant_ids" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify club ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from("club_owners")
      .select("id")
      .eq("club_id", club_id)
      .eq("user_id", claimsData.claims.sub)
      .maybeSingle();

    if (ownershipError || !ownership) {
      return new Response(JSON.stringify({ error: "Not authorized for this club" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch requirements
    const { data: requirements, error: reqError } = await supabase
      .from("recruitment_requirements")
      .select("*")
      .eq("club_id", club_id);

    if (reqError) {
      console.error("Error fetching requirements:", reqError);
      return new Response(JSON.stringify({ error: "Failed to fetch requirements" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch applicants
    const { data: applicants, error: appError } = await supabase
      .from("applicants")
      .select("*")
      .eq("club_id", club_id)
      .in("id", applicant_ids);

    if (appError) {
      console.error("Error fetching applicants:", appError);
      return new Response(JSON.stringify({ error: "Failed to fetch applicants" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const strictFilters = (requirements || []).filter((r: Requirement) => r.type === "strict");
    const aiCriteria = (requirements || []).filter((r: Requirement) => r.type === "ai");

    const results: ScreeningResult[] = [];

    for (const applicant of applicants as Applicant[]) {
      // Check strict filters
      let passesStrict = true;

      for (const filter of strictFilters) {
        const value = filter.value as Record<string, unknown>;

        if (filter.criterion === "min_gpa") {
          const minGpa = value.min_gpa as number;
          if (applicant.gpa === null || applicant.gpa < minGpa) {
            passesStrict = false;
            break;
          }
        }

        if (filter.criterion === "allowed_majors") {
          const allowedMajors = (value.majors as string[]).map((m) => m.toLowerCase());
          if (!applicant.major || !allowedMajors.includes(applicant.major.toLowerCase())) {
            passesStrict = false;
            break;
          }
        }

        if (filter.criterion === "allowed_years") {
          const allowedYears = (value.years as string[]).map((y) => y.toLowerCase());
          if (!applicant.year || !allowedYears.includes(applicant.year.toLowerCase())) {
            passesStrict = false;
            break;
          }
        }
      }

      // Prepare AI screening prompt
      let fitScore = passesStrict ? 50 : 20;
      let aiSummary = "";

      if (aiCriteria.length > 0 && Object.keys(applicant.metadata || {}).length > 0) {
        const criteriaText = aiCriteria
          .map((c: Requirement) => `- ${(c.value as { description: string }).description}`)
          .join("\n");

        const metadataText = Object.entries(applicant.metadata || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");

        const prompt = `You are an objective recruitment screening assistant. Analyze this candidate based on the club's specific requirements.

CANDIDATE INFORMATION:
Name: ${applicant.first_name} ${applicant.last_name}
Major: ${applicant.major || "Not specified"}
Year: ${applicant.year || "Not specified"}
GPA: ${applicant.gpa || "Not specified"}

FORM RESPONSES:
${metadataText}

CLUB EVALUATION CRITERIA:
${criteriaText}

TASK: Provide a factual alignment analysis. Do NOT make a hiring decision.

Respond in this exact JSON format:
{
  "fit_score": <number 1-100>,
  "summary": "<2-3 sentence factual summary of alignment with criteria>"
}

Score guidelines:
- 80-100: Strong alignment with multiple criteria
- 60-79: Moderate alignment with some criteria
- 40-59: Limited alignment
- 1-39: Poor alignment or insufficient information`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a recruitment screening assistant. Always respond with valid JSON." },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              fitScore = Math.max(1, Math.min(100, parsed.fit_score || fitScore));
              aiSummary = parsed.summary || "";
            }
          } else {
            console.error("AI API error:", aiResponse.status, await aiResponse.text());
            aiSummary = "AI screening unavailable";
          }
        } catch (aiError) {
          console.error("AI screening error:", aiError);
          aiSummary = "AI screening failed";
        }
      } else if (aiCriteria.length === 0) {
        aiSummary = "No AI criteria defined";
      } else {
        aiSummary = "No form responses to analyze";
      }

      // Adjust score based on strict filter results
      if (!passesStrict) {
        fitScore = Math.min(fitScore, 30);
        aiSummary = `[Does not meet strict requirements] ${aiSummary}`;
      }

      results.push({
        applicant_id: applicant.id,
        fit_score: fitScore,
        ai_summary: aiSummary,
        passes_strict_filters: passesStrict,
      });

      // Update applicant in database
      await supabase
        .from("applicants")
        .update({
          fit_score: fitScore,
          ai_summary: aiSummary,
          passes_strict_filters: passesStrict,
        })
        .eq("id", applicant.id);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Screening error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
