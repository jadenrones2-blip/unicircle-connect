import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const event = await req.json();

  if (event.type === 'email.received') {
    const { from, subject, email_id } = event.data;

    const match = from.match(/^(?:"?(.+?)"?\s+)?<?([^>]+)>?$/);
    const senderName  = match?.[1]?.trim() ?? '';
    const senderEmail = match?.[2]?.trim() ?? from;

    const body = [
      `Someone replied to your outreach.`,
      ``,
      `From:     ${senderName ? `${senderName} <${senderEmail}>` : senderEmail}`,
      `Subject:  ${subject}`,
      `Email ID: ${email_id}`,
      ``,
      `Reply directly to ${senderEmail} to continue the conversation.`,
    ].join('\n');

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'UniCircle Replies <jaden@unicircle.app>',
        to:      'jaden@unicircle.app',
        subject: `Reply from ${senderName || senderEmail}: "${subject}"`,
        text:    body,
      }),
    });
  }

  return new Response(JSON.stringify({}), {
    headers: { 'Content-Type': 'application/json' },
  });
});
