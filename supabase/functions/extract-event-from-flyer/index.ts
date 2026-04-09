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

  // Lightweight auth — just require a Bearer token (Supabase JWT)
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let imageBase64: string;
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    if (!imageBase64) throw new Error("missing imageBase64");
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "imageBase64 required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Detect media type from base64 prefix
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
  if (imageBase64.startsWith("iVBOR")) mediaType = "image/png";
  else if (imageBase64.startsWith("R0lGOD")) mediaType = "image/gif";
  else if (imageBase64.startsWith("UklGR")) mediaType = "image/webp";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text: 'Extract event details from this flyer. Return ONLY valid JSON, no markdown:\n{"title":null,"date":null,"time":null,"location":null,"description":null}\nFor date use YYYY-MM-DD. For time use HH:MM 24-hour.',
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", res.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Anthropic ${res.status}: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text || "";

    // Strip markdown fences
    let clean = raw.trim().replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
    // Extract JSON object
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not parse AI response: " + raw }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(match[0]);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: extracted.title || null,
          date: extracted.date || null,
          time: extracted.time || null,
          location: extracted.location || null,
          description: extracted.description || null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
