import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Upload,
  Video,
  StopCircle,
  RotateCcw,
  Download,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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

// ─── Video Question Field ─────────────────────────────────────────────────────

interface VideoData {
  blob: Blob;
  url: string;
  filename: string;
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`;
}

function VideoQuestionField({
  question,
  value,
  onChange,
}: {
  question: import('@/hooks/useRecruitment').FormQuestion;
  value: VideoData | null;
  onChange: (data: VideoData | null) => void;
}) {
  const maxDuration = question.maxDuration ?? 60;
  const [mode, setMode] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  const [elapsed, setElapsed] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set preview src when value changes
  const previewRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (value && previewRef.current) {
      previewRef.current.src = value.url;
    }
  }, [value]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        onChange({ blob, url, filename: `intro-${Date.now()}.webm` });
        setMode('preview');
        stopStream();
      };
      mr.start();
      recorderRef.current = mr;
      setElapsed(0);
      setTimeLeft(maxDuration);
      setMode('recording');

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          setTimeLeft(maxDuration - next);
          if (next >= maxDuration) {
            recorderRef.current?.stop();
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return next;
        });
      }, 1000);
    } catch {
      toast.error('Camera access denied. Please upload a video file instead.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFileUpload = (file: File) => {
    if (file.size > 250 * 1024 * 1024) {
      toast.error('Video must be under 250 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    onChange({ blob: file, url, filename: file.name });
    setMode('preview');
  };

  const handleRedo = () => {
    if (value) URL.revokeObjectURL(value.url);
    onChange(null);
    setMode('idle');
    setElapsed(0);
    setTimeLeft(maxDuration);
  };

  useEffect(
    () => () => {
      stopStream();
    },
    [stopStream]
  );

  const progressPct = mode === 'recording' ? Math.min((elapsed / maxDuration) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      {question.videoPrompt && (
        <p className="text-xs text-zinc-500 italic">"{question.videoPrompt}"</p>
      )}

      {mode === 'idle' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startRecording}
            className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border border-white/10 bg-zinc-900 hover:border-gold/30 hover:bg-gold/5 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
              <Video className="w-5 h-5 text-gold" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Record</p>
              <p className="text-xs text-zinc-500">Up to {formatSeconds(maxDuration)}</p>
            </div>
          </button>

          <label className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border border-white/10 bg-zinc-900 hover:border-white/25 hover:bg-white/[0.02] transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <Upload className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Upload</p>
              <p className="text-xs text-zinc-500">MP4, MOV, WebM</p>
            </div>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
          </label>
        </div>
      )}

      {mode === 'recording' && (
        <div className="rounded-xl border border-red-500/30 bg-zinc-900 overflow-hidden">
          <video
            ref={liveVideoRef}
            muted
            playsInline
            className="w-full aspect-video object-cover bg-black"
          />
          <div className="px-4 py-3 space-y-2">
            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400 font-medium">Recording</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {formatSeconds(timeLeft)} left
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'preview' && value && (
        <div className="rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
          <video
            ref={previewRef}
            controls
            playsInline
            className="w-full aspect-video object-cover bg-black"
          />
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500 truncate max-w-[60%]">{value.filename}</p>
            <div className="flex items-center gap-2">
              <a
                href={value.url}
                download={value.filename}
                className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleRedo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 text-xs font-medium hover:border-white/25 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Redo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClubApply() {
  const { id: clubId } = useParams<{ id: string }>();
  const { user } = useAuth();

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

  // Video answers: { [questionId]: VideoData }
  const [videoAnswers, setVideoAnswers] = useState<Record<string, VideoData | null>>({});

  // Profile photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Quick interest state
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickSubmitted, setQuickSubmitted] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    if (!clubId) return;

    const timeout = <T,>(ms: number, promise: Promise<T>): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
      ]);

    (async () => {
      setLoadingForm(true);
      try {
        // Stages fetch is the gate — if it fails/times out, show "Applications Closed"
        // Form fetch is best-effort — if it fails, show standard fields only
        const stagesRes = await timeout(
          6000,
          supabase
            .from('recruitment_stages')
            .select('id, order_index')
            .eq('club_id', clubId)
            .order('order_index', { ascending: true })
            .limit(1)
        );

        const firstStage = stagesRes.data?.[0];
        if (!firstStage) {
          setNotFound(true);
          setLoadingForm(false);
          return;
        }
        setFirstStageId(firstStage.id);

        // Fetch active form questions — non-blocking, empty custom questions on failure
        timeout(
          6000,
          (supabase as any)
            .from('application_forms')
            .select('questions')
            .eq('club_id', clubId)
            .eq('is_active', true)
            .maybeSingle()
        )
          .then((formRes: { data?: { questions?: FormQuestion[] } }) => {
            const qs = (formRes?.data?.questions as FormQuestion[]) || [];
            setQuestions(qs);
          })
          .catch(() => {
            /* use standard fields only */
          });

        // Club name from external DB is purely cosmetic — never block on it
        timeout(
          4000,
          import('@/integrations/supabase/dataClient').then(async ({ dataClient }) => {
            const { data: clubData } = await dataClient
              .from('clubs')
              .select('name')
              .eq('id', clubId)
              .maybeSingle();
            if (clubData?.name) setClubName(clubData.name);
          })
        ).catch(() => {
          /* non-fatal */
        });
      } catch (err) {
        console.error('Error loading apply form:', err);
        // On timeout or network error, still show form if we have a stageId
        // otherwise fall through to notFound
        setNotFound(true);
      } finally {
        setLoadingForm(false);
      }
    })();
  }, [clubId]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleQuickInterest = async () => {
    if (!clubId || !user?.email) return;
    setQuickSubmitting(true);
    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from('applicants')
        .select('id')
        .eq('club_id', clubId.trim().toLowerCase())
        .eq('email', user.email)
        .maybeSingle();

      if (existing) {
        setAlreadyApplied(true);
        toast.error('You have already applied or expressed interest in this club.');
        setQuickSubmitting(false);
        return;
      }

      // Fetch user profile
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      const fullName = user.user_metadata?.full_name ?? '';
      const nameParts = fullName.split(' ');
      const fName = profile?.first_name || nameParts[0] || '';
      const lName = profile?.last_name || nameParts.slice(1).join(' ') || '';
      const emailAddr = profile?.email || user.email || '';

      const { error } = await supabase.from('applicants').insert({
        club_id: clubId.trim().toLowerCase(),
        stage_id: firstStageId,
        first_name: fName,
        last_name: lName,
        email: emailAddr,
        major: null,
        year: null,
        gpa: null,
        metadata: {},
        is_quick_interest: true,
      } as any);

      if (error) throw error;

      setQuickSubmitted(true);
      toast.success(
        'Interest registered! Complete your full application anytime from your dashboard.'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to express interest. Please try again.');
    } finally {
      setQuickSubmitting(false);
    }
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
    const missingRequired = questions.filter((q) => {
      if (!q.required) return false;
      if (q.type === 'video') return !videoAnswers[q.id];
      return !answers[q.id]?.trim();
    });
    if (missingRequired.length > 0) {
      toast.error(
        `Please answer all required questions: ${missingRequired.map((q) => q.label).join(', ')}`
      );
      return;
    }

    setSubmitting(true);
    try {
      // Build metadata — start with text answers, video URLs added after upload
      const metadata: Record<string, string> = { ...answers };

      // Upload profile photo if provided
      let photoUrl: string | null = null;
      if (photoFile) {
        try {
          const photoPath = `applicants/${clubId}/${Date.now()}_${photoFile.name}`;
          const { data: photoUpload, error: photoError } = await supabase.storage
            .from('avatars')
            .upload(photoPath, photoFile, { upsert: true, contentType: photoFile.type });
          if (!photoError && photoUpload) {
            photoUrl = supabase.storage.from('avatars').getPublicUrl(photoUpload.path)
              .data.publicUrl;
          }
        } catch {
          // non-fatal
        }
      }

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
          metadata,
          avatar_url: photoUrl,
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

      // Upload resume via edge function (service role bypasses RLS)
      if (resumeFile && applicant?.id) {
        try {
          const fd = new FormData();
          fd.append('file', resumeFile);
          fd.append('applicant_id', applicant.id);
          fd.append('club_id', String(clubId));
          const { error: fnErr } = await supabase.functions.invoke('upload-applicant-resume', {
            body: fd,
          });
          if (fnErr) {
            /* non-fatal — resume upload failed */
          }
        } catch {
          /* non-fatal */
        }
      }

      // Upload video answers and patch metadata with public URLs
      if (applicant?.id) {
        const videoQuestions = questions.filter((q) => q.type === 'video');
        const videoUpdates: Record<string, string> = {};
        for (const q of videoQuestions) {
          const vid = videoAnswers[q.id];
          if (!vid) continue;
          try {
            const ext = vid.filename.split('.').pop() || 'webm';
            const path = `${clubId}/${applicant.id}/${q.id}.${ext}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('application-videos')
              .upload(path, vid.blob, { upsert: true, contentType: vid.blob.type || 'video/webm' });
            if (!uploadError && uploadData) {
              const {
                data: { publicUrl },
              } = supabase.storage.from('application-videos').getPublicUrl(uploadData.path);
              videoUpdates[q.id] = publicUrl;
            }
          } catch {
            /* non-fatal */
          }
        }
        // Patch applicant metadata with video URLs if any uploaded
        if (Object.keys(videoUpdates).length > 0) {
          try {
            await supabase
              .from('applicants')
              .update({ metadata: { ...metadata, ...videoUpdates } })
              .eq('id', applicant.id);
          } catch {
            /* non-fatal */
          }
        }
      }

      // Send "application received" email notification (best-effort, 5s timeout)
      try {
        await Promise.race([
          supabase.functions.invoke('notify-applicant-stage', {
            body: {
              notificationType: 'application_received',
              applicantEmail: email.trim().toLowerCase(),
              applicantName: `${firstName.trim()} ${lastName.trim()}`,
              clubName: clubName || 'the club',
              clubId,
            },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch {
        /* non-fatal */
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
          <h1 className="text-3xl font-display font-bold text-white mb-3">
            Application Submitted!
          </h1>
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

        {/* Quick Interest Banner — logged-in users only */}
        {user && !alreadyApplied && firstStageId && (
          <div className="mb-6 rounded-xl border border-gold/25 bg-gold/5 p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm mb-0.5">
                  Express interest in one tap
                </p>
                <p className="text-xs text-zinc-400 mb-3">
                  Scanning at the org fair? Tap below — your profile is sent instantly. You can fill
                  out the full application anytime from your dashboard.
                </p>
                {quickSubmitted ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <span className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                    Interest registered! Check your dashboard to complete the application.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleQuickInterest}
                    disabled={quickSubmitting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-zinc-900 text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-60"
                  >
                    {quickSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    {quickSubmitting ? 'Registering…' : "I'm Interested"}
                  </button>
                )}
              </div>
            </div>
            {!quickSubmitted && (
              <p className="text-[11px] text-zinc-600 mt-3 pl-11">
                Want to fill out the full application? Continue below ↓
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo (optional) */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Profile Photo
            </p>
            <Label className="text-zinc-300">Photo (optional)</Label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-white/15 cursor-pointer hover:border-white/30 transition-colors">
              <Camera className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-400 truncate">
                {photoFile ? photoFile.name : 'Click to upload a profile photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </label>
            {photoFile && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs">
                  {(photoFile.size / 1024).toFixed(0)} KB
                </Badge>
                <button
                  type="button"
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                  onClick={() => setPhotoFile(null)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

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
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
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

                  {q.type === 'video' && (
                    <VideoQuestionField
                      question={q}
                      value={videoAnswers[q.id] ?? null}
                      onChange={(data) => setVideoAnswers((prev) => ({ ...prev, [q.id]: data }))}
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
