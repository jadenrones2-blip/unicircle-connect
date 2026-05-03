import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')    ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// The original cold email Jaden sent — gives Claude context to draft a reply
const OUTREACH_CONTEXT = `
Jaden Rones (founder of UniCircle, unicircle.app) sent this cold email to UCSD club leaders:

---
Subject: [Club Name] — recruitment this quarter

Hi [First Name],

I'm Jaden, a UCSD student. I've been spending the past few weeks meeting with club leaders across campus — talking through how orgs run recruitment, what breaks down, and where things fall through the cracks.

What I keep hearing: officers are split across group chats and spreadsheets, applicants get lost between stages, and by the time a decision gets made half the team has lost context on who even applied.

I built UniCircle to fix that — a recruitment platform built specifically for UCSD clubs. Shared pipeline, team scoring, automatic applicant emails at every stage. The clubs I'm piloting with this quarter are already running their full recruitment cycles through it.

I'd love to walk you through it and get your take. 15 minutes — would you be open to it?

Grab time here: https://cal.com/jaden-unicircle — or just reply to this email.

Jaden
unicircle.app
---

UniCircle key facts (use if relevant):
- Free to use for clubs
- Kanban recruitment pipeline with AI applicant screening
- Automatic emails to applicants at every stage (no manual follow-up)
- Officers can collaborate and vote on applicants together
- Live application status tracker students can check anytime
- Interview scheduling built in — students self-book from a link
- Built specifically for UCSD, already being piloted this quarter
`;

async function draftReply(
  senderName: string,
  replyBody: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `You are writing a reply on behalf of Jaden Rones, the founder of UniCircle.

${OUTREACH_CONTEXT}

A club leader just replied to the outreach email:
From: ${senderName}
---
${replyBody}
---

Write a SHORT, natural reply from Jaden. Rules:
- 2-4 sentences only — no long paragraphs
- Match their energy: if they're brief, be brief; if warm, be warm
- Interested / open to call → confirm enthusiasm + remind them: https://cal.com/jaden-unicircle
- Wants more info → pick ONE concrete benefit most relevant to their reply, then offer a call
- Not interested → thank them warmly, leave door open for next quarter
- Asking how you got their email → "You're listed as a principal officer on the UCSD CSI student org registry"
- Unsubscribe request → "Of course, I've removed you. Sorry to bother!"
- Sign as just "Jaden"
- Write ONLY the email body — no subject line, no labels, nothing else`,
      }],
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? '(Draft generation failed)';
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let event: any;
  try {
    event = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (event.type !== 'email.received') {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { from, subject, text: replyText, html: replyHtml } = event.data ?? {};

  const match = (from ?? '').match(/^(?:"?(.+?)"?\s+)?<?([^>]+)>?$/);
  const senderName  = match?.[1]?.trim() ?? '';
  const senderEmail = match?.[2]?.trim() ?? from ?? '';

  // Strip quoted text from reply (everything after the first "---" / "On ... wrote:" block)
  const rawBody = (replyText ?? replyHtml?.replace(/<[^>]+>/g, ' ') ?? '').trim();
  const cleanedBody = rawBody
    .replace(/\r\n/g, '\n')
    .split(/\n[-_]{3,}|\nOn .+wrote:/)[0]  // cut quoted original
    .trim()
    .slice(0, 1500);                        // cap length

  // Generate draft in parallel with nothing (fast)
  let draft = '';
  try {
    draft = await draftReply(senderName || senderEmail, cleanedBody || '(empty reply)');
  } catch {
    draft = '(Could not generate draft — reply manually)';
  }

  const notification = [
    `From:     ${senderName ? `${senderName} <${senderEmail}>` : senderEmail}`,
    `Subject:  ${subject ?? '(no subject)'}`,
    ``,
    `──────────────────────────────────`,
    `THEIR MESSAGE`,
    `──────────────────────────────────`,
    cleanedBody || '(no text content)',
    ``,
    `──────────────────────────────────`,
    `SUGGESTED DRAFT  ↓  copy · edit · send`,
    `──────────────────────────────────`,
    draft,
    ``,
    `Send to: ${senderEmail}`,
  ].join('\n');

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'UniCircle Replies <jaden@unicircle.app>',
      to:      'jaden@unicircle.app',
      reply_to: senderEmail,
      subject: `📬 ${senderName || senderEmail} replied — draft ready`,
      text:    notification,
    }),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
