import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Club {
  id: string;
  name: string;
  category: string;
  one_liner: string | null;
  who_should_join: string | null;
  what_they_do: string | null;
  vibe: string | null;
  tags: string[] | null;
}

interface StudentProfile {
  major: string | null;
  careerGoals: string[];
  interests: string[];
  resumeKeywords: string[];
}

async function scoreClubs(student: StudentProfile, clubs: Club[]): Promise<{ id: string; score: number; reason: string }[]> {
  const clubList = clubs.map((c, i) => {
    const desc = [
      c.one_liner,
      c.who_should_join ? `Who should join: ${c.who_should_join}` : null,
      c.what_they_do ? `What they do: ${c.what_they_do}` : null,
      c.vibe ? `Vibe: ${c.vibe}` : null,
      c.tags?.length ? `Tags: ${c.tags.join(', ')}` : null,
    ].filter(Boolean).join(' | ');

    return `${i + 1}. [${c.id}] ${c.name} (${c.category})\n   ${desc || 'No description'}`;
  }).join('\n\n');

  const interestSummary = [
    student.major ? `Major: ${student.major}` : null,
    student.careerGoals.length ? `Career goals: ${student.careerGoals.join(', ')}` : null,
    student.interests.length ? `Interests: ${student.interests.join(', ')}` : null,
    student.resumeKeywords.length ? `Resume background: ${student.resumeKeywords.slice(0, 15).join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are matching UCSD student clubs to a specific student. Score each club 0-100 on how well it fits this student.

STUDENT PROFILE:
${interestSummary}

SCORING GUIDE:
- 80-100: Natural fit — their background, major, or goals align directly with what this club does
- 50-79: Some alignment — they'd likely enjoy it but it's not their primary interest
- 20-49: Weak connection — tangentially related
- 0-19: No meaningful connection

CLUBS TO SCORE:
${clubList}

Return ONLY a JSON array, one object per club in the same order:
[{"id":"club_id","score":85,"reason":"one sentence specific to this student — mention their major or goals"}]

Be honest — most clubs should score below 50. Only clubs that genuinely fit this student's stated goals and background should score above 70.`,
      }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? '[]';

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]+\]/);
    try { return match ? JSON.parse(match[0]) : []; }
    catch { return []; }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const body = await req.json();
    const { student, clubs } = body as { student: StudentProfile; clubs: Club[] };

    if (!student || !clubs?.length) {
      return new Response(JSON.stringify({ error: 'Missing student or clubs' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Cap at 30 clubs per call to keep response time reasonable
    const results = await scoreClubs(student, clubs.slice(0, 30));

    return new Response(JSON.stringify({ results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('ai-match-clubs error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
