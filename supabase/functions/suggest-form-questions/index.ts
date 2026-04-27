import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { club_name, description, category, tags, website, instagram, looking_for } = await req.json();

    const hasClubContext = club_name || description;
    if (!hasClubContext && !looking_for) {
      return new Response(JSON.stringify({ error: "At least club context or looking_for is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tagList = Array.isArray(tags) && tags.length > 0
      ? `Tags: ${tags.join(", ")}`
      : "";

    const websiteLine = website ? `Club website: ${website}` : "";
    const instagramLine = instagram ? `Club Instagram: ${instagram}` : "";
    const socialLines = [websiteLine, instagramLine].filter(Boolean).join("\n");

    const clubContext = hasClubContext
      ? `Club name: ${club_name || "Unknown Club"}
Club category: ${category || "Student Organization"}
Club description: ${description || "A UCSD student organization"}
${tagList}${socialLines ? "\n" + socialLines : ""}`
      : "Club: A UCSD student organization";

    const additionalContext = looking_for
      ? `\nWhat the officer is specifically looking for: ${looking_for}`
      : "";

    const prompt = `You are helping a UCSD student club create application form questions. You have been given the club's actual profile including their description and website — use all of it to generate questions that are highly specific and relevant to what this club actually does.

${clubContext}${additionalContext}

Generate exactly 5 application questions that will help this club identify the best candidates. Mix short answer and long answer types. Do NOT include basic info questions (name, email, major, year, GPA) — those are already collected automatically.

Be specific to this club's actual focus. Do not ask generic questions unless they are genuinely relevant. A question like "What experience do you have with X?" should reference something real about this club's work.

Return ONLY a JSON array in exactly this format:
[
  { "label": "question text here", "type": "short" },
  { "label": "question text here", "type": "long" },
  { "label": "question text here", "type": "short" },
  { "label": "question text here", "type": "long" },
  { "label": "question text here", "type": "short" }
]

type must be either "short" or "long". No other fields. No explanation. Just the JSON array.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Claude error:", err);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data.content?.[0]?.text || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
