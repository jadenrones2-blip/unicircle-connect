import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    let imageBase64: string | null = null;
    try {
      const body = await req.json();
      imageBase64 = body.imageBase64 ?? null;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set");
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Calling Anthropic API, base64 length:", imageBase64.length);

    // Detect media type
    let mediaType = "image/jpeg";
    if (imageBase64.startsWith("iVBOR")) mediaType = "image/png";
    else if (imageBase64.startsWith("R0lGOD")) mediaType = "image/gif";
    else if (imageBase64.startsWith("UklGR")) mediaType = "image/webp";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Extract event details from this flyer. Return ONLY a JSON object with no markdown or extra text:
{
  "title": "Event title or null",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM in 24-hour format or null",
  "location": "Full venue name and room or null",
  "description": "Brief description of the event or null"
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Anthropic error ${anthropicRes.status}: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await anthropicRes.json();
    console.log("Anthropic response received");

    const content = aiData.content?.[0]?.text || "";
    console.log("Raw content:", content);

    // Parse JSON — strip markdown fences if present
    let clean = content.trim();
    if (clean.startsWith("```")) clean = clean.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();

    let extracted: Record<string, string | null>;
    try {
      extracted = JSON.parse(clean);
    } catch {
      // Try to find JSON object inside the text
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        extracted = JSON.parse(match[0]);
      } else {
        console.error("Could not parse JSON from:", clean);
        return new Response(
          JSON.stringify({ success: false, error: "Could not parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const result = {
      title: typeof extracted.title === "string" ? extracted.title.trim() : null,
      date: typeof extracted.date === "string" ? extracted.date.trim() : null,
      time: typeof extracted.time === "string" ? extracted.time.trim() : null,
      location: typeof extracted.location === "string" ? extracted.location.trim() : null,
      description: typeof extracted.description === "string" ? extracted.description.trim() : null,
    };

    console.log("Extracted result:", JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unhandled error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
