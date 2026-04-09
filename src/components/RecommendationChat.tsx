import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Club } from "@/data/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecommendationChatProps {
  clubs: Club[];
}

type Step = 0 | 1 | 2 | 3 | 4;

interface ChatOption {
  label: string;
  value: string;
}

interface BotMessage {
  type: "bot";
  text: string;
  options?: ChatOption[];
}

interface UserMessage {
  type: "user";
  text: string;
}

type ChatMessage = BotMessage | UserMessage;

interface UserAnswers {
  goal: string | null;
  field: string | null;
  vibe: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const interestToClubMapping: Record<string, string[]> = {
  network: ["Professional", "Networking", "Career", "Industry"],
  skills: ["Workshop", "Training", "Academic", "Bootcamp"],
  squad: ["Social", "Community", "Recreation"],
  purpose: ["Service", "Volunteer", "Philanthropy", "Social Impact"],
  tech: ["Tech / STEM", "STEM", "Engineering", "Computer Science", "Coding", "Technology"],
  business: ["Business", "Consulting", "Entrepreneurship", "Finance"],
  arts: ["Arts", "Design", "Creative", "Music", "Dance", "Theater"],
  science: ["Science", "Research", "Pre-Med", "Biology", "Chemistry"],
  social_impact: ["Social Impact", "Advocacy", "Service", "Sustainability"],
  fitness: ["Health", "Wellness", "Fitness", "Sports", "Recreation"],
  professional: ["Professional", "Industry", "Career", "Corporate"],
  chill: ["Casual", "Social", "Community"],
  competitive: ["Competition", "Competitive", "Tournament"],
  creative_vibe: ["Creative", "Arts", "Experimental"],
};

const STEP_1_OPTIONS: ChatOption[] = [
  { label: "Build my network", value: "network" },
  { label: "Learn new skills", value: "skills" },
  { label: "Find my people", value: "squad" },
  { label: "Make an impact", value: "purpose" },
];

const STEP_2_OPTIONS: ChatOption[] = [
  { label: "Tech & Engineering", value: "tech" },
  { label: "Business & Finance", value: "business" },
  { label: "Arts & Design", value: "arts" },
  { label: "Science & Research", value: "science" },
  { label: "Social Impact", value: "social_impact" },
  { label: "Sports & Fitness", value: "fitness" },
];

const STEP_3_OPTIONS: ChatOption[] = [
  { label: "Professional & career-focused", value: "professional" },
  { label: "Chill & social", value: "chill" },
  { label: "Competitive & ambitious", value: "competitive" },
  { label: "Creative & experimental", value: "creative_vibe" },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreClub(club: Club, answers: UserAnswers): number {
  const clubText = [club.name, club.description, club.category]
    .join(" ")
    .toLowerCase();

  let score = 0;

  const answerValues = [answers.goal, answers.field, answers.vibe].filter(
    (v): v is string => v !== null
  );

  for (const answerValue of answerValues) {
    const terms = interestToClubMapping[answerValue] ?? [];
    for (const term of terms) {
      if (clubText.includes(term.toLowerCase())) {
        score += 1;
        break; // count each answer key at most once per club
      }
    }
  }

  return score;
}

function getTopClubs(clubs: Club[], answers: UserAnswers): Club[] {
  const scored = clubs
    .map((club) => ({ club, score: scoreClub(club, answers) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // If fewer than 5 scored clubs, pad with unscored ones
  if (scored.length < 5) {
    const scoredIds = new Set(scored.map(({ club }) => club.id));
    const unscored = clubs
      .filter((c) => !scoredIds.has(c.id))
      .slice(0, 5 - scored.length)
      .map((club) => ({ club, score: 0 }));
    return [...scored, ...unscored].slice(0, 5).map(({ club }) => club);
  }

  return scored.slice(0, 5).map(({ club }) => club);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecruitingDot({ status }: { status: Club["recruitingStatus"] }) {
  const colorMap: Record<Club["recruitingStatus"], string> = {
    open: "bg-green-400",
    upcoming: "bg-yellow-400",
    closed: "bg-red-400",
  };
  const labelMap: Record<Club["recruitingStatus"], string> = {
    open: "Open",
    upcoming: "Upcoming",
    closed: "Closed",
  };
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-2 h-2 rounded-full ${colorMap[status]}`} />
      <span className="text-[11px] text-white/50">{labelMap[status]}</span>
    </span>
  );
}

function ClubResultCard({ club }: { club: Club }) {
  return (
    <Link
      to={`/clubs/${club.id}`}
      className="block rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 hover:border-[hsl(43_76%_52%)] transition-colors duration-200 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white text-sm leading-tight truncate group-hover:text-[hsl(43_76%_52%)] transition-colors">
            {club.name}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5 truncate">{club.category}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <RecruitingDot status={club.recruitingStatus} />
          <span className="text-[11px] text-[hsl(43_76%_52%)] font-medium">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecommendationChat({ clubs }: RecommendationChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<UserAnswers>({
    goal: null,
    field: null,
    vibe: null,
  });
  // Track which option button is selected per step (for filled styling)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: "bot",
      text: "Hi! 👋 I'll help you find the right club. What's your main goal?",
      options: STEP_1_OPTIONS,
    },
  ]);
  const [recommendations, setRecommendations] = useState<Club[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  function handleReset() {
    setStep(1);
    setAnswers({ goal: null, field: null, vibe: null });
    setSelectedOptions({});
    setRecommendations([]);
    setMessages([
      {
        type: "bot",
        text: "Hi! 👋 I'll help you find the right club. What's your main goal?",
        options: STEP_1_OPTIONS,
      },
    ]);
  }

  function handleOptionSelect(stepNumber: number, option: ChatOption) {
    // Prevent re-selecting in a completed step
    if (selectedOptions[stepNumber] !== undefined) return;

    setSelectedOptions((prev) => ({ ...prev, [stepNumber]: option.value }));

    const newMessages: ChatMessage[] = [
      ...messages,
      { type: "user", text: option.label },
    ];

    if (stepNumber === 1) {
      const updatedAnswers = { ...answers, goal: option.value };
      setAnswers(updatedAnswers);
      newMessages.push({
        type: "bot",
        text: "What field are you into?",
        options: STEP_2_OPTIONS,
      });
      setMessages(newMessages);
      setStep(2);
    } else if (stepNumber === 2) {
      const updatedAnswers = { ...answers, field: option.value };
      setAnswers(updatedAnswers);
      newMessages.push({
        type: "bot",
        text: "What vibe fits you?",
        options: STEP_3_OPTIONS,
      });
      setMessages(newMessages);
      setStep(3);
    } else if (stepNumber === 3) {
      const updatedAnswers = { ...answers, vibe: option.value };
      setAnswers(updatedAnswers);
      const top = getTopClubs(clubs, updatedAnswers);
      setRecommendations(top);
      newMessages.push({
        type: "bot",
        text: "Here are your top matches! 🎯",
      });
      setMessages(newMessages);
      setStep(4);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating trigger button — only shown when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[hsl(43_76%_52%)] px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg hover:bg-[hsl(43_76%_46%)] transition-colors duration-200"
            aria-label="Open club finder chat"
          >
            <MessageCircle className="h-4 w-4" />
            Find your club
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] max-h-[520px] rounded-2xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden"
            aria-label="Club recommendation chat"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[hsl(43_76%_52%)]" />
                <span className="text-sm font-semibold text-white tracking-tight">
                  Club Finder
                </span>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md p-1 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
              {messages.map((msg, idx) => {
                // Determine which step this bot message with options belongs to
                const botMessageStepIndex =
                  msg.type === "bot" && msg.options
                    ? messages
                        .slice(0, idx + 1)
                        .filter((m) => m.type === "bot" && (m as BotMessage).options)
                        .length
                    : null;

                return (
                  <div key={idx}>
                    {msg.type === "bot" ? (
                      <div className="flex flex-col items-start gap-2">
                        {/* Bot bubble */}
                        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-sm text-white leading-relaxed">
                          {msg.text}
                        </div>

                        {/* Option buttons */}
                        {msg.options && botMessageStepIndex !== null && (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {msg.options.map((opt) => {
                              const isSelected =
                                selectedOptions[botMessageStepIndex] === opt.value;
                              const stepLocked =
                                selectedOptions[botMessageStepIndex] !== undefined;

                              return (
                                <button
                                  key={opt.value}
                                  onClick={() =>
                                    handleOptionSelect(botMessageStepIndex, opt)
                                  }
                                  disabled={stepLocked}
                                  className={[
                                    "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                                    isSelected
                                      ? "border-[hsl(43_76%_52%)] bg-[hsl(43_76%_52%)] text-zinc-900"
                                      : stepLocked
                                      ? "border-white/10 text-white/30 cursor-not-allowed"
                                      : "border-white/20 text-white hover:border-[hsl(43_76%_52%)] hover:text-[hsl(43_76%_52%)]",
                                  ].join(" ")}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* User bubble — right-aligned gold */
                      <div className="flex justify-end">
                        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-[hsl(43_76%_52%)] px-3 py-2 text-xs font-medium text-zinc-900 leading-relaxed">
                          {msg.text}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Club results */}
              {step === 4 && recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2 mt-1"
                >
                  {recommendations.map((club) => (
                    <ClubResultCard key={club.id} club={club} />
                  ))}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-2 pb-1">
                    <button
                      onClick={handleReset}
                      className="text-xs text-white/50 hover:text-white transition-colors underline underline-offset-2"
                    >
                      Start over
                    </button>
                    <Link
                      to="/clubs"
                      className="flex items-center gap-1 text-xs text-[hsl(43_76%_52%)] hover:text-[hsl(43_76%_46%)] transition-colors font-medium"
                    >
                      Browse all clubs
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Empty results state */}
              {step === 4 && recommendations.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <p className="text-sm text-white/50 mb-3">
                    No exact matches found, but you might enjoy these.
                  </p>
                  <Link
                    to="/clubs"
                    className="flex items-center justify-center gap-1 text-xs text-[hsl(43_76%_52%)] font-medium hover:underline"
                  >
                    Browse all clubs <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={handleReset}
                    className="block mt-2 mx-auto text-xs text-white/40 hover:text-white transition-colors underline underline-offset-2"
                  >
                    Start over
                  </button>
                </motion.div>
              )}

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
