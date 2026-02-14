import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Allowed origins for CORS - restrict to your application domains
const allowedOrigins = [
  "https://wpczgwxsriezaubncuom.lovableproject.com",
  "https://unicircle.app",
  "https://www.unicircle.app",
  // Add localhost for development
  "http://localhost:5173",
  "http://localhost:3000",
];

// Get CORS headers based on request origin
const getCorsHeaders = (origin: string | null) => {
  // Check if the origin is in the allowed list
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

interface WaitlistSignupRequest {
  email: string;
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handler = async (req: Request): Promise<Response> => {
  console.log("Received waitlist signup notification request");
  
  // Get origin from request
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: WaitlistSignupRequest = await req.json();
    
    // Validate email format and length
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 254) {
      console.error("Invalid email format:", email ? "[redacted]" : "empty");
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Sanitize email for logging (basic sanitization)
    const sanitizedEmail = email.replace(/[\r\n]/g, '').substring(0, 254);
    console.log("Processing signup for email:", sanitizedEmail);

    // Verify email exists in waitlist and was added recently (within last 5 minutes)
    // This prevents abuse by only allowing emails that were just inserted
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if email exists in waitlist and was added within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: waitlistEntry, error: queryError } = await supabase
      .from("waitlist")
      .select("email, created_at")
      .eq("email", sanitizedEmail)
      .gte("created_at", fiveMinutesAgo)
      .maybeSingle();

    if (queryError) {
      console.error("Database query error:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to verify signup" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!waitlistEntry) {
      console.warn("Email not found in recent waitlist signups:", sanitizedEmail);
      return new Response(
        JSON.stringify({ error: "Email not found in recent signups. Please sign up first." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Verified email in waitlist, proceeding with notification");

    // Send confirmation email to the user
    const userEmailResponse = await resend.emails.send({
      from: "Unicircle <noreply@unicircle.app>",
      to: [sanitizedEmail],
      subject: "Welcome to the Unicircle Waitlist! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 32px; font-weight: bold; color: #d4af37; }
            .content { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(212, 175, 55, 0.2); }
            h1 { color: #d4af37; margin: 0 0 20px 0; font-size: 24px; }
            p { color: #a0a0a0; line-height: 1.6; margin: 0 0 15px 0; }
            .highlight { color: #ffffff; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">◯ Unicircle</div>
            </div>
            <div class="content">
              <h1>You're on the list!</h1>
              <p class="highlight">Thanks for joining the Unicircle waitlist.</p>
              <p>You'll be among the first to know when we launch at UCSD. We're building something special for students who want to find their people on campus.</p>
              <p>Stay tuned – your circle is waiting.</p>
              <p style="margin-top: 25px; color: #d4af37;">– The Unicircle Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Unicircle. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("User confirmation email sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-waitlist-signup function:", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: "Failed to send confirmation email. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
