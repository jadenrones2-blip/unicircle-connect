import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVENT_KEYWORDS = [
  'event', 'join us', 'come out', 'tonight', 'tomorrow', 'this week',
  'workshop', 'meeting', 'info session', 'social', 'mixer', 'interest meeting',
  'open house', 'seminar', 'speaker', 'panel', 'hackathon', 'competition',
  'application', 'apply', 'recruitment', 'rush', 'deadline', 'register',
  'rsvp', 'tickets', 'free food', 'general meeting', 'gm ',
];

function hasEventKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return EVENT_KEYWORDS.some(k => lower.includes(k));
}

function cleanHandle(raw: string): string {
  return raw
    .replace('@', '')
    .replace('https://www.instagram.com/', '')
    .replace('https://instagram.com/', '')
    .replace(/\/$/, '')
    .trim();
}

interface ApifyPost {
  id?: string;
  url?: string;
  caption?: string;
  timestamp?: string;
  ownerUsername?: string;
  shortCode?: string;
}

interface ExtractedEvent {
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
  description?: string | null;
}

async function extractEventFromCaption(
  caption: string,
  postDate: string,
  lovableKey: string,
): Promise<ExtractedEvent | null> {
  const todayStr = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Extract one upcoming event from this Instagram caption. Today is ${todayStr}. Post date: ${postDate.slice(0, 10)}. Use year ${year} if not specified. If no clear future event is described, return exactly: null. Otherwise return ONLY raw JSON (no markdown): {"title":"string","date":"YYYY-MM-DD","time":"HH:MM or null","location":"string or null","description":"max 150 chars or null"}`,
          },
          {
            role: 'user',
            content: caption.slice(0, 1500),
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    if (!content || content === 'null') return null;

    content = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    const parsed: ExtractedEvent = JSON.parse(content);
    if (!parsed?.title || !parsed?.date) return null;

    // Skip past events
    if (new Date(parsed.date) < new Date()) return null;

    return parsed;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!apifyKey) {
      throw new Error('APIFY_API_KEY not configured. Sign up free at apify.com → Settings → Integrations → API tokens');
    }
    if (!lovableKey) throw new Error('LOVABLE_API_KEY not configured');

    const db = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const offset: number = body.offset ?? 0;
    const batchSize: number = Math.min(body.batchSize ?? 25, 40);

    // Fetch clubs with Instagram handles
    const { data: clubs, error: clubsErr } = await db
      .from('clubs')
      .select('id, name, instagram')
      .not('instagram', 'is', null)
      .not('instagram', 'eq', '')
      .range(offset, offset + batchSize - 1);

    if (clubsErr) throw new Error(`DB error: ${clubsErr.message}`);

    const validClubs = (clubs || []).filter(c => c.instagram?.trim());

    if (validClubs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No clubs with Instagram handles in this batch',
        accountsScraped: 0,
        postsScraped: 0,
        eventsInserted: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const igUrls = validClubs.map(c => {
      const handle = cleanHandle(c.instagram);
      return `https://www.instagram.com/${handle}/`;
    });

    console.log(`Scraping ${igUrls.length} Instagram accounts via Apify (offset=${offset})...`);

    // Call Apify sync endpoint — returns results when done or after timeout
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${apifyKey}&timeout=55&memory=256`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: igUrls,
          resultsLimit: 8,           // 8 recent posts per account
          onlyPostsNewerThan: '45 days',
        }),
      }
    );

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      throw new Error(`Apify ${apifyRes.status}: ${errText.slice(0, 300)}`);
    }

    const posts: ApifyPost[] = await apifyRes.json();
    console.log(`Apify returned ${posts.length} posts`);

    // Filter to posts with event-related language
    const eventPosts = posts.filter(p => p.caption && hasEventKeyword(p.caption));
    console.log(`${eventPosts.length} posts contain event keywords`);

    let inserted = 0;
    let duplicates = 0;
    let notAnEvent = 0;

    for (const post of eventPosts) {
      if (!post.caption) continue;

      // Match post back to a club by Instagram handle
      const matchedClub = validClubs.find(c => {
        const handle = cleanHandle(c.instagram).toLowerCase();
        return post.ownerUsername?.toLowerCase() === handle;
      });

      const event = await extractEventFromCaption(
        post.caption,
        post.timestamp || new Date().toISOString(),
        lovableKey,
      );

      if (!event) {
        notAnEvent++;
        continue;
      }

      try {
        const startTime = event.time
          ? `${event.date}T${event.time}:00`
          : `${event.date}T12:00:00`;

        const externalId = post.id || post.shortCode || post.url || `ig-${Date.now()}`;

        const { error } = await db.from('events').upsert({
          title: event.title,
          caption: event.description || post.caption.slice(0, 500),
          start_time: new Date(startTime).toISOString(),
          location: event.location || null,
          club_id: matchedClub?.id || null,
          club_handle: post.ownerUsername || null,
          source: 'instagram',
          source_url: post.url || null,
          verified: false,
          posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : new Date().toISOString(),
          external_source: 'instagram_apify',
          external_id: externalId,
        }, { onConflict: 'external_id,external_source', ignoreDuplicates: true });

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate')) {
            duplicates++;
          } else {
            console.error('Insert error:', error.message);
          }
        } else {
          inserted++;
          console.log(`+ Event: "${event.title}" from @${post.ownerUsername} on ${event.date}`);
        }
      } catch (e) {
        console.error('Event insert error:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      accountsScraped: validClubs.length,
      postsScraped: posts.length,
      postsWithEventKeywords: eventPosts.length,
      eventsInserted: inserted,
      eventsDuplicate: duplicates,
      notAnEvent,
      nextOffset: offset + batchSize,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Instagram Apify scraper error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
