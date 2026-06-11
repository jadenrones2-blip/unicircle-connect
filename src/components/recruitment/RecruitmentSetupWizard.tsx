import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronRight, Minus, Plus, Loader2 } from 'lucide-react';

const DEFAULT_STAGES = ['Round 1', 'Round 2', 'Round 3'];
const FALLBACK_NAMES = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6', 'Round 7', 'Round 8'];

const variants = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
};

interface Props {
  clubName: string;
  createStages: (labels: string[]) => Promise<boolean>;
  enableRecruitment: () => Promise<boolean>;
}

export function RecruitmentSetupWizard({ clubName, createStages, enableRecruitment }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [stageNames, setStageNames] = useState([...DEFAULT_STAGES]);
  const [saving, setSaving] = useState(false);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const adjustCount = (delta: number) => {
    const next = Math.max(1, Math.min(8, stageNames.length + delta));
    setStageNames((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push(FALLBACK_NAMES[arr.length] ?? `Round ${arr.length + 1}`);
      return arr.slice(0, next);
    });
  };

  const handleLaunch = async () => {
    setSaving(true);
    await enableRecruitment().catch(() => {});
    await createStages(stageNames).catch(() => {});
    setSaving(false);
    // createStages updates stages state internally → parent re-renders → wizard unmounts
  };

  const allStages = ['Applied', ...stageNames];

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 py-8">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-12">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 h-1.5 ${
              i === step ? 'w-8 bg-gold' : i < step ? 'w-4 bg-gold/40' : 'w-4 bg-white/10'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={dir}>

        {/* ── Step 0: Welcome ──────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div
            key="s0"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md text-center flex flex-col items-center gap-7"
          >
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                Build your recruitment pipeline
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Every org runs recruitment differently. Name your rounds exactly
                the way your process works — you can change everything later.
              </p>
            </div>
            <button
              onClick={() => go(1)}
              className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-zinc-900 font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              Get started <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── Step 1: Stage builder ──────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="s1"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md flex flex-col gap-5"
          >
            <div>
              <h2 className="text-xl font-display font-bold text-white mb-1">Name your rounds</h2>
              <p className="text-sm text-zinc-400">
                Applicants always start in <span className="text-zinc-300">Applied</span>. Add the
                rounds they move through after that.
              </p>
            </div>

            {/* Count stepper */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-400 flex-1">Number of rounds</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustCount(-1)}
                  disabled={stageNames.length <= 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-white font-semibold w-5 text-center tabular-nums">
                  {stageNames.length}
                </span>
                <button
                  onClick={() => adjustCount(1)}
                  disabled={stageNames.length >= 8}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stage inputs */}
            <div className="space-y-2">
              {/* Applied — always locked as intake */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/5 bg-zinc-900/40">
                <span className="w-5 h-5 rounded-full bg-gold/10 border border-gold/20 text-[10px] font-bold text-gold flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="flex-1 text-sm text-zinc-500">Applied</span>
                <span className="text-[10px] text-zinc-600 font-medium tracking-wide uppercase">
                  Intake
                </span>
              </div>

              {stageNames.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/8 bg-zinc-900 focus-within:border-white/20 transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400 flex items-center justify-center shrink-0">
                    {i + 2}
                  </span>
                  <input
                    value={name}
                    onChange={(e) => {
                      const next = [...stageNames];
                      next[i] = e.target.value;
                      setStageNames(next);
                    }}
                    placeholder="e.g. Info Session, Interview, Final Round…"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button onClick={() => go(0)} className="text-xs text-zinc-500 hover:text-white transition-colors">
                ← Back
              </button>
              <button
                onClick={() => go(2)}
                disabled={stageNames.some((s) => !s.trim())}
                className="flex items-center gap-2 bg-gold hover:bg-gold/90 disabled:opacity-40 text-zinc-900 font-semibold text-sm px-5 py-2 rounded-xl transition-colors"
              >
                Preview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Preview + launch ────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="s2"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-2xl flex flex-col gap-7"
          >
            <div className="text-center">
              <h2 className="text-xl font-display font-bold text-white mb-1">Your pipeline</h2>
              <p className="text-sm text-zinc-400">
                This is how applicants move through {clubName}'s process.
              </p>
            </div>

            {/* Pipeline preview */}
            <div className="flex items-center gap-2 overflow-x-auto py-3 px-1 justify-start sm:justify-center">
              {allStages.map((stage, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex flex-col items-center gap-1 px-5 py-4 rounded-xl border ${
                      i === 0 ? 'bg-gold/10 border-gold/25' : 'bg-zinc-900 border-white/10'
                    }`}
                  >
                    <span className={`text-[9px] font-bold tracking-widest uppercase ${i === 0 ? 'text-gold' : 'text-zinc-600'}`}>
                      {i === 0 ? 'Intake' : `Round ${i}`}
                    </span>
                    <span className="text-sm font-semibold text-white whitespace-nowrap">{stage}</span>
                  </div>
                  {i < allStages.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-500 text-center">
              Each stage gets a QR check-in code — students scan at the event and advance automatically.
            </p>

            <div className="flex items-center justify-between">
              <button onClick={() => go(1)} className="text-xs text-zinc-500 hover:text-white transition-colors">
                ← Back
              </button>
              <button
                onClick={handleLaunch}
                disabled={saving}
                className="flex items-center gap-2 bg-gold hover:bg-gold/90 disabled:opacity-60 text-zinc-900 font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors min-w-[160px] justify-center"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                ) : (
                  'Launch pipeline'
                )}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
