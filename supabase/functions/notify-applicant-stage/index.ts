import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Escape user-controlled strings before inserting into HTML
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyApplicantRequest {
  notificationType: 'stage_advance' | 'application_received' | 'final_decision' | 'custom';
  applicantId?: string;
  applicantEmail: string;
  applicantName: string;
  stageName?: string;
  clubName: string;
  clubId?: string;
  finalDecision?: string;
  customSubject?: string;
  customBody?: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function buildCustomHtml(body: string, clubName: string): string {
  // Convert newlines to <br> and escape each line
  const htmlBody = body
    .split('\n')
    .map(line => esc(line))
    .join('<br>');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { font-size: 28px; font-weight: bold; color: #b8860b; }
        .card { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: #fff; }
        .card p { margin: 0 0 16px 0; opacity: 0.9; line-height: 1.7; }
        .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><div class="logo">✨ Unicircle</div></div>
        <div class="card">
          <p>${htmlBody}</p>
        </div>
        <div class="footer"><p>This message was sent via Unicircle on behalf of ${esc(clubName)}.</p></div>
      </div>
    </body>
    </html>
  `;
}

function getStageAdvanceEmail(stageName: string, applicantName: string, clubName: string): { subject: string; html: string } {
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
            <div class="header"><div class="logo">✨ Unicircle</div></div>
            <div class="card">
              <h1>Congratulations, ${esc(applicantName)}!</h1>
              <p>We're thrilled to inform you that you've been <strong>accepted</strong> to join <strong>${esc(clubName)}</strong>!</p>
              <div class="highlight">
                <p style="margin: 0;">🎊 The club will reach out to you with next steps regarding onboarding and membership.</p>
              </div>
              <p>We're excited to have you as part of our community!</p>
            </div>
            <div class="footer"><p>This notification was sent via Unicircle on behalf of ${esc(clubName)}.</p></div>
          </div>
        </body>
        </html>
      `,
    };
  }

  return {
    subject: `📅 ${esc(clubName)} — You've advanced to ${esc(stageName)}`,
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
          <div class="header"><div class="logo">✨ Unicircle</div></div>
          <div class="card">
            <h1>Great news, ${esc(applicantName)}!</h1>
            <p>You've advanced in the recruitment process at <strong>${esc(clubName)}</strong>.</p>
            <div class="highlight">
              <span class="stage-badge">${esc(stageName)}</span>
              <p style="margin: 12px 0 0 0;">The club will contact you with more details about next steps. Keep an eye on your email!</p>
            </div>
            <p>Best of luck! 🍀</p>
          </div>
          <div class="footer"><p>This notification was sent via Unicircle on behalf of ${esc(clubName)}.</p></div>
        </div>
      </body>
      </html>
    `,
  };
}

function getApplicationReceivedEmail(applicantName: string, clubName: string): { subject: string; html: string } {
  return {
    subject: `✅ Application received — ${esc(clubName)}`,
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
          .card p { margin: 0 0 16px 0; opacity: 0.9; }
          .check-box { background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #34d399; font-size: 15px; }
          .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><div class="logo">✨ Unicircle</div></div>
          <div class="card">
            <h1>We got your application!</h1>
            <p>Hey ${esc(applicantName)},</p>
            <p>Your application to <strong>${esc(clubName)}</strong> has been successfully submitted.</p>
            <div class="check-box">✓ Application received and under review</div>
            <p>The officers will review applications and be in touch soon. Good luck! 🤞</p>
          </div>
          <div class="footer"><p>This notification was sent via Unicircle on behalf of ${esc(clubName)}.</p></div>
        </div>
      </body>
      </html>
    `,
  };
}

function getFinalDecisionEmail(applicantName: string, clubName: string, decision: string): { subject: string; html: string } {
  const isAccepted = decision === 'accepted';
  const isRejected = decision === 'rejected';

  if (isAccepted) {
    return {
      subject: `🎉 You're in! Welcome to ${esc(clubName)}`,
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
            .card p { margin: 0 0 16px 0; opacity: 0.95; }
            .highlight { background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><div class="logo">✨ Unicircle</div></div>
            <div class="card">
              <h1>Welcome, ${esc(applicantName)}! 🎊</h1>
              <p>We're thrilled to officially welcome you to <strong>${esc(clubName)}</strong>!</p>
              <div class="highlight">
                <p style="margin: 0;">The club will be reaching out soon with details on next steps, meetings, and how to get involved.</p>
              </div>
              <p>Can't wait to have you with us!</p>
            </div>
            <div class="footer"><p>This notification was sent via Unicircle on behalf of ${esc(clubName)}.</p></div>
          </div>
        </body>
        </html>
      `,
    };
  }

  if (isRejected) {
    return {
      subject: `${esc(clubName)} — Application Update`,
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
            .card p { margin: 0 0 16px 0; opacity: 0.9; }
            .note { background: rgba(255,255,255,0.07); border-radius: 8px; padding: 16px; margin-bottom: 24px; font-style: italic; color: #a1a1aa; }
            .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><div class="logo">✨ Unicircle</div></div>
            <div class="card">
              <h1>Hi ${esc(applicantName)},</h1>
              <p>Thank you so much for your interest in <strong>${esc(clubName)}</strong> and for taking the time to apply.</p>
              <p>After careful consideration, we won't be moving forward with your application at this time. This was a difficult decision — we had many talented applicants and limited spots.</p>
              <div class="note">We encourage you to keep exploring clubs on Unicircle and apply again in a future cycle. Your next opportunity is just around the corner. 💪</div>
              <p>We wish you all the best in your campus journey!</p>
            </div>
            <div class="footer"><p>This notification was sent via Unicircle on behalf of ${esc(clubName)}.</p></div>
          </div>
        </body>
        </html>
      `,
    };
  }

  // Waitlisted or other decision
  return {
    subject: `${esc(clubName)} — Application Status Update`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #b8860b; text-align: center; margin-bottom: 32px; }
          .card { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 16px; padding: 32px; color: #fff; }
          .card h1 { color: #ffd700; margin: 0 0 8px 0; font-size: 24px; }
          .card p { margin: 0 0 16px 0; opacity: 0.9; }
          .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">✨ Unicircle</div>
          <div class="card">
            <h1>Hi ${esc(applicantName)},</h1>
            <p>There's an update on your application to <strong>${esc(clubName)}</strong>.</p>
            <p>Your application status is now: <strong>${esc(decision)}</strong>.</p>
            <p>The club will be in touch with further details.</p>
          </div>
          <div class="footer"><p>This notification was sent via Unicircle on behalf of ${esc(clubName)}.</p></div>
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
    const body: NotifyApplicantRequest = await req.json();
    const { notificationType, applicantEmail, applicantName, stageName, clubName, clubId, finalDecision, customSubject, customBody } = body;

    // Validate required fields
    if (!applicantEmail || !applicantName || !clubName) {
      throw new Error("Missing required fields");
    }

    // Auth check for officer-initiated notifications
    if (notificationType !== 'application_received') {
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

      // Verify club ownership if clubId provided
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
    }

    let emailContent: { subject: string; html: string };

    if (notificationType === 'application_received') {
      emailContent = getApplicationReceivedEmail(applicantName, clubName);
    } else if (notificationType === 'final_decision' && finalDecision) {
      emailContent = getFinalDecisionEmail(applicantName, clubName, finalDecision);
    } else if (notificationType === 'stage_advance' && stageName) {
      emailContent = getStageAdvanceEmail(stageName, applicantName, clubName);
    } else if (notificationType === 'custom' && customSubject && customBody) {
      const nameParts = applicantName.trim().split(/\s+/);
      const vars: Record<string, string> = {
        first_name: nameParts[0] ?? '',
        last_name: nameParts.slice(1).join(' ') ?? '',
        club_name: clubName,
        stage: stageName ?? '',
      };
      emailContent = {
        subject: interpolate(customSubject, vars),
        html: buildCustomHtml(interpolate(customBody, vars), clubName),
      };
    } else {
      return new Response(
        JSON.stringify({ success: true, message: "No email action needed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await resend.emails.send({
      from: "Unicircle <noreply@unicircle.app>",
      to: [applicantEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Applicant notification sent:", notificationType, emailResponse);

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
