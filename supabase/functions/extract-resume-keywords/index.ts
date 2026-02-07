import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== "string") {
      return new Response(
        JSON.stringify({ error: "Resume text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert at analyzing resumes to identify student interests, skills, and experiences that would help match them with college clubs and organizations.

Extract keywords and categorize them into these specific categories that map to club types:
- career_goals: Tech, Finance, Consulting, Healthcare, Startup, Research, Creative, Nonprofit
- interests: tech, business, arts, science, culture, fitness, social_impact, gaming
- skills: leadership, public_speaking, coding, design, writing, research, marketing, finance
- vibe: competitive, collaborative, creative, professional, casual

Return a JSON object with arrays for each category. Only include keywords that are clearly present in the resume. Be selective - only extract strong signals, not every word.`;

    const userPrompt = `Analyze this resume and extract keywords for club matching:

${resumeText.slice(0, 8000)}

Return ONLY a valid JSON object with this structure:
{
  "career_goals": ["string array of career-related keywords"],
  "interests": ["string array of interest keywords"],
  "skills": ["string array of skill keywords"],
  "vibe": ["string array of personality/work style keywords"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to process resume");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON from the response
    let keywords;
    try {
      // Try to extract JSON from the response (it might have markdown formatting)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        keywords = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse resume keywords");
    }

    // Validate and normalize the response
    const normalizedKeywords = {
      career_goals: Array.isArray(keywords.career_goals) ? keywords.career_goals.slice(0, 5) : [],
      interests: Array.isArray(keywords.interests) ? keywords.interests.slice(0, 5) : [],
      skills: Array.isArray(keywords.skills) ? keywords.skills.slice(0, 5) : [],
      vibe: Array.isArray(keywords.vibe) ? keywords.vibe.slice(0, 3) : [],
    };

    return new Response(
      JSON.stringify({ keywords: normalizedKeywords }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
