import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Extract email from page content
function extractEmail(content: string): string | null {
  // Look for "Organization Email" pattern first (most reliable)
  const orgEmailMatch = content.match(/Organization Email\s*\[?\*?\*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (orgEmailMatch) {
    return orgEmailMatch[1].toLowerCase();
  }

  // Look for mailto links
  const mailtoMatch = content.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (mailtoMatch) {
    return mailtoMatch[1].toLowerCase();
  }

  // Generic email pattern - find the first non-ucsd.edu email (likely the org email)
  const emailPattern = /([a-zA-Z0-9._%+-]+@(?!ucsd\.edu)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = content.match(emailPattern);
  if (matches && matches.length > 0) {
    return matches[0].toLowerCase();
  }

  // If no external email, look for any email
  const anyEmailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (anyEmailMatch) {
    return anyEmailMatch[1].toLowerCase();
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawExternalUrl = (Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "").trim();
    const externalKey = (Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    // Normalize the external URL
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
      try {
        new URL(v);
        return v;
      } catch {
        return null;
      }
    };

    const externalUrl = normalizeExternalUrl(rawExternalUrl);

    if (!externalUrl || !externalKey) {
      throw new Error("External database credentials not configured");
    }

    if (!firecrawlKey) {
      throw new Error("Firecrawl API key not configured");
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Get request body
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 50; // Process in batches
    const dryRun = body.dryRun || false;

    console.log(`Starting email scrape (limit: ${limit}, dryRun: ${dryRun})`);

    // Fetch clubs without emails that have details_url
    const { data: clubs, error: fetchError } = await externalSupabase
      .from("clubs")
      .select("id, name, details_url, email")
      .is("email", null)
      .not("details_url", "is", null)
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch clubs: ${fetchError.message}`);
    }

    if (!clubs || clubs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No clubs without emails found",
          processed: 0,
          updated: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${clubs.length} clubs to process`);

    const results: { id: string; name: string; email: string | null; error?: string }[] = [];
    let updatedCount = 0;

    for (const club of clubs) {
      try {
        console.log(`Scraping: ${club.name} - ${club.details_url}`);

        // Scrape the page using Firecrawl
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
          console.error(`Firecrawl error for ${club.name}: ${scrapeResponse.status} - ${errorText}`);
          results.push({ id: club.id, name: club.name, email: null, error: `Scrape failed: ${scrapeResponse.status}` });
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

        if (!markdown) {
          console.log(`No content found for ${club.name}`);
          results.push({ id: club.id, name: club.name, email: null, error: "No content" });
          continue;
        }

        // Extract email from content
        const email = extractEmail(markdown);

        if (email) {
          console.log(`Found email for ${club.name}: ${email}`);

          if (!dryRun) {
            // Update the club record
            const { error: updateError } = await externalSupabase
              .from("clubs")
              .update({ email })
              .eq("id", club.id);

            if (updateError) {
              console.error(`Update error for ${club.name}: ${updateError.message}`);
              results.push({ id: club.id, name: club.name, email, error: `Update failed: ${updateError.message}` });
            } else {
              updatedCount++;
              results.push({ id: club.id, name: club.name, email });
            }
          } else {
            results.push({ id: club.id, name: club.name, email });
          }
        } else {
          console.log(`No email found for ${club.name}`);
          results.push({ id: club.id, name: club.name, email: null });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (clubError) {
        console.error(`Error processing ${club.name}:`, clubError);
        results.push({ 
          id: club.id, 
          name: club.name, 
          email: null, 
          error: clubError instanceof Error ? clubError.message : "Unknown error" 
        });
      }
    }

    const foundEmails = results.filter((r) => r.email).length;
    console.log(`Completed: ${results.length} processed, ${foundEmails} emails found, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        found: foundEmails,
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
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
