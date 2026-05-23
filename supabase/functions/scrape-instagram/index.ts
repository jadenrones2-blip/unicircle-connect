import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Club {
  id: string;
  name: string;
  instagram: string;
}

interface ScrapedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
}

interface ScrapeResult {
  clubsScraped: number;
  eventsExtracted: number;
  errors: string[];
  skippedDuplicates: number;
  clubBreakdown?: Record<string, number>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth + admin check ───────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const internalUrl = Deno.env.get('SUPABASE_URL')!;
    const internalAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const internalServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authSupabase = createClient(internalUrl, internalAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminSupabase = createClient(internalUrl, internalServiceKey);
    const { data: isAdmin } = await adminSupabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Env vars ─────────────────────────────────────────────────────────────
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
    const EXTERNAL_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    if (!rawExternalUrl || !EXTERNAL_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('External Supabase credentials not configured');
    }

    const externalUrl = normalizeExternalUrl(rawExternalUrl);
    if (!externalUrl) throw new Error('Invalid EXTERNAL_SUPABASE_URL format');

    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    // ── Fetch clubs with Instagram handles ───────────────────────────────────
    const { data: clubs, error: clubsError } = await externalSupabase
      .from('clubs')
      .select('id, name, instagram')
      .not('instagram', 'is', null)
      .limit(500);

    if (clubsError) throw new Error('Failed to fetch clubs from external database');

    const clubsWithInstagram = (clubs || [])
      .map((c: any) => ({
        id: c.id,
        name: c.name?.replace(/\n/g, ' ').trim() || '',
        instagram: (c.instagram || '').trim(),
      }))
      .filter((c: Club) => c.name.length > 2 && c.instagram.length > 0);

    console.log(`Found ${clubsWithInstagram.length} clubs with Instagram handles`);

    const result: ScrapeResult = {
      clubsScraped: 0,
      eventsExtracted: 0,
      skippedDuplicates: 0,
      errors: [],
    };
    const clubBreakdown: Record<string, number> = {};

    // ── Process each club ────────────────────────────────────────────────────
    for (const club of clubsWithInstagram) {
      try {
        // Normalize handle
        let handle = club.instagram.trim().replace('@', '');
        if (handle.startsWith('http')) {
          const match = handle.match(/instagram\.com\/([^/?]+)/);
          handle = match ? match[1] : handle;
        }
        handle = handle.replace(/\/$/, '');

        console.log(`Scraping @${handle} for ${club.name}`);

        // Try viewer proxies — Instagram blocks direct crawls
        const sources = [
          `https://www.picnob.com/profile/${handle}/`,
          `https://imginn.com/${handle}/`,
          `https://instagram.com/${handle}/`,
        ];

        let content = '';
        for (const sourceUrl of sources) {
          try {
            const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: sourceUrl,
                formats: ['markdown'],
                onlyMainContent: true,
                waitFor: 5000,
              }),
            });

            if (scrapeResponse.ok) {
              const scrapeData = await scrapeResponse.json();
              const scraped = scrapeData.data?.markdown || scrapeData.markdown || '';
              if (scraped.length > content.length) {
                content = scraped;
                console.log(`Got ${scraped.length} chars from ${sourceUrl}`);
              }
            }
          } catch {
            console.log(`Source ${sourceUrl} failed, trying next`);
          }
          if (content.length > 200) break;
        }

        if (!content || content.length < 50) {
          console.log(`No meaningful content for ${club.name}`);
          continue;
        }

        // Extract events via Claude
        const events = await extractEventsWithClaude(content, club, ANTHROPIC_API_KEY);
        console.log(`Extracted ${events.length} events from ${club.name}`);

        // Insert with deduplication
        for (const event of events) {
          try {
            // Check if this event already exists (same club + title + same day)
            const startDay = event.start_time.split('T')[0];
            const { data: existing } = await externalSupabase
              .from('events')
              .select('id')
              .eq('club_id', club.id)
              .ilike('title', event.title)
              .gte('start_time', `${startDay}T00:00:00`)
              .lte('start_time', `${startDay}T23:59:59`)
              .maybeSingle();

            if (existing) {
              result.skippedDuplicates++;
              continue;
            }

            const { error: insertError } = await externalSupabase.from('events').insert({
              title: event.title,
              start_time: event.start_time,
              end_time: event.end_time || null,
              location: event.location || null,
              club_id: club.id,
              club_handle: handle,
              source: 'instagram',
              source_url: `https://instagram.com/${handle}/`,
              verified: false,
              caption: event.description,
              posted_at: new Date().toISOString(),
            });

            if (insertError) {
              result.errors.push(`Insert failed: ${event.title}`);
            } else {
              result.eventsExtracted++;
              clubBreakdown[club.name] = (clubBreakdown[club.name] || 0) + 1;
            }
          } catch (e) {
            result.errors.push(`Error on: ${event.title}`);
          }
        }

        result.clubsScraped++;
      } catch (error) {
        console.error(`Error scraping ${club.name}:`, error);
        result.errors.push(`Failed: ${club.name}`);
      }
    }

    result.clubBreakdown = clubBreakdown;
    console.log('Scrape complete:', result);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Claude event extractor ───────────────────────────────────────────────────

async function extractEventsWithClaude(
  content: string,
  club: Club,
  apiKey: string
): Promise<ScrapedEvent[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayFull = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const systemPrompt = `You are a senior data engineer at UniCircle, a UCSD club discovery platform. Your job is to extract upcoming events from raw Instagram/social-media content scraped from UCSD student club profiles.

## Context
- Today is ${todayFull} (${todayStr})
- All events are at UC San Diego unless clearly stated otherwise
- Pacific Time (America/Los_Angeles) is the default timezone — UTC-7 in summer, UTC-8 in winter
- Current season: check the date above to determine if daylight saving is active

## Your task
Extract every upcoming event mentioned in the content. An "event" is anything a student might want to attend: GBMs, info sessions, socials, workshops, networking nights, mixers, hackathons, study sessions, fundraisers, performances, showcases, game nights, food events, volunteering, panels, etc.

## Date parsing rules (critical)
- If only a day-of-week is mentioned ("this Friday", "Saturday"), compute the actual date relative to today (${todayStr})
- "This [weekday]" = the coming occurrence of that weekday (if today is Tuesday and they say "this Friday", that's 3 days from now)
- "Next [weekday]" = the occurrence after this week's
- "Tomorrow" / "tmrw" = one day after today
- "Tonight" / "tonite" = today
- Month + day without year → use current year (${today.getFullYear()}); if that date has passed, use next year
- Relative phrases like "in 2 weeks", "coming up soon", "next month" → estimate as best you can
- If only a date is given with no time, default to 18:00:00 Pacific (6 PM)
- Always output ISO 8601: YYYY-MM-DDTHH:MM:SS (no timezone suffix — assume Pacific)

## Location parsing
Common UCSD shorthand to expand:
- "PC" → "Price Center, UC San Diego"
- "Geisel" → "Geisel Library, UC San Diego"
- "Warren" → "Warren College, UC San Diego"
- "Sixth" → "Sixth College, UC San Diego"
- "ERC" → "Eleanor Roosevelt College, UC San Diego"
- "Muir" → "Muir College, UC San Diego"
- "Marshall" → "Marshall College, UC San Diego"
- "CSE" → "Computer Science and Engineering Building, UC San Diego"
- "Jacobs" → "Jacobs School of Engineering, UC San Diego"
- "CLICS" → "CLICS Makerspace, UC San Diego"
- If location is vague ("on campus", "our usual spot"), set to null — don't guess

## Signal words for events
Phrases like: "join us", "come through", "pull up", "be there", "RSVP", "link in bio", "spots limited", "free food", "free pizza", "free merch", "all are welcome", "open to all", "bring a friend", "we'd love to see you" all indicate an event invitation.

## Output quality rules
1. Skip recruitment posts, shoutouts, memes, throwbacks, sponsor posts, and general announcements that have no specific event date
2. Skip events that have already passed (before ${todayStr})
3. If two posts mention the same event with the same title and date, output it only once
4. A title must be specific and human-readable — no JSON fragments, no error strings, no raw hashtags as a title
5. Description should be the most informative 1–2 sentences about what the event is — synthesize from the caption, not copy-paste noise
6. It is better to return fewer high-confidence events than many uncertain ones

## Club context
Club name: "${club.name}"
This is a UCSD student organization. Events are for UCSD students.`;

  const userPrompt = `Extract all upcoming events from this Instagram page content for ${club.name}. Return only events on or after ${todayStr}.

---BEGIN CONTENT---
${content.slice(0, 10000)}
---END CONTENT---`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        tools: [
          {
            name: 'extract_events',
            description:
              'Return a structured list of upcoming events found in the content. Call this exactly once.',
            input_schema: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  description: 'List of upcoming events. Empty array if none found.',
                  items: {
                    type: 'object',
                    properties: {
                      title: {
                        type: 'string',
                        description:
                          'Clear, concise event title (e.g. "Fall GBM", "Networking Night with Google", "End-of-Quarter Social")',
                      },
                      description: {
                        type: 'string',
                        description:
                          'What the event is about in 1-2 sentences. Include who it is for and any notable details (free food, guest speaker, etc.)',
                      },
                      start_time: {
                        type: 'string',
                        description:
                          'ISO 8601 datetime in Pacific time, no timezone suffix. Format: YYYY-MM-DDTHH:MM:SS',
                      },
                      end_time: {
                        type: 'string',
                        description:
                          'ISO 8601 end datetime if mentioned. Omit if unknown.',
                      },
                      location: {
                        type: 'string',
                        description:
                          'Full location string. Expand UCSD shorthand. Null if not mentioned.',
                      },
                    },
                    required: ['title', 'description', 'start_time'],
                  },
                },
              },
              required: ['events'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'extract_events' },
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return [];
    }

    const data = await response.json();
    const toolUse = data.content?.find((b: any) => b.type === 'tool_use');
    return (toolUse?.input?.events as ScrapedEvent[]) ?? [];
  } catch (error) {
    console.error('Claude extraction failed:', error);
    return [];
  }
}

// ── URL normalizer ───────────────────────────────────────────────────────────

const normalizeExternalUrl = (value: string): string | null => {
  let v = value.trim();
  if (!v) return null;
  v = v.replace(/\/(auth|rest|functions)\/v1.*$/i, '');
  v = v.replace(/\/+$/, '');
  if (!v.startsWith('http://') && !v.startsWith('https://')) {
    v = `https://${v.includes('.') ? '' : ''}${v}${v.includes('.') ? '' : '.supabase.co'}`;
  }
  try {
    new URL(v);
    return v;
  } catch {
    return null;
  }
};
