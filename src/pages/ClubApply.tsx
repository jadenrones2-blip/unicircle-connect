import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, Upload } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FormQuestion } from '@/hooks/useRecruitment';

const YEAR_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];

export default function ClubApply() {
  const { id: clubId } = useParams<{ id: string }>();

  // Club & form data
  const [clubName, setClubName] = useState<string>('');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [firstStageId, setFirstStageId] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Standard fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [gpa, setGpa] = useState('');

  // Custom question answers: { [questionId]: answer }
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      setLoadingForm(true);
      try {
        // Fetch club name from external DB (clubs are in the external dataClient)
        // We use the lovable supabase client here to fetch form + stages
        const [formRes, stagesRes] = await Promise.all([
          (supabase as any).from('application_forms').select('questions').eq('club_id', clubId).maybeSingle(),
          supabase.from('recruitment_stages').select('id, order_index').eq('club_id', clubId).order('order_index', { ascending: true }).limit(1),
        ]);

        const qs = (formRes.data?.questions as FormQuestion[]) || [];
        setQuestions(qs);

        const firstStage = stagesRes.data?.[0];
        if (!firstStage) {
          // No stages set up — can't apply
          setNotFound(true);
          setLoadingForm(false);
          return;
        }
        setFirstStageId(firstStage.id);

        // Try to get club name from the clubs table (external DB) — fall back to a generic label
        try {
          const { dataClient } = await import('@/integrations/supabase/dataClient');
          const { data: clubData } = await dataClient.from('clubs').select('name').eq('id', clubId).maybeSingle();
          if (clubData?.name) setClubName(clubData.name);
        } catch {
          // club name not critical
        }
      } catch (err) {
        console.error('Error loading form:', err);
        setNotFound(true);
      } finally {
        setLoadingForm(false);
      }
    })();
  }, [clubId]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !firstStageId) return;

    // Basic validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please fill in your first name, last name, and email.');
      return;
    }

    // Validate required custom questions
    const missingRequired = questions.filter(
      (q) => q.required && !answers[q.id]?.trim()
    );
    if (missingRequired.length > 0) {
      toast.error(`Please answer all required questions: ${missingRequired.map((q) => q.label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      // Insert applicant
      const { data: applicant, error: insertError } = await supabase
        .from('applicants')
        .insert({
          club_id: clubId,
          stage_id: firstStageId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          major: major.trim() || null,
          year: year || null,
          gpa: gpa ? parseFloat(gpa) : null,
          metadata: answers,
        })
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('An application with this email already exists for this club.');
        } else {
          throw insertError;
        }
        setSubmitting(false);
        return;
      }

      // Upload resume if provided
      if (resumeFile && applicant?.id) {
        try {
          const ext = resumeFile.name.split('.').pop() || 'pdf';
          const path = `${clubId}/${applicant.id}.${ext}`;
          await supabase.storage.from('resumes').upload(path, resumeFile, { upsert: true });
        } catch (uploadErr) {
          console.warn('Resume upload failed (non-fatal):', uploadErr);
        }
      }

      // Send "application received" email notification (best-effort)
      try {
        await supabase.functions.invoke('notify-applicant-stage', {
          body: {
            notificationType: 'application_received',
            applicantEmail: email.trim().toLowerCase(),
            applicantName: `${firstName.trim()} ${lastName.trim()}`,
            clubName: clubName || 'the club',
            clubId,
          },
        });
      } catch (notifyErr) {
        console.warn('Application received notification failed (non-fatal):', notifyErr);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loadingForm) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
        <Footer />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 text-center px-4">
          <h1 className="text-2xl font-display font-bold text-white mb-3">Applications Closed</h1>
          <p className="text-zinc-500 mb-6">This club is not currently accepting applications.</p>
          <Button variant="outline" asChild>
            <Link to={`/clubs/${clubId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Club
            </Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  // ─── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">Application Submitted!</h1>
          <p className="text-zinc-400 max-w-sm mb-8">
            Your application to {clubName || 'this club'} has been received. We'll be in touch soon.
          </p>
          <Button variant="outline" asChild>
            <Link to={`/clubs/${clubId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Club
            </Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  // ─── Application form ───────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-2xl">
        <Link
          to={`/clubs/${clubId}`}
          className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to {clubName || 'Club'}
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Apply to {clubName || 'this club'}
          </h1>
          <p className="text-zinc-500">
            Fill out the form below to submit your application. Fields marked with{' '}
            <span className="text-red-400">*</span> are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Standard fields */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Basic Information
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  Last Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@university.edu"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Major</Label>
                <Input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="Computer Science"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10">
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">GPA (optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="4.0"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                placeholder="3.8"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 max-w-[120px]"
              />
            </div>
          </div>

          {/* Custom questions */}
          {questions.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-6">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Application Questions
              </p>

              {questions.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <Label className="text-zinc-300">
                    {q.label}
                    {q.required && <span className="text-red-400 ml-1">*</span>}
                  </Label>

                  {q.type === 'short' && (
                    <Input
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswer(q.id, e.target.value)}
                      className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                      required={q.required}
                    />
                  )}

                  {q.type === 'long' && (
                    <Textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswer(q.id, e.target.value)}
                      rows={5}
                      className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none"
                      required={q.required}
                    />
                  )}

                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                            answers[q.id] === opt
                              ? 'border-gold/40 bg-gold/5 text-white'
                              : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => handleAnswer(q.id, opt)}
                            className="accent-yellow-500"
                            required={q.required && !answers[q.id]}
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Resume upload */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Resume</p>
            <Label className="text-zinc-300">Upload Resume (PDF, optional)</Label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-white/15 cursor-pointer hover:border-white/30 transition-colors">
              <Upload className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">
                {resumeFile ? resumeFile.name : 'Click to select a PDF file'}
              </span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
            </label>
            {resumeFile && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs">
                  {(resumeFile.size / 1024).toFixed(0)} KB
                </Badge>
                <button
                  type="button"
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                  onClick={() => setResumeFile(null)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="gold"
            className="w-full h-12 text-base"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </form>
      </div>

      <Footer />
    </main>
  );
}
