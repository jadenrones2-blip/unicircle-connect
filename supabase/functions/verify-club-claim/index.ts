import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimRequest {
  action: "send-verification" | "verify-token";
  claimId?: string;
  token?: string;
  email?: string;
  name?: string;
  clubName?: string;
  clubId?: string;
  proofLink?: string;
  redirectUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, claimId, token, email, name, clubName, clubId, proofLink, redirectUrl } = await req.json() as ClaimRequest;

    if (action === "send-verification") {
      if (!email || !name || !clubName || !clubId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if club already has an owner
      const { data: existingOwner } = await supabase
        .from("club_owners")
        .select("id")
        .eq("club_id", clubId)
        .maybeSingle();

      if (existingOwner) {
        return new Response(
          JSON.stringify({ error: "This club already has a verified owner" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for pending claim
      const { data: existingClaim } = await supabase
        .from("club_claim_requests")
        .select("id, status")
        .eq("club_id", clubId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingClaim) {
        return new Response(
          JSON.stringify({ error: "There is already a pending claim for this club" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate verification token
      const verificationToken = crypto.randomUUID();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create claim request with token
      const { data: claim, error: insertError } = await supabase
        .from("club_claim_requests")
        .insert({
          club_id: clubId,
          club_name: clubName,
          name: name,
          email: email,
          proof_link: proofLink || null,
          verification_token: verificationToken,
          token_expires_at: tokenExpiry.toISOString(),
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating claim:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create claim request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send verification email if Resend is configured
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const verifyUrl = `${redirectUrl || "https://unicircle-connect.lovable.app"}/verify-claim?token=${verificationToken}`;

        try {
          await resend.emails.send({
            from: "UniCircle <noreply@unicircle.club>",
            to: [email],
            subject: `Verify your ownership of ${clubName}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1a1a2e;">Verify Your Club Ownership</h1>
                <p>Hi ${name},</p>
                <p>You've requested to claim ownership of <strong>${clubName}</strong> on UniCircle.</p>
                <p>Click the button below to verify your email and complete the claim:</p>
                <div style="margin: 24px 0;">
                  <a href="${verifyUrl}" style="background: linear-gradient(135deg, #f4d47c, #d4a44c); color: #1a1a2e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Verify Ownership
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Don't fail the request if email fails - they can still use the token
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Verification email sent",
          claimId: claim.id,
          // Include token in response for testing (remove in production)
          ...(Deno.env.get("DENO_ENV") === "development" && { token: verificationToken })
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify-token") {
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Missing verification token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find claim by token
      const { data: claim, error: findError } = await supabase
        .from("club_claim_requests")
        .select("*")
        .eq("verification_token", token)
        .eq("status", "pending")
        .maybeSingle();

      if (findError || !claim) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token is expired
      if (new Date(claim.token_expires_at) < new Date()) {
        await supabase
          .from("club_claim_requests")
          .update({ status: "expired" })
          .eq("id", claim.id);

        return new Response(
          JSON.stringify({ error: "Verification token has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if club already has an owner (race condition protection)
      const { data: existingOwner } = await supabase
        .from("club_owners")
        .select("id")
        .eq("club_id", claim.club_id)
        .maybeSingle();

      if (existingOwner) {
        await supabase
          .from("club_claim_requests")
          .update({ status: "rejected" })
          .eq("id", claim.id);

        return new Response(
          JSON.stringify({ error: "This club already has a verified owner" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create club owner record
      const { error: ownerError } = await supabase
        .from("club_owners")
        .insert({
          club_id: claim.club_id,
          club_name: claim.club_name,
          email: claim.email,
          user_id: claim.user_id || "00000000-0000-0000-0000-000000000000", // Placeholder if no user
        });

      if (ownerError) {
        console.error("Error creating owner:", ownerError);
        return new Response(
          JSON.stringify({ error: "Failed to verify ownership" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update claim status
      await supabase
        .from("club_claim_requests")
        .update({ 
          status: "approved",
          verified_at: new Date().toISOString()
        })
        .eq("id", claim.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Club ownership verified",
          clubName: claim.club_name,
          clubId: claim.club_id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-club-claim:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
