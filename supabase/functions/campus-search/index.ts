import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Club {
  id: string;
  name: string;
  category?: string;
  categoryBucket?: string;
  description?: string;
  tags?: string[];
  recruitingStatus?: string;
}

interface Event {
  id: string;
  title: string;
  start_time?: string;
  location?: string;
  club_handle?: string;
  caption?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, clubs = [], events = [] } = await req.json();

    if (!query?.trim()) {
      return new Response(JSON.stringify({ clubs: [], events: [], summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // Build compact club list for the prompt (cap to avoid token limits)
    const clubSummaries = (clubs as Club[]).slice(0, 200).map(c =>
      `[${c.id}] ${c.name} | ${c.categoryBucket || c.category || "General"} | ${c.recruitingStatus || "unknown"} | ${c.description?.slice(0, 80) || ""}`
    ).join("\n");

    const eventSummaries = (events as Event[]).slice(0, 100).map(e => {
      const d = e.start_time ? new Date(e.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
      return `[${e.id}] ${e.title} | ${d} | ${e.location || ""} | @${e.club_handle || ""}`;
    }).join("\n");

    const systemPrompt = `You are a campus search engine for UniCircle, a UCSD club discovery platform.
A student typed a natural language search query. Return the most relevant clubs and events.

Respond with ONLY valid JSON in this exact shape:
{
  "clubs": [{ "id": "string", "reason": "one short sentence why this matches" }],
  "events": [{ "id": "string", "reason": "one short sentence why this matches" }],
  "summary": "one sentence describing what you found"
}

Rules:
- Return at most 6 clubs and 4 events
- Only include genuinely relevant results — quality over quantity
- "reason" must be specific to the query, not generic
- If nothing matches well, return empty arrays
- IDs must exactly match the input data`;

    const userPrompt = `Query: "${query}"

CLUBS:
${clubSummaries || "No clubs available"}

EVENTS:
${eventSummaries || "No events available"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
    const anthropicData = await response.json();
    const text = anthropicData.content?.[0]?.text ?? "{}";

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("campus-search error:", err);
    return new Response(
      JSON.stringify({ clubs: [], events: [], summary: "", error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
