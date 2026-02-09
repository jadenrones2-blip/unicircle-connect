import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ResumeUploadStep from '@/components/onboarding/ResumeUploadStep';

interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: { value: string; label: string; emoji: string }[];
  multiSelect: boolean;
}

interface ExtractedKeywords {
  career_goals: string[];
  interests: string[];
  skills: string[];
  vibe: string[];
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 'superpower',
    category: 'superpower',
    question: "If you could unlock one superpower from college clubs, what would it be?",
    multiSelect: true,
    options: [
      { value: 'network', label: 'Connections that open doors', emoji: '🚪' },
      { value: 'skills', label: 'Skills that make me dangerous', emoji: '⚡' },
      { value: 'squad', label: 'A squad that gets me', emoji: '👯' },
      { value: 'confidence', label: 'Confidence to lead anything', emoji: '🦁' },
      { value: 'purpose', label: 'A cause worth fighting for', emoji: '🔥' },
      { value: 'fun', label: 'Honestly? Just vibes', emoji: '✨' },
    ],
  },
  {
    id: 'career',
    category: 'career',
    question: "What's your dream career move after graduation?",
    multiSelect: true,
    options: [
      { value: 'tech_career', label: 'Break into tech', emoji: '💻' },
      { value: 'finance_career', label: 'Wall Street / Finance', emoji: '📊' },
      { value: 'startup_career', label: 'Start my own thing', emoji: '🚀' },
      { value: 'consulting_career', label: 'Consulting / Strategy', emoji: '🎯' },
      { value: 'healthcare_career', label: 'Med / Healthcare', emoji: '🩺' },
      { value: 'research_career', label: 'Research / Academia', emoji: '🔬' },
      { value: 'creative_career', label: 'Creative / Design / Media', emoji: '🎬' },
      { value: 'nonprofit_career', label: 'Nonprofit / Public sector', emoji: '🌍' },
      { value: 'undecided_career', label: 'Still figuring it out', emoji: '🤷' },
    ],
  },
  {
    id: 'interests',
    category: 'interests',
    question: "What rabbit holes could you fall into for hours?",
    multiSelect: true,
    options: [
      { value: 'tech', label: 'Coding & building stuff', emoji: '🛠️' },
      { value: 'business', label: 'Startups & side hustles', emoji: '💡' },
      { value: 'arts', label: 'Art, music, or design', emoji: '🎨' },
      { value: 'science', label: 'Science & discovery', emoji: '🧬' },
      { value: 'culture', label: 'Culture & identity', emoji: '🎭' },
      { value: 'fitness', label: 'Sports & fitness', emoji: '🏋️' },
      { value: 'social_impact', label: 'Changing the world', emoji: '✊' },
      { value: 'gaming', label: 'Gaming & esports', emoji: '🎮' },
    ],
  },
  {
    id: 'energy',
    category: 'energy',
    question: "How much energy do you want to pour into clubs?",
    multiSelect: false,
    options: [
      { value: 'explorer', label: 'Dip my toes in', emoji: '🌊' },
      { value: 'committed', label: 'Show up & contribute', emoji: '💪' },
      { value: 'all_in', label: 'Run the whole thing', emoji: '👑' },
    ],
  },
  {
    id: 'vibe',
    category: 'vibe',
    question: "Pick the club vibe that matches your energy:",
    multiSelect: true,
    options: [
      { value: 'competitive', label: 'Intense & high-achieving', emoji: '🏆' },
      { value: 'chill', label: 'Chill & no pressure', emoji: '🧘' },
      { value: 'party', label: 'Social butterflies unite', emoji: '🦋' },
      { value: 'professional', label: 'Suit up & network', emoji: '👔' },
      { value: 'creative_vibe', label: 'Weird & creative', emoji: '🎪' },
      { value: 'inclusive', label: 'Warm & welcoming', emoji: '🤗' },
    ],
  },
];

// Total steps: quiz questions + 1 optional resume step
const RESUME_STEP_INDEX = quizQuestions.length;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { saveInterests, loading: savingInterests } = useUserInterests();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [resumeKeywords, setResumeKeywords] = useState<ExtractedKeywords | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const isResumeStep = currentStep === RESUME_STEP_INDEX;
  const currentQuestion = isResumeStep ? null : quizQuestions[currentStep];
  const totalSteps = quizQuestions.length + 1; // +1 for resume step
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const toggleAnswer = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const current = prev[currentQuestion.id] || [];
      if (currentQuestion.multiSelect) {
        if (current.includes(value)) {
          return { ...prev, [currentQuestion.id]: current.filter((v) => v !== value) };
        }
        return { ...prev, [currentQuestion.id]: [...current, value] };
      }
      return { ...prev, [currentQuestion.id]: [value] };
    });
  };

  const canProceed = currentQuestion ? (answers[currentQuestion.id] || []).length > 0 : false;

  const saveAndNavigate = async (additionalKeywords?: ExtractedKeywords) => {
    if (!user) return;

    const interests: { category: string; value: string }[] = [];
    
    // Add quiz answers
    Object.entries(answers).forEach(([category, values]) => {
      values.forEach((value) => {
        interests.push({ category, value });
      });
    });

    // Add resume keywords if provided
    const keywords = additionalKeywords || resumeKeywords;
    if (keywords) {
      keywords.career_goals.forEach((value) => {
        interests.push({ category: 'resume_career', value });
      });
      keywords.interests.forEach((value) => {
        interests.push({ category: 'resume_interests', value });
      });
      keywords.skills.forEach((value) => {
        interests.push({ category: 'resume_skills', value });
      });
      keywords.vibe.forEach((value) => {
        interests.push({ category: 'resume_vibe', value });
      });
    }

    const result = await saveInterests(user.id, interests);
    if (result.success) {
      toast.success('Profile complete! Here are your recommendations.');
      navigate('/dashboard');
    } else {
      toast.error('Failed to save preferences. Please try again.');
    }
  };

  const handleNext = async () => {
    if (currentStep < quizQuestions.length - 1) {
      // Move to next quiz question
      setCurrentStep((s) => s + 1);
    } else if (currentStep === quizQuestions.length - 1) {
      // Move from last quiz question to resume step
      setCurrentStep(RESUME_STEP_INDEX);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleResumeKeywordsExtracted = async (keywords: ExtractedKeywords) => {
    setResumeKeywords(keywords);
    await saveAndNavigate(keywords);
  };

  const handleSkipResume = async () => {
    await saveAndNavigate();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pt-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {isResumeStep ? (
                <ResumeUploadStep
                  onKeywordsExtracted={handleResumeKeywordsExtracted}
                  onSkip={handleSkipResume}
                />
              ) : currentQuestion && (
                <>
                  {/* Step indicator */}
                  <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Question {currentStep + 1} of {quizQuestions.length}
                    </span>
                  </div>

                  {/* Question */}
                  <h1 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
                    {currentQuestion.question}
                  </h1>
                  <p className="text-center text-muted-foreground mb-8">
                    {currentQuestion.multiSelect
                      ? 'Select all that apply'
                      : 'Choose one option'}
                  </p>

                  {/* Options grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                    {currentQuestion.options.map((option) => {
                      const isSelected = (answers[currentQuestion.id] || []).includes(
                        option.value
                      );
                      return (
                        <button
                          key={option.value}
                          onClick={() => toggleAnswer(option.value)}
                          className={cn(
                            'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
                            'hover:border-primary/50 hover:bg-primary/5',
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card'
                          )}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                            >
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </motion.div>
                          )}
                          <span className="text-2xl mb-2 block">{option.emoji}</span>
                          <span className="text-sm font-medium text-foreground">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      disabled={currentStep === 0}
                      className="text-muted-foreground"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>

                    <Button
                      onClick={handleNext}
                      disabled={!canProceed || savingInterests}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {savingInterests ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
