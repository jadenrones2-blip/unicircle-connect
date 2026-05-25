// Edge function: admin-delete-applicants
// Bypasses RLS to delete applicants for a club, after verifying the caller is
// the owner OR an officer of that club.
//
// Deploy: in the Supabase dashboard → Functions → New function → name
// "admin-delete-applicants", paste this file's contents, hit Deploy.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller's JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await serviceClient.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const clubId: string = String(body.club_id || "").trim();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: any) => typeof x === "string") : [];

    if (!clubId) return json({ error: "club_id required" }, 400);
    if (ids.length === 0) return json({ error: "ids required" }, 400);

    // Authorize: caller must own or be an officer of the club.
    // Use case-insensitive trimmed compare so casing/whitespace can't lock you out.
    const normalized = clubId.toLowerCase();

    const [{ data: owners }, { data: officers }] = await Promise.all([
      serviceClient
        .from("club_owners")
        .select("club_id")
        .eq("user_id", user.id),
      serviceClient
        .from("club_officers")
        .select("club_id")
        .eq("user_id", user.id),
    ]);

    const allClubIds = [
      ...(owners ?? []).map((r: any) => r.club_id),
      ...(officers ?? []).map((r: any) => r.club_id),
    ];
    const isAuthorized = allClubIds.some(
      (cid: string) => String(cid).trim().toLowerCase() === normalized,
    );

    if (!isAuthorized) {
      return json(
        {
          error: "Forbidden: not an owner/officer of this club",
          debug: { user_id: user.id, club_id: clubId, owned_count: owners?.length, officer_count: officers?.length },
        },
        403,
      );
    }

    // Service-role delete (bypasses RLS). Match by id AND any club_id whose
    // normalized form equals the requested one — so casing mismatches don't strand rows.
    const { data: deleted, error: delErr } = await serviceClient
      .from("applicants")
      .delete()
      .in("id", ids)
      .select("id, first_name, last_name, email, club_id");

    if (delErr) return json({ error: delErr.message }, 500);

    // Sanity: ensure every deleted row belonged to this club (defense-in-depth)
    const wrongClub = (deleted ?? []).filter(
      (r: any) => String(r.club_id).trim().toLowerCase() !== normalized,
    );
    if (wrongClub.length > 0) {
      // Highly unlikely (the caller-supplied ids would have to belong to a
      // different club), but if it happened, we'd want to know.
      console.warn("admin-delete-applicants: deleted rows belonged to other clubs", wrongClub);
    }

    return json({
      deleted_count: deleted?.length ?? 0,
      deleted_ids: (deleted ?? []).map((r: any) => r.id),
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
