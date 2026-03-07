import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyApplicantRequest {
  applicantId: string;
  applicantEmail: string;
  applicantName: string;
  stageName: string;
  clubName: string;
  clubId: string;
}

// Stages that trigger email notifications
const NOTIFICATION_STAGES = ['interview', 'accepted', 'offer', 'final round', 'second round'];

function shouldNotify(stageName: string): boolean {
  return NOTIFICATION_STAGES.some(stage => 
    stageName.toLowerCase().includes(stage)
  );
}

function getEmailContent(stageName: string, applicantName: string, clubName: string): { subject: string; html: string } {
  const lowerStage = stageName.toLowerCase();
  
  if (lowerStage.includes('accepted') || lowerStage.includes('offer')) {
    return {
      subject: `🎉 Congratulations! You've been accepted to ${clubName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { font-size: 28px; font-weight: bold; color: #b8860b; }
            .card { background: linear-gradient(135deg, #1a5f1a 0%, #2d8f2d 100%); border-radius: 16px; padding: 32px; color: #fff; }
            .card h1 { color: #90EE90; margin: 0 0 8px 0; font-size: 24px; }
            .card p { margin: 0 0 24px 0; opacity: 0.95; }
            .highlight { background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ Unicircle</div>
            </div>
            <div class="card">
              <h1>Congratulations, ${applicantName}!</h1>
              <p>We're thrilled to inform you that you've been <strong>accepted</strong> to join <strong>${clubName}</strong>!</p>
              <div class="highlight">
                <p style="margin: 0;">🎊 This is a significant achievement. The club will reach out to you with next steps regarding onboarding and membership.</p>
              </div>
              <p>We're excited to have you as part of our community!</p>
            </div>
            <div class="footer">
              <p>This notification was sent via Unicircle on behalf of ${clubName}.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
  
  // Default: Interview/other stage notification
  return {
    subject: `📅 ${clubName} - You've advanced to ${stageName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 32px; }
          .logo { font-size: 28px; font-weight: bold; color: #b8860b; }
          .card { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: #fff; }
          .card h1 { color: #ffd700; margin: 0 0 8px 0; font-size: 24px; }
          .card p { margin: 0 0 24px 0; opacity: 0.9; }
          .stage-badge { display: inline-block; background: linear-gradient(135deg, #b8860b 0%, #daa520 100%); color: #1a1a1a; padding: 8px 20px; border-radius: 20px; font-weight: 600; margin-bottom: 16px; }
          .highlight { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ Unicircle</div>
          </div>
          <div class="card">
            <h1>Great news, ${applicantName}!</h1>
            <p>You've advanced in the recruitment process at <strong>${clubName}</strong>.</p>
            <div class="highlight">
              <span class="stage-badge">${stageName}</span>
              <p style="margin: 12px 0 0 0;">The club will contact you with more details about next steps. Keep an eye on your email!</p>
            </div>
            <p>Best of luck! 🍀</p>
          </div>
          <div class="footer">
            <p>This notification was sent via Unicircle on behalf of ${clubName}.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTH + CLUB OWNERSHIP CHECK ============
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

    const { 
      applicantId, 
      applicantEmail, 
      applicantName, 
      stageName, 
      clubName,
      clubId 
    }: NotifyApplicantRequest = await req.json();

    // Validate required fields
    if (!applicantEmail || !applicantName || !stageName || !clubName) {
      throw new Error("Missing required fields");
    }

    // Verify club ownership
    if (clubId) {
      const { data: ownership } = await authSupabase
        .from("club_owners")
        .select("id")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!ownership) {
        return new Response(
          JSON.stringify({ error: "Not authorized for this club" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check if this stage should trigger a notification
    if (!shouldNotify(stageName)) {
      console.log(`Stage "${stageName}" does not trigger notifications`);
      return new Response(
        JSON.stringify({ success: true, message: "No notification needed for this stage" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, html } = getEmailContent(stageName, applicantName, clubName);

    const emailResponse = await resend.emails.send({
      from: "Unicircle <noreply@unicircle.app>",
      to: [applicantEmail],
      subject,
      html,
    });

    console.log("Applicant stage notification sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-applicant-stage:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
