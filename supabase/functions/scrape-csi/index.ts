import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CSI category IDs — only the ones worth targeting for outreach
const TARGET_CATEGORIES: Record<string, number> = {
  'Pre-Professional': 19,
  'Academic': 8,
  'Cultural': 9,
  'IFC (Fraternities)': 14,
  'CPA (Sororities)': 16,
  'MGC Fraternity': 12,
  'MGC Sorority': 25,
  'NPHC': 30,
};

interface CSIClubContact {
  csi_id: string;
  club_name: string;
  category: string;
  contact_email: string | null;
  officer_name: string | null;
  officer_title: string | null;
  instagram: string | null;
  website: string | null;
  description: string | null;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const internalUrl = Deno.env.get('SUPABASE_URL')!;
    const internalServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(internalUrl, internalServiceKey);

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');

    // Allow caller to pass custom category IDs, otherwise use defaults
    let body: { categories?: number[] } = {};
    try { body = await req.json(); } catch { /* no body is fine */ }
    const categoryIds: number[] = body.categories || Object.values(TARGET_CATEGORIES);
    const categoryNames = Object.fromEntries(
      Object.entries(TARGET_CATEGORIES).map(([name, id]) => [id, name])
    );

    // ============ STEP 1: GET ALL CLUB IDs FROM EACH CATEGORY PAGE ============
    console.log(`Scraping ${categoryIds.length} category pages...`);

    const allClubIds: { id: string; name: string; category: string }[] = [];
    let creditsUsed = 0;

    for (const catId of categoryIds) {
      const catName = categoryNames[catId] || `Category ${catId}`;
      console.log(`Fetching category: ${catName} (ID: ${catId})`);

      try {
        const indexResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: `https://studentorg.ucsd.edu/Home/Index/${catId}`,
            formats: ['extract'],
            extract: {
              prompt: `Extract every student organization listed on this page.
              For each one return:
              - name: the club name exactly as shown
              - id: the numeric ID from its detail page URL pattern /Home/Details/[ID]
              Return as a JSON array of objects with fields: name, id.
              Only include clubs that have a numeric ID in their URL. Do not include category headers or non-club items.`,
            },
          }),
        });

        creditsUsed++;
        const indexData = await indexResponse.json();
        const clubs: { name: string; id: string }[] = indexData?.data?.extract || [];

        console.log(`  Found ${clubs.length} clubs in ${catName}`);
        for (const club of clubs) {
          if (club.id && club.name) {
            allClubIds.push({ id: String(club.id), name: club.name, category: catName });
          }
        }
      } catch (err) {
        console.error(`Failed to scrape category ${catName}:`, err);
      }

      // Small delay between category pages
      await new Promise((r) => setTimeout(r, 500));
    }

    // Deduplicate by club ID
    const seen = new Set<string>();
    const uniqueClubs = allClubIds.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    console.log(`Total unique clubs to scrape: ${uniqueClubs.length}`);

    // ============ STEP 2: SCRAPE EACH CLUB DETAIL PAGE ============
    const contacts: CSIClubContact[] = [];
    const errors: string[] = [];

    // Process in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < uniqueClubs.length; i += BATCH_SIZE) {
      const batch = uniqueClubs.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (club) => {
          try {
            const detailResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: `https://studentorg.ucsd.edu/Home/Details/${club.id}`,
                formats: ['extract'],
                extract: {
                  prompt: `Extract contact information from this UCSD student organization page.
                  Return a JSON object with these exact fields:
                  - club_name: full name of the organization
                  - contact_email: any email address listed (look for @ symbol, contact info sections, officer emails)
                  - officer_name: name of the president, chair, director, or primary contact person
                  - officer_title: their title (President, Chair, Director, etc.)
                  - instagram: Instagram handle or URL if listed
                  - website: external website URL if listed (not the studentorg.ucsd.edu URL)
                  - description: the club's purpose or mission statement (1-3 sentences)

                  If a field is not present on the page, return null for that field.
                  Do not guess or invent information that is not explicitly on the page.`,
                  schema: {
                    type: 'object',
                    properties: {
                      club_name: { type: 'string' },
                      contact_email: { type: 'string' },
                      officer_name: { type: 'string' },
                      officer_title: { type: 'string' },
                      instagram: { type: 'string' },
                      website: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
              }),
            });

            creditsUsed++;
            const detailData = await detailResponse.json();
            const extracted = detailData?.data?.extract;

            if (extracted) {
              contacts.push({
                csi_id: club.id,
                club_name: extracted.club_name || club.name,
                category: club.category,
                contact_email: extracted.contact_email || null,
                officer_name: extracted.officer_name || null,
                officer_title: extracted.officer_title || null,
                instagram: extracted.instagram || null,
                website: extracted.website || null,
                description: extracted.description || null,
              });
            }
          } catch (err) {
            errors.push(`Failed: ${club.name} (ID: ${club.id})`);
          }
        })
      );

      console.log(`Processed ${Math.min(i + BATCH_SIZE, uniqueClubs.length)}/${uniqueClubs.length} clubs`);

      // Delay between batches
      if (i + BATCH_SIZE < uniqueClubs.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // ============ STEP 3: SAVE TO INTERNAL SUPABASE ============
    if (contacts.length > 0) {
      const { error: upsertError } = await adminSupabase
        .from('csi_club_contacts')
        .upsert(contacts, { onConflict: 'csi_id' });

      if (upsertError) {
        console.error('DB upsert error:', upsertError);
      }
    }

    const withEmail = contacts.filter((c) => c.contact_email).length;
    const withInstagram = contacts.filter((c) => c.instagram).length;

    console.log(`Done. ${contacts.length} clubs scraped, ${withEmail} with email, ${creditsUsed} credits used.`);

    return new Response(
      JSON.stringify({
        success: true,
        clubsScraped: contacts.length,
        withEmail,
        withInstagram,
        creditsUsed,
        categoryBreakdown: contacts.reduce(
          (acc, c) => {
            acc[c.category] = (acc[c.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape CSI error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
