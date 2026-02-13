import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Domains to exclude when picking the "official website"
const EXCLUDED_DOMAINS = [
  'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
  'tiktok.com', 'linkedin.com', 'youtube.com', 'discord.gg',
  'discord.com', 'linktr.ee', 'snapchat.com', 'twitch.tv',
  'github.com', 'reddit.com', 'pinterest.com',
  'studentorg.ucsd.edu', 'ucsd.edu', 'students.ucsd.edu',
  'blink.ucsd.edu', 'tritonlink.ucsd.edu',
  'yelp.com', 'wikipedia.org', 'wiktionary.org',
  'google.com', 'apple.com', 'play.google.com',
  'eventbrite.com', 'meetup.com', 'luma.com', 'lu.ma',
];

function isExcludedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return EXCLUDED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return true;
  }
}

function pickBestWebsite(results: any[], clubName: string): string | null {
  if (!results || results.length === 0) return null;

  // Filter to non-excluded URLs
  const candidates = results
    .filter((r: any) => r.url && !isExcludedUrl(r.url))
    .map((r: any) => ({
      url: r.url,
      title: (r.title || '').toLowerCase(),
      description: (r.description || '').toLowerCase(),
    }));

  if (candidates.length === 0) return null;

  const nameLower = clubName.toLowerCase();
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);

  // Score each candidate
  let best = candidates[0];
  let bestScore = 0;

  for (const c of candidates) {
    let score = 0;
    // Title contains club name words
    const matchingWords = nameWords.filter(w => c.title.includes(w));
    score += matchingWords.length * 2;
    // URL contains club name words
    const urlLower = c.url.toLowerCase();
    const urlMatches = nameWords.filter(w => urlLower.includes(w));
    score += urlMatches.length * 3;
    // Bonus for .org, .com domains
    if (urlLower.includes('.org')) score += 1;
    // Penalize very long URLs (likely deep pages)
    const path = new URL(c.url).pathname;
    if (path.split('/').length > 3) score -= 2;

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best.url;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
    const EXTERNAL_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
    if (!rawExternalUrl || !EXTERNAL_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('External Supabase credentials not configured');
    }

    const externalUrl = normalizeExternalUrl(rawExternalUrl);
    if (!externalUrl) throw new Error('Invalid EXTERNAL_SUPABASE_URL format');

    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 20;
    const dryRun = body.dryRun || false;

    console.log(`Discovering club websites (limit: ${limit}, dryRun: ${dryRun})`);

    // Fetch clubs that don't have a website yet
    const { data: clubs, error: fetchError } = await externalSupabase
      .from('clubs')
      .select('id, name')
      .is('website', null)
      .not('name', 'is', null)
      .limit(limit);

    if (fetchError) throw new Error(`Failed to fetch clubs: ${fetchError.message}`);

    if (!clubs || clubs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No clubs without websites found',
        processed: 0,
        found: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Processing ${clubs.length} clubs without websites`);

    const results: Array<{ name: string; website: string | null; error?: string }> = [];
    let foundCount = 0;

    for (const club of clubs) {
      const clubName = (club.name || '').replace(/\n/g, ' ').trim();
      if (clubName.length < 3) continue;

      try {
        console.log(`Searching for: ${clubName}`);

        // Use Firecrawl search to find the club's website
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `"${clubName}" UCSD official website`,
            limit: 5,
          }),
        });

        if (!searchResponse.ok) {
          const errText = await searchResponse.text();
          console.error(`Search failed for ${clubName}: ${searchResponse.status} ${errText}`);
          results.push({ name: clubName, website: null, error: `Search failed: ${searchResponse.status}` });
          await delay(500);
          continue;
        }

        const searchData = await searchResponse.json();
        const searchResults = searchData.data || searchData.results || [];

        const website = pickBestWebsite(searchResults, clubName);

        if (website) {
          console.log(`Found website for ${clubName}: ${website}`);
          foundCount++;

          if (!dryRun) {
            const { error: updateError } = await externalSupabase
              .from('clubs')
              .update({ website })
              .eq('id', club.id);

            if (updateError) {
              console.error(`Update error for ${clubName}: ${updateError.message}`);
              results.push({ name: clubName, website, error: `Update failed: ${updateError.message}` });
            } else {
              results.push({ name: clubName, website });
            }
          } else {
            results.push({ name: clubName, website });
          }
        } else {
          console.log(`No website found for ${clubName}`);
          results.push({ name: clubName, website: null });
        }

        // Rate limit: Firecrawl search has limits
        await delay(600);
      } catch (e) {
        console.error(`Error for ${clubName}:`, e);
        results.push({ name: clubName, website: null, error: e instanceof Error ? e.message : 'Unknown' });
      }
    }

    console.log(`Done: ${clubs.length} processed, ${foundCount} websites found`);

    return new Response(JSON.stringify({
      success: true,
      processed: clubs.length,
      found: foundCount,
      updated: dryRun ? 0 : foundCount,
      dryRun,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Discover error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
