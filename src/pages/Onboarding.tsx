import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { dataClient } from '@/integrations/supabase/dataClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ResumeUploadStep from '@/components/onboarding/ResumeUploadStep';

interface ExtractedKeywords {
  career_goals: string[];
  interests: string[];
  skills: string[];
  vibe: string[];
}

interface AreaOption {
  value: string;
  label: string;
  emoji: string;
  count: number;
}

interface TagOption {
  value: string;
  label: string;
  count: number;
}

// Broad area definitions — maps to categoryBucket values in the DB
const BROAD_AREAS = [
  { value: 'tech / stem', label: 'Tech & STEM', emoji: '💻' },
  { value: 'professional', label: 'Business & Professional', emoji: '💼' },
  { value: 'academic', label: 'Academic & Research', emoji: '🔬' },
  { value: 'arts', label: 'Arts & Creative', emoji: '🎨' },
  { value: 'cultural', label: 'Culture & Identity', emoji: '🎭' },
  { value: 'service', label: 'Social Impact & Service', emoji: '🌍' },
  { value: 'sports', label: 'Sports & Fitness', emoji: '🏃' },
  { value: 'spiritual', label: 'Spiritual & Wellness', emoji: '🧘' },
  { value: 'social', label: 'Social & Recreational', emoji: '🎉' },
  { value: 'greek life', label: 'Greek Life', emoji: '🏛️' },
];

const GOAL_OPTIONS = [
  { value: 'career', label: 'Build my career network', emoji: '🚀', detail: 'Internships, referrals, industry connections' },
  { value: 'community', label: 'Find my people', emoji: '👯', detail: 'Real friendships and a sense of belonging' },
  { value: 'skills', label: 'Develop real skills', emoji: '⚡', detail: 'Hands-on experience and growth' },
  { value: 'impact', label: 'Make a difference', emoji: '🔥', detail: 'Causes worth fighting for' },
  { value: 'explore', label: "Explore what's out there", emoji: '🌊', detail: "Still figuring it out — that's fine" },
];

// Normalize a categoryBucket for matching
function normalizeBucket(bucket: string): string {
  return (bucket || '').toLowerCase().trim();
}

// Map a club's categoryBucket to our broad area values
function matchesArea(club: { categoryBucket?: string; category?: string }, areaValue: string): boolean {
  const bucket = normalizeBucket(club.categoryBucket || club.category || '');
  if (areaValue === 'greek life') {
    return ['fraternity', 'sorority', 'greek life', 'greek'].some(t => bucket.includes(t));
  }
  return bucket.includes(areaValue) || bucket === areaValue;
}

// Extract meaningful subcategory tags from clubs in selected areas
function extractSubcategories(clubs: any[], selectedAreas: string[]): TagOption[] {
  const relevant = clubs.filter(c => selectedAreas.some(a => matchesArea(c, a)));
  const freq: Record<string, number> = {};

  for (const club of relevant) {
    const tags: string[] = Array.isArray(club.tags) ? club.tags : [];
    for (const tag of tags) {
      const clean = tag.trim();
      if (clean.length < 3) continue;
      freq[clean] = (freq[clean] || 0) + 1;
    }
    // Also extract meaningful words from club names
    const nameWords = (club.name || '').split(/[\s/&-]+/).map((w: string) => w.trim()).filter((w: string) => w.length > 4);
    for (const word of nameWords) {
      if (['ucsd', 'club', 'student', 'association', 'society', 'organization'].includes(word.toLowerCase())) continue;
      freq[word] = (freq[word] || 0) + 0.5;
    }
  }

  return Object.entries(freq)
    .filter(([, count]) => count >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 16)
    .map(([label, count]) => ({ value: label.toLowerCase(), label, count: Math.round(count) }));
}

const STEPS = ['goal', 'areas', 'specifics', 'resume'] as const;
type Step = typeof STEPS[number];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const retake = searchParams.get('retake') === 'true';
  const { user, loading: authLoading } = useAuth();
  const { saveInterests, loading: savingInterests, hasCompletedOnboarding } = useUserInterests();

  const [step, setStep] = useState<Step>('goal');
  const [goals, setGoals] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedSpecifics, setSelectedSpecifics] = useState<string[]>([]);
  const [resumeKeywords, setResumeKeywords] = useState<ExtractedKeywords | null>(null);

  const [clubs, setClubs] = useState<any[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<TagOption[]>([]);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (!authLoading && user && !retake) {
      hasCompletedOnboarding(user.id).then((done) => { if (done) navigate('/dashboard'); });
    }
  }, [user, authLoading, navigate, hasCompletedOnboarding, retake]);

  // Fetch clubs from external DB once
  useEffect(() => {
    dataClient
      .from('clubs')
      .select('id, name, category, categoryBucket, tags, description')
      .limit(1000)
      .then(({ data }) => {
        const rows = data || [];
        setClubs(rows);

        // Build area options with real counts
        const areas: AreaOption[] = BROAD_AREAS.map((area) => ({
          ...area,
          count: rows.filter(c => matchesArea(c, area.value)).length,
        })).filter(a => a.count > 0);
        setAreaOptions(areas);
        setClubsLoading(false);
      });
  }, []);

  // Recompute subcategories whenever selected areas change
  useEffect(() => {
    if (selectedAreas.length === 0) { setSubcategoryOptions([]); return; }
    setSubcategoryOptions(extractSubcategories(clubs, selectedAreas));
  }, [selectedAreas, clubs]);

  const toggle = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const handleNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const saveAndNavigate = async (extraKeywords?: ExtractedKeywords) => {
    if (!user) return;
    const interests: { category: string; value: string }[] = [];

    goals.forEach(v => interests.push({ category: 'goal', value: v }));
    selectedAreas.forEach(v => interests.push({ category: 'area', value: v }));
    selectedSpecifics.forEach(v => interests.push({ category: 'specific', value: v }));

    const kw = extraKeywords || resumeKeywords;
    if (kw) {
      kw.career_goals.forEach(v => interests.push({ category: 'resume_career', value: v }));
      kw.interests.forEach(v => interests.push({ category: 'resume_interests', value: v }));
      kw.skills.forEach(v => interests.push({ category: 'resume_skills', value: v }));
      kw.vibe.forEach(v => interests.push({ category: 'resume_vibe', value: v }));
    }

    const result = await saveInterests(user.id, interests);
    if (result.success) {
      toast.success('Profile complete! Here are your recommendations.');
      navigate(redirectTo || '/dashboard');
    } else {
      toast.error('Failed to save preferences. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-zinc-900 z-50">
        <motion.div
          className="h-full bg-gold"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >

              {/* ── STEP 1: GOAL ── */}
              {step === 'goal' && (
                <div>
                  <div className="text-center mb-8">
                    <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">Step 1 of 4</span>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                      What do you want most from clubs?
                    </h1>
                    <p className="text-zinc-500 text-sm">Pick everything that resonates — no wrong answers.</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {GOAL_OPTIONS.map((opt) => {
                      const selected = goals.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggle(opt.value, goals, setGoals)}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                            selected
                              ? 'border-gold/50 bg-gold/8 text-white'
                              : 'border-white/8 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:bg-zinc-900'
                          )}
                        >
                          <span className="text-2xl shrink-0">{opt.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{opt.label}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{opt.detail}</p>
                          </div>
                          {selected && (
                            <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-zinc-900" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleNext}
                      disabled={goals.length === 0}
                      className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-40 px-6"
                    >
                      Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: BROAD AREAS ── */}
              {step === 'areas' && (
                <div>
                  <div className="text-center mb-8">
                    <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">Step 2 of 4</span>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                      What areas light you up?
                    </h1>
                    <p className="text-zinc-500 text-sm">Select all that apply — we'll get more specific next.</p>
                  </div>

                  {clubsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {areaOptions.map((area) => {
                        const selected = selectedAreas.includes(area.value);
                        return (
                          <button
                            key={area.value}
                            onClick={() => toggle(area.value, selectedAreas, setSelectedAreas)}
                            className={cn(
                              'relative flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all',
                              selected
                                ? 'border-gold/50 bg-gold/8'
                                : 'border-white/8 bg-zinc-900/60 hover:border-white/20 hover:bg-zinc-900'
                            )}
                          >
                            {selected && (
                              <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-gold flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-zinc-900" />
                              </div>
                            )}
                            <span className="text-2xl">{area.emoji}</span>
                            <p className={cn('text-sm font-medium', selected ? 'text-white' : 'text-zinc-300')}>{area.label}</p>
                            <p className="text-xs text-zinc-600">{area.count} clubs</p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={handleBack} className="text-zinc-500 hover:text-white">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={selectedAreas.length === 0}
                      className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-40 px-6"
                    >
                      Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: SPECIFICS ── */}
              {step === 'specifics' && (
                <div>
                  <div className="text-center mb-8">
                    <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">Step 3 of 4</span>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                      Get specific
                    </h1>
                    <p className="text-zinc-500 text-sm">
                      Based on the {clubs.filter(c => selectedAreas.some(a => matchesArea(c, a))).length} clubs in your areas — which of these topics click?
                    </p>
                  </div>

                  {subcategoryOptions.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No specific subcategories found — continue to the next step.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {subcategoryOptions.map((tag) => {
                        const selected = selectedSpecifics.includes(tag.value);
                        return (
                          <button
                            key={tag.value}
                            onClick={() => toggle(tag.value, selectedSpecifics, setSelectedSpecifics)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all',
                              selected
                                ? 'border-gold/50 bg-gold/10 text-gold'
                                : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                            )}
                          >
                            {selected && <Check className="w-3 h-3" />}
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={handleBack} className="text-zinc-500 hover:text-white">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 px-6"
                    >
                      Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: RESUME ── */}
              {step === 'resume' && (
                <ResumeUploadStep
                  onKeywordsExtracted={async (kw) => { setResumeKeywords(kw); await saveAndNavigate(kw); }}
                  onSkip={() => saveAndNavigate()}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
