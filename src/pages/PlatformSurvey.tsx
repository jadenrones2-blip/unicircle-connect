import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

type Question =
  | { id: string; kind: 'mc'; label: string; sub?: string; options: string[]; required: boolean }
  | { id: string; kind: 'short' | 'long'; label: string; sub?: string; placeholder: string; required: boolean };

const QUESTIONS: Question[] = [
  {
    id: 'year',
    kind: 'mc',
    label: 'Where are you at right now?',
    required: true,
    options: [
      "First year — still figuring it all out",
      "Sophomore — trying to get more involved",
      "Junior — feels like I missed my window",
      "Senior — hard-won wisdom at this point",
      "Grad student",
    ],
  },
  {
    id: 'mindset',
    kind: 'mc',
    label: 'When you think about getting involved on campus, what honestly goes through your head?',
    required: true,
    options: [
      "I want to, but I never know where to start",
      "I've tried a few things but nothing really clicked",
      "I'm already involved — I just want better options",
      "Too many clubs, no idea how to filter them",
    ],
  },
  {
    id: 'frustration',
    kind: 'long',
    label: "What's the most annoying part of trying to find clubs or get involved right now?",
    sub: 'Be real — venting is welcome.',
    placeholder: "The A.S. website is a disaster, nobody tells you when recruiting starts, I applied to 3 clubs and heard nothing back...",
    required: true,
  },
  {
    id: 'retention',
    kind: 'long',
    label: 'Imagine the perfect app for campus life. What does it do that makes you actually open it every week?',
    sub: "Not 'it's useful' — what specifically keeps pulling you back?",
    placeholder: "It shows me events from clubs I actually care about, tells me when my friends are going, reminds me when apps open...",
    required: true,
  },
  {
    id: 'feature',
    kind: 'mc',
    label: "Which of these would you actually use — not just think is cool?",
    required: true,
    options: [
      "Browsing clubs by vibe and interest",
      "Seeing which clubs are actively recruiting right now",
      "Getting personally matched to clubs based on my background",
      "Tracking all my applications in one place",
      "Finding events happening this week from clubs I like",
    ],
  },
  {
    id: 'nps',
    kind: 'mc',
    label: 'Honest question — if a friend told you about UniCircle, would you download it?',
    required: true,
    options: [
      "Download it that night",
      "Maybe if they hyped it enough",
      "Probably not tbh",
      "Already on it 👀",
    ],
  },
  {
    id: 'wishlist',
    kind: 'short',
    label: "One thing we absolutely cannot forget to build:",
    sub: 'Optional, but we actually read these.',
    placeholder: "...",
    required: false,
  },
];

export default function PlatformSurvey() {
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setAnswer = (id: string, val: string) =>
    setAnswers(prev => ({ ...prev, [id]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Drop your email so we can follow up.');
      return;
    }

    const missing = QUESTIONS.filter(q => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      toast.error('A few questions still need answers.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('survey_responses').insert({
        club_id: 'platform',
        email: email.trim().toLowerCase(),
        responses: answers,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
        <Header />
        <div className="pt-32 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">You're the best.</h1>
          <p className="text-zinc-400 max-w-sm mb-8 text-sm leading-relaxed">
            Seriously — this kind of feedback is what shapes the platform. We'll follow up at{' '}
            <span className="text-zinc-200">{email}</span> as things evolve.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/clubs">Explore clubs</Link>
            </Button>
            <Button className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90" asChild>
              <Link to="/signup">Create an account</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Header />

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-xl">
        {/* Header */}
        <div className="mb-10">
          <span className="text-[11px] font-bold text-gold uppercase tracking-widest px-2 py-0.5 rounded bg-gold/10 border border-gold/20 inline-block mb-4">
            2 minutes, we promise
          </span>
          <h1 className="text-3xl font-display font-bold text-white mb-3 leading-tight">
            Help us build something<br />actually useful.
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            UniCircle is a platform for UCSD students to discover clubs, track applications, and find their community.
            We're a small team — your answers directly shape what we build next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/60 p-5 space-y-2">
            <Label className="text-zinc-200 text-sm font-medium">
              Your email <span className="text-red-400">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@ucsd.edu"
              className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
            />
            <p className="text-[11px] text-zinc-600">Never shared or spammed. We'll follow up as the platform grows.</p>
          </div>

          {/* Questions */}
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-white/8 bg-zinc-900/60 p-5 space-y-3">
              <div>
                <p className="text-zinc-200 text-sm font-medium leading-relaxed">
                  <span className="text-zinc-600 mr-2">{i + 1}.</span>
                  {q.label}
                  {!q.required && <span className="text-zinc-600 ml-1.5 font-normal text-xs">(optional)</span>}
                </p>
                {q.sub && (
                  <p className="text-xs text-zinc-500 mt-1 ml-5">{q.sub}</p>
                )}
              </div>

              {q.kind === 'mc' && (
                <div className="space-y-2 ml-1">
                  {q.options.map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        answers[q.id] === opt
                          ? 'border-gold/40 bg-gold/8 text-white'
                          : 'border-white/8 bg-zinc-800/50 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        answers[q.id] === opt ? 'border-gold' : 'border-zinc-600'
                      }`}>
                        {answers[q.id] === opt && (
                          <div className="w-2 h-2 rounded-full bg-gold" />
                        )}
                      </div>
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.kind === 'long' && (
                <Textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={4}
                  className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 resize-none ml-1"
                />
              )}

              {q.kind === 'short' && (
                <Input
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 ml-1"
                />
              )}
            </div>
          ))}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-50 py-3 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
            ) : (
              <>Submit <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>

          <p className="text-center text-xs text-zinc-600">
            Built by students, for students —{' '}
            <Link to="/" className="text-zinc-500 hover:text-gold transition-colors">unicircle.app</Link>
          </p>
        </form>
      </div>

      <Footer />
    </main>
  );
}
