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

    // Read the student's bio from their profile
    const { data: profile, error: profileErr } = await serviceClient
      .from("profiles")
      .select("bio")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("profile fetch error:", profileErr);
      throw new Error("Could not load profile");
    }

    const bio = (profile?.bio ?? "").trim();

    // No bio to parse — clear any stale signals and return empty (no Claude call)
    if (!bio) {
      await serviceClient
        .from("profiles")
        .upsert({ user_id: user.id, bio_signals: [] }, { onConflict: "user_id" });
      return new Response(JSON.stringify({ signals: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Claude Haiku with the bio text
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `A student wrote this short bio for a college club-matching app. Extract keywords representing their skills, interests, goals, and personality for matching them to clubs and organizations.

Bio:
"""
${bio}
"""

Return ONLY a JSON array of 8-20 lowercase strings. Example: ["machine learning", "photography", "leadership", "startups", "community service", "creative"].

Focus on specific, matchable terms — fields, activities, skills, values. Skip filler like "passionate", "hardworking", or "motivated".`,
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

    // Save signals to profiles.bio_signals
    await serviceClient
      .from("profiles")
      .upsert({ user_id: user.id, bio_signals: signals }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ signals }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-bio error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
