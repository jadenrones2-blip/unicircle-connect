import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedEventData {
  title: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  description: string | null;
}

// Maximum allowed base64 size (5MB when decoded, roughly 6.67MB as base64)
const MAX_BASE64_SIZE = 7 * 1024 * 1024; // 7MB base64 string limit

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTH CHECK ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const _supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const _supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authSupabase = createClient(_supabaseUrl, _supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, imageUrl } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Either imageBase64 or imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate base64 size to prevent resource exhaustion
    if (imageBase64) {
      if (typeof imageBase64 !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid image format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (imageBase64.length > MAX_BASE64_SIZE) {
        return new Response(
          JSON.stringify({ error: "Image too large. Maximum size is 5MB." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate imageUrl format if provided
    if (imageUrl) {
      if (typeof imageUrl !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid image URL format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      try {
        const url = new URL(imageUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid image URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Build the image source for Claude
    let imageSource;
    if (imageBase64) {
      let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
      if (imageBase64.startsWith("iVBOR")) mediaType = "image/png";
      else if (imageBase64.startsWith("R0lGOD")) mediaType = "image/gif";
      else if (imageBase64.startsWith("UklGR")) mediaType = "image/webp";

      imageSource = { type: "base64", media_type: mediaType, data: imageBase64 };
    } else {
      // Fetch the URL and convert to base64 for Claude
      const imgRes = await fetch(imageUrl);
      const imgBuf = await imgRes.arrayBuffer();
      const imgB64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
      const ct = imgRes.headers.get("content-type") || "image/jpeg";
      imageSource = { type: "base64", media_type: ct, data: imgB64 };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: "You are an expert at extracting event information from flyers, posters, and Instagram posts. Extract only what you can clearly see. For dates use YYYY-MM-DD format. For times use HH:MM 24-hour format. Return only a JSON object, no markdown, no extra text.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: imageSource,
              },
              {
                type: "text",
                text: `Extract event details from this flyer. Return exactly this JSON shape:\n{\n  "title": "Event title or null",\n  "date": "YYYY-MM-DD or null",\n  "time": "HH:MM (24-hour) or null",\n  "location": "Full location or null",\n  "description": "Event description or null"\n}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response from AI
    let extractedData: ExtractedEventData;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse extracted data");
    }

    // Validate and clean the extracted data
    const result: ExtractedEventData = {
      title: typeof extractedData.title === "string" ? extractedData.title.trim() : null,
      date: typeof extractedData.date === "string" ? extractedData.date.trim() : null,
      time: typeof extractedData.time === "string" ? extractedData.time.trim() : null,
      location: typeof extractedData.location === "string" ? extractedData.location.trim() : null,
      description: typeof extractedData.description === "string" ? extractedData.description.trim() : null,
    };

    console.log("Extracted event data:", result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting event from flyer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
