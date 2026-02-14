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

    const authToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(authToken);
    if (claimsError || !claimsData?.claims) {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the image content for the AI
    let imageContent;
    if (imageBase64) {
      // Detect media type from base64 header or default to jpeg
      let mediaType = "image/jpeg";
      if (imageBase64.startsWith("/9j/")) mediaType = "image/jpeg";
      else if (imageBase64.startsWith("iVBOR")) mediaType = "image/png";
      else if (imageBase64.startsWith("R0lGOD")) mediaType = "image/gif";
      else if (imageBase64.startsWith("UklGR")) mediaType = "image/webp";

      imageContent = {
        type: "image_url",
        image_url: {
          url: `data:${mediaType};base64,${imageBase64}`,
        },
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl,
        },
      };
    }

    const systemPrompt = `You are an expert at extracting event information from flyers, posters, and Instagram posts. 
Analyze the image and extract the following event details. Be precise and extract only what you can clearly see.

For dates, return in YYYY-MM-DD format if possible. If you see "Feb 15" or "February 15th", infer the year (use 2025 if unclear).
For times, return in HH:MM 24-hour format (e.g., "18:00" for 6 PM).
For location, extract the full venue name and any room/building details.
For title, extract the main event name.
For description, extract any additional details like what the event is about, what to bring, RSVP info, etc.

If you cannot determine a field with confidence, return null for that field.`;

    const userPrompt = `Extract event details from this flyer/poster image. Return a JSON object with these exact fields:
{
  "title": "Event title or null",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM (24-hour) or null", 
  "location": "Full location or null",
  "description": "Event description/details or null"
}

Only return the JSON object, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              imageContent,
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

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
