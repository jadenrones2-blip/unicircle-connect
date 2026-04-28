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

interface SectorChip {
  value: string;
  label: string;
  emoji: string;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

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

const VIBE_OPTIONS = [
  { value: 'casual', label: 'Keep it casual', emoji: '😎', detail: 'Show up when I can, low commitment' },
  { value: 'active', label: 'Be an active member', emoji: '⚡', detail: 'Regular meetings, events, and projects' },
  { value: 'leader', label: 'Aim for a leadership role', emoji: '🎯', detail: 'Officer track — I want to help run things' },
  { value: 'compete', label: 'Compete or perform', emoji: '🏆', detail: 'I want to be on a team or on a stage' },
  { value: 'network', label: 'Network intentionally', emoji: '🤝', detail: 'Industry contacts and professional events' },
];

const SECTOR_SPECIFICS: Record<string, SectorChip[]> = {
  'tech / stem': [
    { value: 'software-engineering', label: 'Software Engineering', emoji: '⌨️' },
    { value: 'ai-ml', label: 'AI / Machine Learning', emoji: '🤖' },
    { value: 'data-science', label: 'Data Science & Analytics', emoji: '📊' },
    { value: 'cybersecurity', label: 'Cybersecurity', emoji: '🔐' },
    { value: 'robotics', label: 'Robotics & Hardware', emoji: '🦾' },
    { value: 'biotech', label: 'Biotech & Bioinformatics', emoji: '🧬' },
    { value: 'game-dev', label: 'Game Development', emoji: '🎮' },
    { value: 'web-mobile', label: 'Web & Mobile Dev', emoji: '📱' },
    { value: 'aerospace', label: 'Space & Aerospace', emoji: '🚀' },
    { value: 'stem-research', label: 'STEM Research', emoji: '🔬' },
  ],
  'professional': [
    { value: 'finance', label: 'Finance & Investment', emoji: '📈' },
    { value: 'consulting', label: 'Consulting', emoji: '💡' },
    { value: 'marketing', label: 'Marketing & Brand', emoji: '📣' },
    { value: 'entrepreneurship', label: 'Entrepreneurship & Startups', emoji: '🌱' },
    { value: 'real-estate', label: 'Real Estate', emoji: '🏠' },
    { value: 'accounting', label: 'Accounting & Audit', emoji: '🧾' },
    { value: 'operations', label: 'Supply Chain & Operations', emoji: '⚙️' },
    { value: 'pre-law', label: 'Law & Pre-law', emoji: '⚖️' },
    { value: 'healthcare-business', label: 'Healthcare Business', emoji: '🏥' },
    { value: 'nonprofit-social', label: 'Nonprofit & Social Enterprise', emoji: '🤲' },
  ],
  'academic': [
    { value: 'stem-research-academic', label: 'STEM Research', emoji: '🔬' },
    { value: 'humanities', label: 'Humanities & Social Sciences', emoji: '📚' },
    { value: 'pre-med', label: 'Pre-Med & Health Sciences', emoji: '🩺' },
    { value: 'policy', label: 'Policy & Political Science', emoji: '🏛️' },
    { value: 'economics', label: 'Economics', emoji: '📊' },
    { value: 'psychology', label: 'Psychology & Neuroscience', emoji: '🧠' },
    { value: 'environmental-sci', label: 'Environmental Science', emoji: '🌿' },
    { value: 'pre-law-academic', label: 'Pre-Law', emoji: '⚖️' },
    { value: 'linguistics', label: 'Linguistics & Languages', emoji: '🌐' },
  ],
  'arts': [
    { value: 'music', label: 'Music (Performance / Production)', emoji: '🎵' },
    { value: 'visual-art', label: 'Visual Art & Fine Art', emoji: '🎨' },
    { value: 'design', label: 'Design (Graphic / UX)', emoji: '✏️' },
    { value: 'film', label: 'Film & Photography', emoji: '🎬' },
    { value: 'dance', label: 'Dance & Performing Arts', emoji: '💃' },
    { value: 'writing', label: 'Writing & Journalism', emoji: '📝' },
    { value: 'fashion', label: 'Fashion', emoji: '👗' },
    { value: 'theatre', label: 'Theatre & Acting', emoji: '🎭' },
  ],
  'cultural': [
    { value: 'asian-pacific', label: 'Asian / Pacific Islander', emoji: '🌏' },
    { value: 'black-african', label: 'Black & African American', emoji: '✊' },
    { value: 'latinx', label: 'Latinx & Hispanic', emoji: '🌮' },
    { value: 'south-asian', label: 'South Asian', emoji: '🌺' },
    { value: 'middle-eastern', label: 'Middle Eastern & North African', emoji: '🌙' },
    { value: 'lgbtq', label: 'LGBTQ+', emoji: '🏳️‍🌈' },
    { value: 'international', label: 'International Students', emoji: '🌍' },
    { value: 'indigenous', label: 'Indigenous & Native American', emoji: '🦅' },
  ],
  'service': [
    { value: 'environment-climate', label: 'Environmental & Climate', emoji: '🌱' },
    { value: 'education-equity', label: 'Education Equity', emoji: '📚' },
    { value: 'healthcare-access', label: 'Healthcare Access', emoji: '🏥' },
    { value: 'housing-food', label: 'Housing & Food Security', emoji: '🍎' },
    { value: 'global-dev', label: 'Global Development', emoji: '🌍' },
    { value: 'community-org', label: 'Community Organizing', emoji: '🤝' },
    { value: 'criminal-justice', label: 'Criminal Justice Reform', emoji: '⚖️' },
  ],
  'sports': [
    { value: 'competitive-sports', label: 'Competitive / Club Sports', emoji: '🏆' },
    { value: 'recreational', label: 'Recreational & Intramural', emoji: '🎯' },
    { value: 'martial-arts', label: 'Martial Arts', emoji: '🥋' },
    { value: 'outdoor-adventure', label: 'Outdoor & Adventure', emoji: '🧗' },
    { value: 'fitness-wellness', label: 'Fitness & Wellness', emoji: '💪' },
    { value: 'esports', label: 'Esports', emoji: '🕹️' },
  ],
  'spiritual': [
    { value: 'christian', label: 'Christian & Faith-based', emoji: '✝️' },
    { value: 'muslim', label: 'Muslim & Islamic', emoji: '☪️' },
    { value: 'jewish', label: 'Jewish', emoji: '✡️' },
    { value: 'hindu', label: 'Hindu & South Asian Faith', emoji: '🕉️' },
    { value: 'buddhist', label: 'Buddhist & Mindfulness', emoji: '☸️' },
    { value: 'wellness-spiritual', label: 'Non-denominational Wellness', emoji: '🧘' },
  ],
  'social': [
    { value: 'gaming-anime', label: 'Gaming & Anime', emoji: '🎮' },
    { value: 'cooking-food', label: 'Cooking & Food', emoji: '🍳' },
    { value: 'travel-outdoors', label: 'Travel & Outdoors', emoji: '✈️' },
    { value: 'books-debate', label: 'Books & Debate', emoji: '📖' },
    { value: 'music-listening', label: 'Music Appreciation', emoji: '🎵' },
    { value: 'fashion-lifestyle', label: 'Fashion & Lifestyle', emoji: '👗' },
    { value: 'volunteering-social', label: 'Casual Volunteering', emoji: '🤲' },
  ],
  'greek life': [
    { value: 'social-frat', label: 'Social Fraternity', emoji: '🏛️' },
    { value: 'social-sorority', label: 'Social Sorority', emoji: '🏛️' },
    { value: 'professional-greek', label: 'Professional Fraternity', emoji: '💼' },
    { value: 'cultural-greek', label: 'Cultural Greek Org', emoji: '🌏' },
    { value: 'lgbtq-greek', label: 'LGBTQ+ Greek Org', emoji: '🏳️‍🌈' },
    { value: 'service-greek', label: 'Service-based Greek Org', emoji: '🌱' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeBucket(bucket: string): string {
  return (bucket || '').toLowerCase().trim();
}

function matchesArea(club: { categoryBucket?: string; category?: string }, areaValue: string): boolean {
  const bucket = normalizeBucket(club.categoryBucket || club.category || '');
  if (areaValue === 'greek life') {
    return ['fraternity', 'sorority', 'greek life', 'greek'].some(t => bucket.includes(t));
  }
  return bucket.includes(areaValue) || bucket === areaValue;
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = ['goal', 'vibe', 'areas', 'specifics', 'resume'] as const;
type Step = typeof STEPS[number];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const retake = searchParams.get('retake') === 'true';
  const { user, loading: authLoading } = useAuth();
  const { saveInterests, loading: savingInterests, hasCompletedOnboarding } = useUserInterests();

  const [step, setStep] = useState<Step>('goal');
  const [goals, setGoals] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedSpecifics, setSelectedSpecifics] = useState<string[]>([]);
  const [resumeKeywords, setResumeKeywords] = useState<ExtractedKeywords | null>(null);

  const [clubs, setClubs] = useState<any[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([]);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (!authLoading && user && !retake) {
      hasCompletedOnboarding(user.id).then((done) => { if (done) navigate('/dashboard'); });
    }
  }, [user, authLoading, navigate, hasCompletedOnboarding, retake]);

  useEffect(() => {
    dataClient
      .from('clubs')
      .select('id, name, category, categoryBucket, tags')
      .limit(1000)
      .then(({ data }) => {
        const rows = data || [];
        setClubs(rows);
        const computed: AreaOption[] = BROAD_AREAS.map((area) => ({
          ...area,
          count: rows.filter(c => matchesArea(c, area.value)).length,
        }));
        // Fall back to static list (count 0 hidden) if nothing matched
        const withCounts = computed.filter(a => a.count > 0);
        setAreaOptions(withCounts.length > 0 ? withCounts : computed.map(a => ({ ...a, count: 0 })));
        setClubsLoading(false);
      })
      .catch(() => {
        // Show static list on fetch failure
        setAreaOptions(BROAD_AREAS.map(a => ({ ...a, count: 0 })));
        setClubsLoading(false);
      });
  }, []);

  // Sector chips for selected areas (deduplicated by value)
  const sectorSections = selectedAreas
    .map(area => ({
      area,
      areaLabel: BROAD_AREAS.find(a => a.value === area)?.label || area,
      chips: SECTOR_SPECIFICS[area] || [],
    }))
    .filter(s => s.chips.length > 0);

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
    selectedVibe.forEach(v => interests.push({ category: 'vibe', value: v }));
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
                    <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">Step 1 of 5</span>
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

              {/* ── STEP 2: VIBE / COMMITMENT ── */}
              {step === 'vibe' && (
                <div>
                  <div className="text-center mb-8">
                    <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">Step 2 of 5</span>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                      How do you see yourself showing up?
                    </h1>
                    <p className="text-zinc-500 text-sm">This helps us match you with clubs that fit your commitment level.</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {VIBE_OPTIONS.map((opt) => {
                      const selected = selectedVibe.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggle(opt.value, selectedVibe, setSelectedVibe)}
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

                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={handleBack} className="text-zinc-500 hover:text-white">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={selectedVibe.length === 0}
                      className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-40 px-6"
                    >
                      Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: BROAD AREAS ── */}
              {step === 'areas' && (
                <div>
                  <div className="text-center mb-8">
                    <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">Step 3 of 5</span>
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
                            {area.count > 0 && <p className="text-xs text-zinc-600">{area.count} clubs</p>}
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

              {/* ── STEP 4: SECTOR SPECIFICS ── */}
              {step === 'specifics' && (
                <div>
                  <div className="text-center mb-8">
                    <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">Step 4 of 5</span>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                      Get more specific
                    </h1>
                    <p className="text-zinc-500 text-sm">
                      Pick the topics within your areas that excite you most.
                    </p>
                  </div>

                  {sectorSections.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No sub-categories available for your selections — continue to the next step.
                    </div>
                  ) : (
                    <div className="space-y-6 mb-8 max-h-[52vh] overflow-y-auto pr-1">
                      {sectorSections.map(({ area, areaLabel, chips }) => (
                        <div key={area}>
                          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
                            {areaLabel}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {chips.map((chip) => {
                              const selected = selectedSpecifics.includes(chip.value);
                              return (
                                <button
                                  key={chip.value}
                                  onClick={() => toggle(chip.value, selectedSpecifics, setSelectedSpecifics)}
                                  className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all',
                                    selected
                                      ? 'border-gold/50 bg-gold/10 text-gold'
                                      : 'border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                                  )}
                                >
                                  <span className="text-sm">{chip.emoji}</span>
                                  {selected && <Check className="w-3 h-3" />}
                                  {chip.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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

              {/* ── STEP 5: RESUME ── */}
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

      {savingInterests && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      )}
    </div>
  );
}
