import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
// Use Web Crypto API for hashing (bcrypt Worker not available in edge runtime)
async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string): Promise<string> {
  // Add a salt prefix for defense in depth
  return sha256Hash('unicircle-claim-salt:' + token);
}

async function compareToken(rawToken: string, storedHash: string): Promise<boolean> {
  const hash = await hashToken(rawToken);
  return hash === storedHash;
}

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

// ============ SECURITY CONSTANTS ============
const TOKEN_EXPIRY_MINUTES = 10; // Changed from 24 hours to 10 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_BLOCK_MINUTES = 120;

// University TLDs that indicate high trust
const UNIVERSITY_TLDS = ['.edu', '.ac.uk', '.edu.au', '.ac.nz', '.edu.sg'];

// Personal email providers (low trust)
const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'aol.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com'
];

// Confusable character mappings for look-alike detection
const CONFUSABLES: Record<string, string> = {
  '0': 'o', '1': 'l', '3': 'e', '5': 's', '8': 'b',
  '@': 'a', '$': 's', '!': 'i', '|': 'l'
};

// ============ HELPER FUNCTIONS ============

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('cf-connecting-ip') || 
         'unknown';
}

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

function normalizeForComparison(domain: string): string {
  let normalized = domain.toLowerCase();
  for (const [confusable, replacement] of Object.entries(CONFUSABLES)) {
    normalized = normalized.split(confusable).join(replacement);
  }
  return normalized;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array(a.length + 1).fill(null).map(() => 
    Array(b.length + 1).fill(null)
  );
  
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i-1][j] + 1,
        matrix[i][j-1] + 1,
        matrix[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
}

async function checkDisposableDomain(supabase: any, domain: string): Promise<boolean> {
  const { data } = await supabase
    .from('disposable_domains')
    .select('domain')
    .eq('domain', domain)
    .maybeSingle();
  return !!data;
}

async function checkDomainRules(supabase: any, domain: string): Promise<{
  ruleType: 'allow' | 'block' | 'flag' | null;
  trustLevel: 'high' | 'medium' | 'low' | null;
}> {
  const { data } = await supabase
    .from('email_domain_rules')
    .select('rule_type, trust_level')
    .eq('domain', domain)
    .maybeSingle();
  
  return {
    ruleType: data?.rule_type || null,
    trustLevel: data?.trust_level || null
  };
}

async function checkLookalikeDomain(supabase: any, domain: string): Promise<{
  isLookalike: boolean;
  similarTo?: string;
}> {
  // Get trusted domains from database
  const { data: trustedDomains } = await supabase
    .from('email_domain_rules')
    .select('domain')
    .eq('rule_type', 'allow')
    .eq('trust_level', 'high');
  
  if (!trustedDomains?.length) return { isLookalike: false };
  
  const normalized = normalizeForComparison(domain);
  const THRESHOLD = 3;
  
  for (const trusted of trustedDomains) {
    const trustedDomain = trusted.domain;
    const normalizedTrusted = normalizeForComparison(trustedDomain);
    
    // Skip if exact match (that's fine)
    if (domain === trustedDomain) continue;
    
    // Check if normalized versions match (confusable attack)
    if (normalized === normalizedTrusted) {
      return { isLookalike: true, similarTo: trustedDomain };
    }
    
    // Levenshtein distance check
    const distance = levenshteinDistance(normalized, normalizedTrusted);
    if (distance > 0 && distance <= THRESHOLD) {
      return { isLookalike: true, similarTo: trustedDomain };
    }
    
    // Typosquat patterns: ucsd-edu.com, ucsdedu.com, etc.
    const escapedDomain = trustedDomain.replace('.', '\\.');
    const typosquatPatterns = [
      new RegExp(`^${trustedDomain.replace('.', '-')}`),
      new RegExp(`^${trustedDomain.replace('.', '')}`),
      new RegExp(`${escapedDomain}\\..+$`),
    ];
    
    if (typosquatPatterns.some(p => p.test(domain))) {
      return { isLookalike: true, similarTo: trustedDomain };
    }
  }
  
  return { isLookalike: false };
}

function calculateTrustScore(domain: string, domainRule: { ruleType: string | null; trustLevel: string | null }): {
  score: number;
  level: 'high' | 'medium' | 'low';
} {
  // If domain is in our allowlist with trust level
  if (domainRule.ruleType === 'allow' && domainRule.trustLevel === 'high') {
    return { score: 100, level: 'high' };
  }
  
  // Check university TLDs
  if (UNIVERSITY_TLDS.some(tld => domain.endsWith(tld))) {
    return { score: 100, level: 'high' };
  }
  
  // Personal email providers
  if (PERSONAL_DOMAINS.includes(domain)) {
    return { score: 20, level: 'low' };
  }
  
  // Medium trust for allowed non-high domains
  if (domainRule.ruleType === 'allow') {
    return { score: 60, level: 'medium' };
  }
  
  // Unknown domain - default low
  return { score: 30, level: 'low' };
}

async function checkRateLimit(supabase: any, email: string, clubId: string, ipAddress: string): Promise<{
  allowed: boolean;
  blockedUntil?: string;
}> {
  const now = new Date();
  
  // Check existing rate limit
  const { data: existing } = await supabase
    .from('claim_rate_limits')
    .select('*')
    .eq('email', email)
    .eq('club_id', clubId)
    .maybeSingle();
  
  if (existing) {
    // Check if currently blocked
    if (existing.blocked_until && new Date(existing.blocked_until) > now) {
      return { allowed: false, blockedUntil: existing.blocked_until };
    }
    
    // Check if window has passed
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    if (new Date(existing.first_attempt_at) < windowStart) {
      // Reset counter
      await supabase
        .from('claim_rate_limits')
        .update({
          attempt_count: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
          blocked_until: null
        })
        .eq('id', existing.id);
      return { allowed: true };
    }
    
    // Check if over limit
    if (existing.attempt_count >= RATE_LIMIT_MAX_ATTEMPTS) {
      const blockedUntil = new Date(now.getTime() + RATE_LIMIT_BLOCK_MINUTES * 60 * 1000);
      await supabase
        .from('claim_rate_limits')
        .update({
          blocked_until: blockedUntil.toISOString(),
          last_attempt_at: now.toISOString()
        })
        .eq('id', existing.id);
      return { allowed: false, blockedUntil: blockedUntil.toISOString() };
    }
    
    // Increment counter
    await supabase
      .from('claim_rate_limits')
      .update({
        attempt_count: existing.attempt_count + 1,
        last_attempt_at: now.toISOString(),
        ip_address: ipAddress
      })
      .eq('id', existing.id);
    return { allowed: true };
  }
  
  // Create new rate limit entry
  await supabase
    .from('claim_rate_limits')
    .insert({
      email,
      club_id: clubId,
      ip_address: ipAddress,
      attempt_count: 1,
      first_attempt_at: now.toISOString(),
      last_attempt_at: now.toISOString()
    });
  
  return { allowed: true };
}

async function logAuditEvent(supabase: any, clubId: string, userId: string | null, action: string, details: any, ipAddress: string) {
  await supabase
    .from('admin_audit_log')
    .insert({
      club_id: clubId,
      actor_user_id: userId,
      action,
      details,
      ip_address: ipAddress
    });
}

function getRestrictionsForState(verificationState: string): Record<string, boolean> {
  switch (verificationState) {
    case 'verified':
      return { can_publish_events: true, can_mass_message: true, can_add_links: true };
    case 'provisional':
      return { can_publish_events: false, can_mass_message: false, can_add_links: false };
    default:
      return { can_publish_events: false, can_mass_message: false, can_add_links: false };
  }
}

// ============ MAIN HANDLER ============

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ipAddress = getClientIP(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, claimId, token, name, clubName, clubId, proofLink, redirectUrl } = await req.json() as ClaimRequest;

    if (action === "send-verification") {
      // Validate authentication - user must be logged in
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: "Authentication required. Please log in to claim a club." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create client with user's auth to get their info
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: userError } = await userSupabase.auth.getUser();
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication. Please log in again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const userEmail = user.email!;
      const domain = extractDomain(userEmail);

      if (!name || !clubName || !clubId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============ SECURITY CHECKS ============

      // 1. Rate limit check
      const rateLimit = await checkRateLimit(supabase, userEmail, clubId, ipAddress);
      if (!rateLimit.allowed) {
        await logAuditEvent(supabase, clubId, userId, 'claim_rate_limited', {
          email: userEmail, blocked_until: rateLimit.blockedUntil
        }, ipAddress);
        
        return new Response(
          JSON.stringify({ error: `Too many attempts. Please try again after ${new Date(rateLimit.blockedUntil!).toLocaleTimeString()}.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Disposable domain check
      const isDisposable = await checkDisposableDomain(supabase, domain);
      if (isDisposable) {
        await logAuditEvent(supabase, clubId, userId, 'claim_blocked_disposable', {
          email: userEmail, domain
        }, ipAddress);
        
        return new Response(
          JSON.stringify({ error: "Disposable email addresses are not allowed. Please use your university or organization email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Domain rules check
      const domainRule = await checkDomainRules(supabase, domain);
      if (domainRule.ruleType === 'block') {
        await logAuditEvent(supabase, clubId, userId, 'claim_blocked_domain', {
          email: userEmail, domain
        }, ipAddress);
        
        return new Response(
          JSON.stringify({ error: "This email domain is not allowed for club claims." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 4. Look-alike domain check
      const lookalike = await checkLookalikeDomain(supabase, domain);
      if (lookalike.isLookalike) {
        await logAuditEvent(supabase, clubId, userId, 'claim_flagged_lookalike', {
          email: userEmail, domain, similar_to: lookalike.similarTo
        }, ipAddress);
        
        // Flag for manual review but allow the claim to proceed with extra scrutiny
        console.warn(`[SECURITY] Look-alike domain detected: ${domain} similar to ${lookalike.similarTo}`);
      }

      // 5. Calculate trust score
      const trust = calculateTrustScore(domain, domainRule);

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

      // Auto-expire stale pending claims whose tokens have expired
      await supabase
        .from("club_claim_requests")
        .update({ status: "expired" })
        .eq("club_id", clubId)
        .eq("status", "pending")
        .lt("token_expires_at", new Date().toISOString());

      // Check if this user already has a pending (non-expired) claim for this club
      const { data: existingUserClaim } = await supabase
        .from("club_claim_requests")
        .select("id, status")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingUserClaim) {
        return new Response(
          JSON.stringify({ error: "You already have a pending claim for this club. Check your email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for any pending claim by others
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

      // Generate secure verification token (one-time use)
      const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID(); // Extra entropy
      const tokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
      
      // Hash the token before storing (defense in depth)
      const hashedToken = await hashToken(rawToken);

      // Create claim request with hashed token, user_id, and trust info
      const { data: claim, error: insertError } = await supabase
        .from("club_claim_requests")
        .insert({
          club_id: clubId,
          club_name: clubName,
          name: name,
          email: userEmail,
          user_id: userId,
          proof_link: proofLink || null,
          verification_token: hashedToken, // Store hashed token
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

      // Log audit event
      await logAuditEvent(supabase, clubId, userId, 'claim_initiated', {
        email: userEmail,
        trust_score: trust.score,
        trust_level: trust.level,
        is_lookalike: lookalike.isLookalike,
        similar_to: lookalike.similarTo
      }, ipAddress);

      // Send verification email if Resend is configured
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const verifyUrl = `${redirectUrl || "https://unicircle.app"}/verify-claim?token=${rawToken}`;

        console.log(`[CLAIM] Sending verification email to ${userEmail} for club ${clubName}`);
        try {
          const emailResult = await resend.emails.send({
            from: "UniCircle <noreply@unicircle.app>",
            to: [userEmail],
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
                <p style="color: #cc0000; font-size: 14px; font-weight: 600;">⚠️ This link expires in ${TOKEN_EXPIRY_MINUTES} minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                <p style="color: #999; font-size: 12px;">
                  Security notice: This verification was requested from IP ${ipAddress.substring(0, 8)}...
                </p>
              </div>
            `,
          });
          console.log("[CLAIM] Email send result:", JSON.stringify(emailResult));
        } catch (emailError) {
          console.error("[CLAIM] Error sending email:", JSON.stringify(emailError));
        }
      } else {
        console.warn("[CLAIM] RESEND_API_KEY not configured, skipping email");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Verification email sent",
          claimId: claim.id,
          expiresIn: `${TOKEN_EXPIRY_MINUTES} minutes`,
          trustLevel: trust.level
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

      // Find all pending claims and verify token hash
      const { data: pendingClaims, error: findError } = await supabase
        .from("club_claim_requests")
        .select("*")
        .eq("status", "pending")
        .not("verification_token", "is", null);

      if (findError) {
        console.error("Error finding claims:", findError);
        return new Response(
          JSON.stringify({ error: "Failed to verify token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find matching claim by comparing hashed tokens
      let claim = null;
      for (const pendingClaim of pendingClaims || []) {
        try {
          const isMatch = await compareToken(token, pendingClaim.verification_token);
          if (isMatch) {
            claim = pendingClaim;
            break;
          }
        } catch {
          // Skip claims with invalid hash format (legacy unhashed tokens)
          continue;
        }
      }

      if (!claim) {
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

        await logAuditEvent(supabase, claim.club_id, claim.user_id, 'claim_token_expired', {
          email: claim.email
        }, ipAddress);

        return new Response(
          JSON.stringify({ error: "Verification token has expired. Please submit a new claim." }),
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

      // Ensure claim has a user_id (security check)
      if (!claim.user_id) {
        return new Response(
          JSON.stringify({ error: "Invalid claim: no user associated. Please submit a new claim while logged in." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate trust for verification state
      const domain = extractDomain(claim.email);
      const domainRule = await checkDomainRules(supabase, domain);
      const trust = calculateTrustScore(domain, domainRule);
      
      // Determine verification state
      const verificationState = trust.score >= 80 ? 'verified' : 'provisional';
      const restrictions = getRestrictionsForState(verificationState);
      
      // Set provisional_until for provisional accounts (30 days to prove good standing)
      const provisionalUntil = verificationState === 'provisional' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create club owner record with verification state
      const { error: ownerError } = await supabase
        .from("club_owners")
        .insert({
          club_id: claim.club_id,
          club_name: claim.club_name,
          email: claim.email,
          user_id: claim.user_id,
          verification_state: verificationState,
          trust_level: trust.level,
          trust_score: trust.score,
          verified_domain: domain,
          last_verification_at: new Date().toISOString(),
          provisional_until: provisionalUntil,
          restrictions: restrictions
        });

      if (ownerError) {
        console.error("Error creating owner:", ownerError);
        return new Response(
          JSON.stringify({ error: "Failed to verify ownership" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Invalidate token (one-time use) by updating claim status
      await supabase
        .from("club_claim_requests")
        .update({ 
          status: "approved",
          verified_at: new Date().toISOString(),
          verification_token: null // Clear token to prevent reuse
        })
        .eq("id", claim.id);

      // Log audit event
      await logAuditEvent(supabase, claim.club_id, claim.user_id, 'claim_verified', {
        email: claim.email,
        verification_state: verificationState,
        trust_level: trust.level,
        trust_score: trust.score
      }, ipAddress);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Club ownership verified",
          clubName: claim.club_name,
          clubId: claim.club_id,
          verificationState,
          trustLevel: trust.level,
          restrictions: verificationState === 'provisional' ? {
            message: "Your account is provisional. Some features are restricted until fully verified.",
            canPublishEvents: restrictions.can_publish_events,
            canMassMessage: restrictions.can_mass_message,
            canAddLinks: restrictions.can_add_links
          } : null
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
