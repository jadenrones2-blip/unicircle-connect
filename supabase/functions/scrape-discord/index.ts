import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: { username: string; bot?: boolean };
  embeds?: Array<{
    title?: string;
    description?: string;
    fields?: Array<{ name: string; value: string }>;
  }>;
}

interface ExtractedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
  club_name: string;
}

// Normalize external URL
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const rawExternalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
    const EXTERNAL_SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');

    if (!DISCORD_BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN not configured');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!rawExternalUrl || !EXTERNAL_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('External Supabase credentials not configured');
    }

    const externalUrl = normalizeExternalUrl(rawExternalUrl);
    if (!externalUrl) throw new Error('Invalid EXTERNAL_SUPABASE_URL format');

    const externalSupabase = createClient(externalUrl, EXTERNAL_SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body for channel IDs or guild IDs
    let channelIds: string[] = [];
    let guildId: string | null = null;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        channelIds = body.channelIds || [];
        guildId = body.guildId || null;
      } catch {}
    }

    // If a guild ID is provided, fetch all text channels from the guild
    if (guildId && channelIds.length === 0) {
      console.log(`Fetching channels for guild ${guildId}`);
      const guildResponse = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/channels`,
        {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        }
      );

      if (!guildResponse.ok) {
        const errText = await guildResponse.text();
        console.error('Failed to fetch guild channels:', errText);
        throw new Error(`Failed to fetch guild channels: ${guildResponse.status}`);
      }

      const channels = await guildResponse.json();
      // Filter for text channels (type 0) with "event" or "announcement" in name
      const eventChannels = channels.filter((ch: any) =>
        ch.type === 0 &&
        (ch.name.includes('event') || ch.name.includes('announce') || ch.name.includes('general'))
      );
      channelIds = eventChannels.map((ch: any) => ch.id);
      console.log(`Found ${channelIds.length} relevant channels: ${eventChannels.map((ch: any) => ch.name).join(', ')}`);
    }

    if (channelIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No channel IDs or guild ID provided. Pass { channelIds: ["..."] } or { guildId: "..." }',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = {
      channelsScraped: 0,
      eventsExtracted: 0,
      errors: [] as string[],
      channelBreakdown: {} as Record<string, number>,
    };

    for (const channelId of channelIds.slice(0, 10)) {
      try {
        console.log(`Fetching messages from channel ${channelId}`);

        // Fetch recent messages (last 100)
        const messagesResponse = await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages?limit=100`,
          {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          }
        );

        if (!messagesResponse.ok) {
          console.error(`Failed to fetch channel ${channelId}: ${messagesResponse.status}`);
          result.errors.push(`Channel ${channelId}: ${messagesResponse.status}`);
          continue;
        }

        const messages: DiscordMessage[] = await messagesResponse.json();

        // Get channel info for naming
        const channelInfoResp = await fetch(
          `https://discord.com/api/v10/channels/${channelId}`,
          { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
        );
        const channelInfo = channelInfoResp.ok ? await channelInfoResp.json() : { name: channelId };
        const channelName = channelInfo.name || channelId;

        // Get guild name for the club name
        let clubName = channelName;
        if (channelInfo.guild_id) {
          const guildResp = await fetch(
            `https://discord.com/api/v10/guilds/${channelInfo.guild_id}`,
            { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
          );
          if (guildResp.ok) {
            const guild = await guildResp.json();
            clubName = guild.name || channelName;
          }
        }

        // Filter messages from the last 14 days
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const recentMessages = messages.filter(
          (m) => new Date(m.timestamp) >= twoWeeksAgo
        );

        if (recentMessages.length === 0) {
          console.log(`No recent messages in ${channelName}`);
          continue;
        }

        // Combine message content + embeds for AI extraction
        const combined = recentMessages
          .map((m) => {
            let text = `[${m.author.username} at ${m.timestamp}]: ${m.content}`;
            if (m.embeds?.length) {
              for (const embed of m.embeds) {
                if (embed.title) text += `\nEmbed: ${embed.title}`;
                if (embed.description) text += `\n${embed.description}`;
                if (embed.fields) {
                  for (const f of embed.fields) {
                    text += `\n${f.name}: ${f.value}`;
                  }
                }
              }
            }
            return text;
          })
          .join('\n\n');

        console.log(`Processing ${recentMessages.length} messages from #${channelName} (${combined.length} chars)`);

        // Extract events with AI
        const events = await extractEventsFromDiscord(combined, clubName, LOVABLE_API_KEY);

        console.log(`Extracted ${events.length} events from #${channelName}`);

        // Insert events
        for (const event of events) {
          try {
            const eventRecord = {
              title: event.title,
              start_time: event.start_time,
              end_time: event.end_time || null,
              location: event.location || 'TBD',
              club_id: null,
              club_handle: null,
              source: 'discord',
              source_url: `https://discord.com/channels/${channelInfo.guild_id || '@me'}/${channelId}`,
              verified: false,
              caption: event.description,
              posted_at: new Date().toISOString(),
            };

            const { error: insertError } = await externalSupabase
              .from('events')
              .insert(eventRecord);

            if (insertError) {
              console.error('Error inserting event:', insertError);
              result.errors.push(`Failed to insert: ${event.title}`);
            } else {
              result.eventsExtracted++;
              result.channelBreakdown[clubName] = (result.channelBreakdown[clubName] || 0) + 1;
            }
          } catch (e) {
            result.errors.push(`Error: ${event.title}`);
          }
        }

        result.channelsScraped++;
      } catch (err) {
        console.error(`Error scraping channel ${channelId}:`, err);
        result.errors.push(`Channel ${channelId} failed`);
      }
    }

    console.log('Discord scrape complete:', result);

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Discord scrape error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractEventsFromDiscord(
  content: string,
  clubName: string,
  apiKey: string
): Promise<ExtractedEvent[]> {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You extract event information from Discord messages. Today is ${today}.

For each event, extract:
- title: Event name
- description: Brief description
- start_time: ISO 8601 datetime (Pacific timezone / UTC-8)
- end_time: ISO 8601 datetime (optional)
- location: Location if mentioned
- club_name: "${clubName}"

Rules:
- Look for meetings, socials, workshops, GBMs, game nights, study sessions, etc.
- Discord messages often have casual language — "pull up tonight at 7", "meeting tmr 6pm" are events
- Calculate dates from "tonight", "tomorrow", "this friday" relative to today (${today})
- Default time 6:00 PM Pacific if not specified
- Be inclusive — extract anything that looks like a gathering`;

  const userPrompt = `Extract events from these Discord messages from "${clubName}":

${content.slice(0, 8000)}

Return JSON array. Empty array [] if none found.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_events',
            description: 'Extract events from Discord messages',
            parameters: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      start_time: { type: 'string' },
                      end_time: { type: 'string' },
                      location: { type: 'string' },
                      club_name: { type: 'string' },
                    },
                    required: ['title', 'description', 'start_time', 'club_name'],
                  },
                },
              },
              required: ['events'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_events' } },
      }),
    });

    if (!response.ok) {
      console.error('AI extraction error:', await response.text());
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.events || [];
    }

    const textContent = data.choices?.[0]?.message?.content;
    if (textContent) {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('AI extraction failed:', error);
    return [];
  }
}
