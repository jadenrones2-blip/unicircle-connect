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
  // News/directory sites that aren't club websites
  'issuu.com', 'ucsdguardian.org', 'asucsd.wixsite.com',
  'wixsite.com', 'zotspot.uci.edu', 'discoriot.org',
  'jhandtherapy.org', 'escholarship.org', 'amazon.com',
  'goodreads.com', 'imdb.com', 'nytimes.com', 'cnn.com',
  'medium.com', 'substack.com', 'change.org', 'gofundme.com',
  'campuslabs.com', 'engage.ucsd.edu', 'getinvolved.ucsd.edu',
  'thegivingblock.com', 'glassdoor.com', 'indeed.com',
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

  let best: typeof candidates[0] | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    let score = 0;
    const urlLower = c.url.toLowerCase();
    const hostname = new URL(c.url).hostname.toLowerCase();
    const path = new URL(c.url).pathname;

    // Strong signal: URL/domain contains club name words
    const urlMatches = nameWords.filter(w => hostname.includes(w));
    score += urlMatches.length * 4;

    // Title contains club name words
    const titleMatches = nameWords.filter(w => c.title.includes(w));
    score += titleMatches.length * 2;

    // Bonus for root/shallow pages (actual homepages)
    if (path === '/' || path === '') score += 3;
    else if (path.split('/').filter(Boolean).length <= 2) score += 1;
    else score -= 3; // Deep pages are likely not the club's own site

    // Bonus for .org domains (common for clubs)
    if (hostname.endsWith('.org')) score += 2;

    // Description mentions UCSD
    if (c.description.includes('ucsd') || c.description.includes('uc san diego')) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  // Require a minimum confidence score to avoid false positives
  if (!best || bestScore < 3) return null;

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
    const cleanup = body.cleanup || false;
    const offset = body.offset || 0;

    // ============ CLEANUP MODE ============
    if (cleanup) {
      const cleanupType = body.cleanupType || 'websites'; // 'websites' or 'names'

      if (cleanupType === 'names') {
        console.log('Running cleanup of malformed club names...');

        // Fetch all clubs
        const { data: allClubs, error: fetchErr } = await externalSupabase
          .from('clubs')
          .select('id, name')
          .not('name', 'is', null)
          .limit(1000);

        if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);

        const toClean: Array<{ id: string; oldName: string; newName: string }> = [];
        for (const club of (allClubs || [])) {
          if (!club.name) continue;
          
          // Clean: remove leading/trailing whitespace, newlines, tabs
          const cleaned = club.name.trim().replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ');
          
          // If changed, mark for update
          if (cleaned !== club.name && cleaned.length > 0) {
            toClean.push({ id: club.id, oldName: club.name, newName: cleaned });
          }
        }

        console.log(`Found ${toClean.length} clubs with malformed names`);

        if (!dryRun) {
          // Build a map of id -> newName for efficient batch processing
          const idToNewName = new Map(toClean.map(c => [c.id, c.newName]));
          let updated = 0;
          
          // Process in smaller batches to stay under timeout
          const batchSize = 20;
          for (let i = 0; i < toClean.length; i += batchSize) {
            const batch = toClean.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toClean.length / batchSize)}`);
            
            // Update each record in parallel within batch
            const updatePromises = batch.map(club =>
              externalSupabase
                .from('clubs')
                .update({ name: club.newName })
                .eq('id', club.id)
                .then(() => { updated++; })
            );
            
            await Promise.all(updatePromises);
          }
          
          console.log(`Updated ${updated} club names`);
        }

        return new Response(JSON.stringify({
          success: true,
          cleaned: toClean.length,
          dryRun,
          sample: toClean.slice(0, 5),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Original website cleanup
      console.log('Running cleanup of bad website URLs...');
      const BAD_DOMAINS = [
        'issuu.com', 'ucsdguardian.org', 'wixsite.com', 'asucsd.wixsite.com',
        'yelp.com', 'wikipedia.org', 'wiktionary.org', 'google.com', 'amazon.com',
        'goodreads.com', 'imdb.com', 'nytimes.com', 'cnn.com', 'medium.com',
        'substack.com', 'change.org', 'gofundme.com', 'glassdoor.com', 'indeed.com',
        'campuslabs.com', 'engage.ucsd.edu', 'getinvolved.ucsd.edu', 'thegivingblock.com',
        'escholarship.org', 'discoriot.org', 'jhandtherapy.org', 'zotspot.uci.edu',
        'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'tiktok.com',
        'linkedin.com', 'youtube.com', 'discord.gg', 'discord.com', 'linktr.ee',
        'reddit.com', 'pinterest.com', 'snapchat.com', 'twitch.tv', 'github.com',
        'studentorg.ucsd.edu', 'ucsd.edu', 'students.ucsd.edu', 'blink.ucsd.edu',
        'tritonlink.ucsd.edu', 'eventbrite.com', 'meetup.com', 'luma.com', 'lu.ma',
        'play.google.com', 'apple.com',
      ];

      // Fetch all clubs with websites
      const { data: clubsWithSites, error: fetchErr } = await externalSupabase
        .from('clubs')
        .select('id, name, website')
        .not('website', 'is', null)
        .limit(1000);

      if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);

      const toClean: Array<{ id: string; name: string; website: string }> = [];
      for (const club of (clubsWithSites || [])) {
        if (!club.website) continue;
        try {
          const hostname = new URL(club.website).hostname.toLowerCase();
          if (BAD_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
            toClean.push(club);
          }
        } catch {
          toClean.push(club); // Malformed URL, clean it too
        }
      }

      console.log(`Found ${toClean.length} clubs with bad website URLs`);

      if (!dryRun) {
        for (const club of toClean) {
          await externalSupabase.from('clubs').update({ website: null }).eq('id', club.id);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        cleaned: toClean.length,
        dryRun,
        clubs: toClean.map(c => ({ name: c.name, badUrl: c.website })),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Discovering club websites (limit: ${limit}, offset: ${offset}, dryRun: ${dryRun})`);

    // Fetch clubs that don't have a website yet
    const { data: clubs, error: fetchError } = await externalSupabase
      .from('clubs')
      .select('id, name')
      .is('website', null)
      .not('name', 'is', null)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (fetchError) throw new Error(`Failed to fetch clubs: ${fetchError.message}`);

    if (!clubs || clubs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No more clubs without websites found',
        processed: 0,
        found: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Processing ${clubs.length} clubs without websites`);

    const results: Array<{ name: string; website: string | null; error?: string }> = [];
    let foundCount = 0;

    for (const club of clubs) {
      // Clean up malformed names (newlines, trailing category suffixes)
      let clubName = (club.name || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      // Remove trailing category words that got appended from scraping
      clubName = clubName.replace(/\s+(Service|Health|Educational|Social|Media|Cultural|Political|Religious|Recreational|Professional|Academic)\s*$/i, '').trim();
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
            query: `"${clubName}" UCSD club organization website`,
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
