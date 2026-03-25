import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ADMIN_EMAIL = "jaden@unicircle.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyClubRequestBody {
  type: 'new_request' | 'approved' | 'rejected';
  clubName: string;
  contactEmail: string;
  university?: string;
  category?: string;
  description?: string;
  proofLink?: string;
  reviewerNotes?: string;
  rejectionReason?: string;
}

// Escape user-controlled strings before inserting into HTML
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Only allow https:// URLs pointing to public hosts
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
    if (blocked.includes(host)) return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NotifyClubRequestBody = await req.json();
    const { type, clubName, contactEmail, university, category, description, proofLink, reviewerNotes, rejectionReason } = body;

    if (!type || !clubName || !contactEmail) {
      throw new Error("Missing required fields: type, clubName, contactEmail");
    }

    // approved / rejected are admin-only actions — require auth + admin role
    if (type === 'approved' || type === 'rejected') {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await authSupabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: roleData } = await authSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Validate proofLink if provided
    const safeProofLink = proofLink && isSafeUrl(proofLink) ? proofLink : null;

    if (type === 'new_request') {
      await resend.emails.send({
        from: "Unicircle <noreply@unicircle.app>",
        to: [ADMIN_EMAIL],
        subject: `🆕 New club request: ${esc(clubName)}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .logo { font-size: 24px; font-weight: bold; color: #b8860b; margin-bottom: 24px; }
              .card { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; }
              .field { margin-bottom: 14px; }
              .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; font-weight: 600; }
              .value { font-size: 15px; color: #1a1a1a; margin-top: 2px; }
              .link { color: #b8860b; }
              .cta { display: inline-block; background: #b8860b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">✨ Unicircle Admin</div>
              <p>A new club request has been submitted. Review and approve or reject it in the admin panel.</p>
              <div class="card">
                <div class="field"><div class="label">Club Name</div><div class="value">${esc(clubName)}</div></div>
                ${university ? `<div class="field"><div class="label">University</div><div class="value">${esc(university)}</div></div>` : ''}
                ${category ? `<div class="field"><div class="label">Category</div><div class="value">${esc(category)}</div></div>` : ''}
                <div class="field"><div class="label">Contact Email</div><div class="value">${esc(contactEmail)}</div></div>
                ${safeProofLink ? `<div class="field"><div class="label">Proof Link</div><div class="value"><a href="${esc(safeProofLink)}" class="link">${esc(safeProofLink)}</a></div></div>` : ''}
                ${description ? `<div class="field"><div class="label">Description</div><div class="value">${esc(description)}</div></div>` : ''}
              </div>
              <a href="https://unicircle.app/admin/requests" class="cta">Review Request →</a>
            </div>
          </body>
          </html>
        `,
      });
    } else if (type === 'approved') {
      await resend.emails.send({
        from: "Unicircle <noreply@unicircle.app>",
        to: [contactEmail],
        subject: `🎉 ${esc(clubName)} has been approved on Unicircle!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .logo { font-size: 24px; font-weight: bold; color: #b8860b; text-align: center; margin-bottom: 24px; }
              .card { background: linear-gradient(135deg, #1a5f1a 0%, #2d8f2d 100%); border-radius: 16px; padding: 32px; color: #fff; }
              .card h1 { color: #90EE90; margin: 0 0 8px 0; font-size: 24px; }
              .card p { margin: 0 0 16px 0; opacity: 0.95; }
              .steps { background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin: 16px 0; }
              .steps ol { margin: 8px 0 0 0; padding-left: 18px; }
              .steps li { margin-bottom: 6px; }
              .cta { display: inline-block; background: #ffd700; color: #1a1a1a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 16px; }
              .note { font-size: 13px; opacity: 0.8; margin-top: 12px; }
              .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">✨ Unicircle</div>
              <div class="card">
                <h1>Welcome to Unicircle! 🎊</h1>
                <p><strong>${esc(clubName)}</strong> has been approved and is now live on the platform.</p>
                <div class="steps">
                  <strong>Here's how to get started:</strong>
                  <ol>
                    <li>Log in at <strong>unicircle.app</strong> with this email</li>
                    <li>Find your club in the directory and click 'Claim Club'</li>
                    <li>Verify with your club email to get instant access</li>
                    <li>Complete your club profile (logo, description, social links)</li>
                  </ol>
                </div>
                ${reviewerNotes ? `<p><em>Note from reviewer: ${esc(reviewerNotes)}</em></p>` : ''}
                <a href="https://unicircle.app/clubs?search=${encodeURIComponent(clubName)}" class="cta">Find &amp; Claim Your Club →</a>
                <p class="note">If you run into any issues, reply to this email and we'll help you get set up.</p>
              </div>
              <div class="footer"><p>Unicircle — The platform for UCSD student clubs</p></div>
            </div>
          </body>
          </html>
        `,
      });
    } else if (type === 'rejected') {
      await resend.emails.send({
        from: "Unicircle <noreply@unicircle.app>",
        to: [contactEmail],
        subject: `${esc(clubName)} — Club Request Update`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .logo { font-size: 24px; font-weight: bold; color: #b8860b; text-align: center; margin-bottom: 24px; }
              .card { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: #fff; }
              .card h1 { color: #ffd700; margin: 0 0 8px 0; font-size: 24px; }
              .card p { margin: 0 0 16px 0; opacity: 0.9; }
              .reason { background: rgba(255,255,255,0.07); border-left: 3px solid #ffd700; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-style: italic; color: #a1a1aa; }
              .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">✨ Unicircle</div>
              <div class="card">
                <h1>Application Update</h1>
                <p>Thank you for your interest in bringing <strong>${esc(clubName)}</strong> to Unicircle.</p>
                <p>After reviewing your request, we're unable to approve it at this time.</p>
                ${rejectionReason ? `<div class="reason">${esc(rejectionReason)}</div>` : ''}
                <p>If you believe this was an error or have additional information to share, you're welcome to reply to this email and we'll take another look.</p>
                <p>We appreciate your interest in Unicircle!</p>
              </div>
              <div class="footer"><p>Unicircle — The platform for UCSD student clubs</p></div>
            </div>
          </body>
          </html>
        `,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-club-request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
