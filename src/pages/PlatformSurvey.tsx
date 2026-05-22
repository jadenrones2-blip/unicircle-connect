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

// ── Types ─────────────────────────────────────────────────────────────────────

type MCQuestion = {
  id: string;
  kind: 'mc';
  label: string;
  sub?: string;
  options: string[];
  required: boolean;
};
type ScaleQuestion = {
  id: string;
  kind: 'scale';
  label: string;
  sub?: string;
  low: string;
  high: string;
  required: boolean;
};
type LongQuestion = {
  id: string;
  kind: 'long';
  label: string;
  sub?: string;
  placeholder: string;
  required: boolean;
};
type ShortQuestion = {
  id: string;
  kind: 'short';
  label: string;
  sub?: string;
  placeholder: string;
  required: boolean;
};
type Question = MCQuestion | ScaleQuestion | LongQuestion | ShortQuestion;

// ── Questions ─────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    id: 'school',
    kind: 'mc',
    label: 'First — where are you?',
    required: true,
    options: [
      'UC San Diego',
      'UCLA',
      'UC Berkeley',
      'UC Davis',
      'UC Santa Barbara',
      'Cal Poly SLO',
      'USC',
      'Another school',
    ],
  },
  {
    id: 'year',
    kind: 'mc',
    label: 'And where in the journey?',
    required: true,
    options: [
      'First year — still figuring it all out',
      'Sophomore — starting to get my footing',
      'Junior — feels like I missed my window',
      'Senior — hard-won wisdom at this point',
      'Grad student',
    ],
  },
  {
    id: 'ease',
    kind: 'scale',
    label: 'Finding your people on campus right now feels…',
    sub: '1 = totally easy, 5 = basically impossible',
    low: 'Easy',
    high: 'Impossible',
    required: true,
  },
  {
    id: 'intent',
    kind: 'mc',
    label: 'What are you actually trying to find at college?',
    sub: 'Pick the one that hits closest.',
    required: true,
    options: [
      "A club that's actually alive — not just a Line group",
      'People who build things, not just talk about them',
      'Events worth leaving my room for',
      'Student founders or co-founders to collab with',
      'Honestly? All of the above',
    ],
  },
  {
    id: 'vision',
    kind: 'long',
    label: 'Describe your ideal campus experience. What does it actually look like?',
    sub: 'Not what you think sounds good — what you actually want.',
    placeholder:
      'Weekly coffee chats with people in my major, a startup team I actually vibe with, knowing about events before they sell out, a group that does real things not just meetings...',
    required: true,
  },
  {
    id: 'cross_campus',
    kind: 'mc',
    label:
      'UniCircle is expanding across campuses — connecting clubs, founders, and students at different schools. If you could tap into that network, what would you do with it?',
    sub: 'Be real.',
    required: true,
    options: [
      'Start a collab between my club and one at another school',
      "Find a co-founder I couldn't find at my own school",
      'Network across campuses for jobs and opportunities',
      'Compete in events or challenges with other schools',
      "That's actually insane — sign me up for all of it",
    ],
  },
  {
    id: 'irl',
    kind: 'mc',
    label:
      'What would get you to show up to something in person — an event you found through an app?',
    required: true,
    options: [
      "If it's from a club or community I already trust",
      'If people I know are going',
      "If it's a small, curated group — not a massive open event",
      "If there's something real to do, not just a networking mixer",
      "I don't really go to things I find online",
    ],
  },
  {
    id: 'feature',
    kind: 'mc',
    label: 'Which makes you actually open an app — not just download it and forget?',
    required: true,
    options: [
      "Personalized recs based on what I'm into",
      'Seeing which clubs are recruiting right now',
      'A feed of real events from communities I care about',
      'Tracking applications and hearing back in one place',
      'Connections to people at other schools in my space',
    ],
  },
  {
    id: 'nps',
    kind: 'mc',
    label: 'If a friend just transferred to your school, would you tell them about UniCircle?',
    required: true,
    options: [
      "First thing I'd send them",
      'Probably, if they were looking for clubs',
      'Maybe — depends how much it improves',
      'Not yet, but ask me again in a few months',
    ],
  },
  {
    id: 'wishlist',
    kind: 'short',
    label: 'One thing we absolutely cannot forget to build:',
    sub: 'Optional — but we genuinely read every single one.',
    placeholder: '...',
    required: false,
  },
];

// ── Scale component ───────────────────────────────────────────────────────────

function ScaleInput({
  question,
  value,
  onChange,
}: {
  question: ScaleQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ml-1">
      <div className="flex gap-2 mb-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === String(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={`flex-1 py-3 rounded-lg border text-sm font-semibold transition-all ${
                selected
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-white/8 bg-zinc-800/50 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-zinc-600 px-0.5">
        <span>{question.low}</span>
        <span>{question.high}</span>
      </div>
    </div>
  );
}

// ── MC component ──────────────────────────────────────────────────────────────

function MCInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2 ml-1">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
            value === opt
              ? 'border-gold/40 bg-gold/10 text-white'
              : 'border-white/8 bg-zinc-800/50 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              value === opt ? 'border-gold' : 'border-zinc-600'
            }`}
          >
            {value === opt && <div className="w-2 h-2 rounded-full bg-gold" />}
          </div>
          <span className="text-sm">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PlatformSurvey() {
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (id: string, val: string) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const answered = QUESTIONS.filter((q) => q.required).filter(
    (q) => !!answers[q.id]?.trim()
  ).length;
  const total = QUESTIONS.filter((q) => q.required).length;
  const progress = Math.round((answered / total) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Drop your email so we can follow up.');
      return;
    }
    if (!email.trim().toLowerCase().endsWith('.edu')) {
      toast.error('Please use a school email address (.edu).');
      return;
    }
    const missing = QUESTIONS.filter((q) => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      toast.error(
        `${missing.length} question${missing.length > 1 ? 's' : ''} still need${missing.length === 1 ? 's' : ''} an answer.`
      );
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('survey_responses').insert({
        club_id: 'platform',
        email: email.trim().toLowerCase(),
        responses: { ...answers, school: answers.school, year: answers.year },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submitted ──────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
        <Header />
        <div className="pt-32 flex flex-col items-center justify-center px-4 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">
            You're early. That matters.
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            Every response shapes what we build. We'll follow up at{' '}
            <span className="text-zinc-200">{email}</span> as the platform grows — and when we
            expand to your campus.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/clubs">Explore clubs</Link>
            </Button>
            <Button className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90" asChild>
              <Link to="/signup">Join UniCircle</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Header />

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-xl">
        {/* Hero */}
        <div className="mb-10">
          <span className="text-[11px] font-bold text-gold uppercase tracking-widest px-2 py-0.5 rounded bg-gold/10 border border-gold/20 inline-block mb-5">
            Early Access Survey · 3 min
          </span>
          <h1 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
            Campus life is broken.
            <br />
            <span className="text-gold">We're fixing it.</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            UniCircle connects students to clubs, communities, and founders — across campuses. We're
            live at UCSD and expanding fast.
          </p>
          <p className="text-zinc-500 text-sm leading-relaxed">
            You're not filling out a form. You're helping shape what this becomes. Takes 3 minutes.
            Your answers go directly to the founders.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-zinc-600">
              {answered} of {total} answered
            </span>
            <span className="text-[11px] text-gold">{progress}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-zinc-800">
            <div
              className="h-1 rounded-full bg-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
            />
            <p className="text-[11px] text-zinc-600">
              Never shared or spammed. We'll follow up as the platform grows.
            </p>
          </div>

          {/* Questions */}
          {QUESTIONS.map((q, i) => (
            <div
              key={q.id}
              className="rounded-xl border border-white/8 bg-zinc-900/60 p-5 space-y-3"
            >
              <div>
                <p className="text-zinc-100 text-sm font-medium leading-relaxed">
                  <span className="text-zinc-600 mr-2">{i + 1}.</span>
                  {q.label}
                  {!q.required && (
                    <span className="text-zinc-600 ml-1.5 font-normal text-xs">(optional)</span>
                  )}
                </p>
                {q.sub && <p className="text-xs text-zinc-500 mt-1 ml-5">{q.sub}</p>}
              </div>

              {q.kind === 'mc' && (
                <MCInput
                  options={q.options}
                  value={answers[q.id] ?? ''}
                  onChange={(v) => set(q.id, v)}
                />
              )}

              {q.kind === 'scale' && (
                <ScaleInput
                  question={q}
                  value={answers[q.id] ?? ''}
                  onChange={(v) => set(q.id, v)}
                />
              )}

              {q.kind === 'long' && (
                <Textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={4}
                  className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 resize-none ml-1"
                />
              )}

              {q.kind === 'short' && (
                <Input
                  value={answers[q.id] ?? ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 ml-1"
                />
              )}
            </div>
          ))}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gold text-zinc-900 font-bold hover:bg-gold/90 disabled:opacity-50 py-3 flex items-center justify-center gap-2 text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit — help us build this <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-zinc-600">
            Built by students, for students —{' '}
            <Link to="/" className="text-zinc-500 hover:text-gold transition-colors">
              unicircle.app
            </Link>
          </p>
        </form>
      </div>

      <Footer />
    </main>
  );
}
