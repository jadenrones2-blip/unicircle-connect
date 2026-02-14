import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EventApprovedRequest {
  eventTitle: string;
  clubHandle: string;
  startTime: string;
  location?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTH + ADMIN CHECK ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const authToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(authToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminCheckSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminCheckSupabase.rpc('has_role', {
      _user_id: claimsData.claims.sub,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { eventTitle, clubHandle, startTime, location }: EventApprovedRequest = await req.json();

    if (!eventTitle || !clubHandle) {
      throw new Error("Missing required fields: eventTitle and clubHandle");
    }

    // Use admin client to look up club owner
    const supabase = adminCheckSupabase;

    // Look up the club owner by club_id (which matches club_handle)
    const { data: owner, error: ownerError } = await supabase
      .from("club_owners")
      .select("email, club_name")
      .eq("club_id", clubHandle)
      .maybeSingle();

    if (ownerError) {
      console.error("Error fetching club owner:", ownerError);
      throw new Error("Failed to fetch club owner");
    }

    if (!owner) {
      console.log(`No owner found for club_handle: ${clubHandle}`);
      return new Response(
        JSON.stringify({ success: true, message: "No owner to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format the start time for display
    const formattedDate = new Date(startTime).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Unicircle <noreply@unicircle.app>",
      to: [owner.email],
      subject: `✅ Your event "${eventTitle}" has been approved!`,
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
            .details { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .detail-row { display: flex; margin-bottom: 8px; }
            .detail-label { color: #b8860b; width: 80px; font-weight: 500; }
            .detail-value { flex: 1; }
            .cta { display: inline-block; background: linear-gradient(135deg, #b8860b 0%, #daa520 100%); color: #1a1a1a; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .footer { text-align: center; margin-top: 32px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ Unicircle</div>
            </div>
            <div class="card">
              <h1>Event Approved!</h1>
              <p>Great news! Your event has been reviewed and approved. It's now live on the Unicircle calendar.</p>
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Event</span>
                  <span class="detail-value">${eventTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Club</span>
                  <span class="detail-value">${owner.club_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">When</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                ${location ? `
                <div class="detail-row">
                  <span class="detail-label">Where</span>
                  <span class="detail-value">${location}</span>
                </div>
                ` : ''}
              </div>
              <a href="https://unicircle-connect.lovable.app/calendar" class="cta">View on Calendar →</a>
            </div>
            <div class="footer">
              <p>You're receiving this because you manage ${owner.club_name} on Unicircle.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Event approval notification sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-event-approved:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
