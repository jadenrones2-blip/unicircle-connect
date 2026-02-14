import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Extract email from page content
function extractEmail(content: string): string | null {
  const orgEmailMatch = content.match(/Organization Email\s*\[?\*?\*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (orgEmailMatch) return orgEmailMatch[1].toLowerCase();

  const mailtoMatch = content.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (mailtoMatch) return mailtoMatch[1].toLowerCase();

  const emailPattern = /([a-zA-Z0-9._%+-]+@(?!ucsd\.edu)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = content.match(emailPattern);
  if (matches && matches.length > 0) return matches[0].toLowerCase();

  const anyEmailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (anyEmailMatch) return anyEmailMatch[1].toLowerCase();

  return null;
}




// Extract Instagram handle from page content
function extractInstagram(content: string): string | null {
  const falsePositives = ['ucsd', 'username', 'your', 'p', 'reel', 'explore', 'stories', 'accounts', 'about', 'help', 'privacy', 'terms'];

  // The studentorg.ucsd.edu pages use "Social Media<handle>Fund Manager" pattern
  const socialMediaMatch = content.match(/Social\s*Media\s*([a-zA-Z0-9._]{3,30})\s*(?:Fund|$)/i);
  if (socialMediaMatch?.[1]) {
    const handle = socialMediaMatch[1].toLowerCase();
    if (!falsePositives.includes(handle)) return handle;
  }

  // Also try full Instagram URL patterns
  const igUrlMatch = content.match(/instagram\.com\/([a-zA-Z0-9._]{3,30})\/?/i);
  if (igUrlMatch?.[1]) {
    const handle = igUrlMatch[1].replace(/[.,;!)\]]+$/, '').toLowerCase();
    if (!falsePositives.includes(handle) && handle.length >= 3) return handle;
  }

  return null;
}

// Extract website from page - look for non-social, non-university links
function extractWebsiteFromContent(content: string): string | null {
  const excludedDomains = [
    'instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com',
    'linkedin.com', 'youtube.com', 'discord.gg', 'discord.com',
    'studentorg.ucsd.edu', 'ucsd.edu', 'linktr.ee',
    'snapchat.com', 'twitch.tv', 'github.com', 'x.com',
    'students.ucsd.edu', 'blink.ucsd.edu', 'mailto:',
  ];
  const isExcluded = (url: string) => excludedDomains.some(d => url.toLowerCase().includes(d));

  // Look for explicitly labeled website links
  const websitePatterns = [
    /(?:website|web\s*site|homepage|official\s*site|org\s*website)\s*[:：]?\s*\[?\s*(https?:\/\/[^\s\)\]<>"]+)/i,
    /\[(?:website|web\s*site|visit|homepage|official)\]\((https?:\/\/[^\s\)]+)\)/i,
  ];

  for (const pattern of websitePatterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const url = match[1].replace(/[.,;!)\]]+$/, '');
      if (!isExcluded(url) && url.length > 12) return url;
    }
  }

  return null;
}
const normalizeExternalUrl = (value: string): string | null => {
  let v = value.trim();
  if (!v) return null;
  v = v.replace(/\/(auth|rest|functions)\/v1.*$/i, "");
  v = v.replace(/\/+$/, "");
  if (!v.startsWith("http://") && !v.startsWith("https://")) {
    if (v.includes(".") || v.includes("supabase.co")) {
      v = `https://${v}`;
    } else {
      v = `https://${v}.supabase.co`;
    }
  }
  try { new URL(v); return v; } catch { return null; }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTH + ADMIN CHECK ============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const internalUrl = Deno.env.get("SUPABASE_URL")!;
    const internalAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const internalServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authSupabase = createClient(internalUrl, internalAnonKey, {
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

    const adminCheckSupabase = createClient(internalUrl, internalServiceKey);
    const { data: isAdmin } = await adminCheckSupabase.rpc('has_role', {
      _user_id: claimsData.claims.sub,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawExternalUrl = (Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "").trim();
    const externalKey = (Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    const externalUrl = normalizeExternalUrl(rawExternalUrl);

    if (!externalUrl || !externalKey) {
      throw new Error("External database credentials not configured");
    }
    if (!firecrawlKey) {
      throw new Error("Firecrawl API key not configured");
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 50;
    const dryRun = body.dryRun || false;
    // mode: "all" scrapes email+website+instagram, "email" only email (legacy)
    const mode = body.mode || "all";

    console.log(`Starting scrape (limit: ${limit}, dryRun: ${dryRun}, mode: ${mode})`);

    // Fetch clubs that have details_url and are missing at least one field
    let query = externalSupabase
      .from("clubs")
      .select("id, name, details_url, email, website, instagram")
      .not("details_url", "is", null)
      .limit(limit);

    if (mode === "email") {
      query = query.is("email", null);
    } else {
      // Fetch clubs missing any of the three fields
      query = query.or("email.is.null,website.is.null,instagram.is.null");
    }

    const { data: clubs, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch clubs: ${fetchError.message}`);
    }

    if (!clubs || clubs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No clubs needing data found",
          processed: 0,
          updated: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${clubs.length} clubs to process`);

    interface Result {
      id: string;
      name: string;
      email: string | null;
      website: string | null;
      instagram: string | null;
      error?: string;
    }

    const results: Result[] = [];
    let updatedCount = 0;

    for (const club of clubs) {
      try {
        const clubName = (club.name || '').replace(/\n/g, ' ').trim();
        console.log(`Scraping: ${clubName} - ${club.details_url}`);

        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: club.details_url,
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 2000,
          }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error(`Firecrawl error for ${clubName}: ${scrapeResponse.status} - ${errorText}`);
          results.push({ id: club.id, name: clubName, email: null, website: null, instagram: null, error: `Scrape failed: ${scrapeResponse.status}` });
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

        if (!markdown) {
          console.log(`No content found for ${clubName}`);
          results.push({ id: club.id, name: clubName, email: null, website: null, instagram: null, error: "No content" });
          continue;
        }

        // Extract all fields
        const email = !club.email ? extractEmail(markdown) : null;
        const website = !club.website ? extractWebsiteFromContent(markdown) : null;
        const instagram = !club.instagram ? extractInstagram(markdown) : null;

        const updatePayload: Record<string, string> = {};
        if (email) updatePayload.email = email;
        if (website) updatePayload.website = website;
        if (instagram) updatePayload.instagram = instagram;

        if (Object.keys(updatePayload).length > 0) {
          console.log(`Found for ${clubName}: email=${email || 'n/a'}, website=${website || 'n/a'}, ig=${instagram || 'n/a'}`);

          if (!dryRun) {
            const { error: updateError } = await externalSupabase
              .from("clubs")
              .update(updatePayload)
              .eq("id", club.id);

            if (updateError) {
              console.error(`Update error for ${clubName}: ${updateError.message}`);
              results.push({ id: club.id, name: clubName, email, website, instagram, error: `Update failed: ${updateError.message}` });
            } else {
              updatedCount++;
              results.push({ id: club.id, name: clubName, email, website, instagram });
            }
          } else {
            results.push({ id: club.id, name: clubName, email, website, instagram });
          }
        } else {
          console.log(`No new data found for ${clubName}`);
          results.push({ id: club.id, name: clubName, email: null, website: null, instagram: null });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (clubError) {
        console.error(`Error processing ${club.name}:`, clubError);
        results.push({
          id: club.id,
          name: (club.name || '').trim(),
          email: null,
          website: null,
          instagram: null,
          error: clubError instanceof Error ? clubError.message : "Unknown error",
        });
      }
    }

    const foundEmails = results.filter((r) => r.email).length;
    const foundWebsites = results.filter((r) => r.website).length;
    const foundInstagrams = results.filter((r) => r.instagram).length;

    console.log(`Completed: ${results.length} processed, ${foundEmails} emails, ${foundWebsites} websites, ${foundInstagrams} instagrams found, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        found: { emails: foundEmails, websites: foundWebsites, instagrams: foundInstagrams },
        updated: dryRun ? 0 : updatedCount,
        dryRun,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
