import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { dataClient } from '@/integrations/supabase/dataClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import type { FormQuestion } from '@/hooks/useRecruitment';

const YEAR_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];

export default function ClubSurvey() {
  const { id: clubId } = useParams<{ id: string }>();

  const [clubName, setClubName] = useState('');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSurvey, setNoSurvey] = useState(false);

  // Respondent identity
  const [email, setEmail] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');

  // Answers
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      setLoading(true);
      try {
        // Fetch club name from external DB
        const { data: clubData } = await dataClient
          .from('clubs')
          .select('name')
          .eq('id', clubId.trim().toLowerCase())
          .maybeSingle();
        if (clubData) setClubName((clubData as any).name || '');

        // Fetch active survey form from main DB
        const { data: formData } = await (supabase as any)
          .from('application_forms')
          .select('questions, is_survey')
          .eq('club_id', clubId.trim().toLowerCase())
          .eq('is_survey', true)
          .maybeSingle();

        if (!formData?.questions?.length) {
          // Fall back to active application form if no dedicated survey form
          const { data: fallback } = await (supabase as any)
            .from('application_forms')
            .select('questions')
            .eq('club_id', clubId.trim().toLowerCase())
            .eq('is_active', true)
            .maybeSingle();

          if (!fallback?.questions?.length) {
            setNoSurvey(true);
          } else {
            setQuestions((fallback.questions as FormQuestion[]).filter(q => q.type !== 'video'));
          }
        } else {
          setQuestions((formData.questions as FormQuestion[]).filter(q => q.type !== 'video'));
        }
      } catch {
        setNoSurvey(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;

    if (!email.trim()) {
      toast.error('Please enter your email so we can follow up.');
      return;
    }

    const missingRequired = questions.filter(q => q.required && !answers[q.id]?.trim());
    if (missingRequired.length > 0) {
      toast.error(`Please answer all required questions.`);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('survey_responses')
        .insert({
          club_id: clubId.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          responses: {
            major: major || null,
            year: year || null,
            ...answers,
          },
        });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
        <Footer />
      </main>
    );
  }

  // ── No survey ────────────────────────────────────────────────────────────────
  if (noSurvey || questions.length === 0) {
    return (
      <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
        <Header />
        <div className="pt-32 text-center px-4">
          <ClipboardList className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-white mb-2">No survey available</h1>
          <p className="text-zinc-500 mb-6 text-sm">
            {clubName || 'This club'} hasn't published a survey yet.
          </p>
          <Button variant="outline" asChild>
            <Link to={`/clubs/${clubId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to club
            </Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  // ── Submitted ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
        <Header />
        <div className="pt-32 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">Thanks for your response!</h1>
          <p className="text-zinc-400 max-w-sm mb-8 text-sm leading-relaxed">
            {clubName || 'The club'} will use your feedback to improve. We may follow up at the email you provided.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to={`/clubs/${clubId}`}>View club profile</Link>
            </Button>
            <Button variant="gold" asChild>
              <Link to="/clubs">Explore more clubs</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // ── Survey form ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Header />

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-xl">
        <Link
          to={`/clubs/${clubId}`}
          className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to {clubName || 'club'}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-gold uppercase tracking-widest px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
              Survey
            </span>
            <span className="text-xs text-zinc-500">{clubName}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Share your thoughts
          </h1>
          <p className="text-sm text-zinc-500">
            This takes under 3 minutes. Your answers help {clubName || 'this club'} understand what students need.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identity fields */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/60 p-5 space-y-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">About you</p>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@ucsd.edu"
                className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
              />
              <p className="text-[11px] text-zinc-600">We may follow up — never shared or spammed.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Major</Label>
                <Input
                  value={major}
                  onChange={e => setMajor(e.target.value)}
                  placeholder="e.g. CS, Biology"
                  className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Year</Label>
                <select
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full h-10 bg-zinc-800 border border-white/10 text-zinc-300 rounded-md px-3 text-sm"
                >
                  <option value="">Select…</option>
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Survey questions */}
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-white/8 bg-zinc-900/60 p-5 space-y-3">
              <Label className="text-zinc-200 text-sm leading-relaxed block">
                <span className="text-zinc-600 mr-2">{i + 1}.</span>
                {q.label}
                {q.required && <span className="text-red-400 ml-1">*</span>}
              </Label>

              {q.type === 'short' && (
                <Input
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Your answer…"
                  className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600"
                />
              )}

              {q.type === 'long' && (
                <Textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Your answer…"
                  rows={4}
                  className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 resize-none"
                />
              )}

              {q.type === 'multiple_choice' && q.options.length > 0 && (
                <div className="space-y-2">
                  {q.options.filter(o => o.trim()).map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        answers[q.id] === opt
                          ? 'border-gold/40 bg-gold/8 text-white'
                          : 'border-white/8 bg-zinc-800/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
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
            </div>
          ))}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-50 py-3"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
            ) : (
              'Submit Survey'
            )}
          </Button>

          <p className="text-center text-xs text-zinc-600">
            Powered by{' '}
            <Link to="/" className="text-zinc-500 hover:text-gold transition-colors">
              UniCircle
            </Link>
          </p>
        </form>
      </div>

      <Footer />
    </main>
  );
}
