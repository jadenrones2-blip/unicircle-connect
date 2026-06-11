import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronRight, Minus, Plus, Loader2, Briefcase, Cpu } from 'lucide-react';

const TEMPLATES: Record<string, { label: string; icon: React.ReactNode; stages: string[] }> = {
  professional: {
    label: 'Professional / Business',
    icon: <Briefcase className="w-5 h-5 text-gold" />,
    stages: ['Info Session', 'Networking Night', 'Case Study', 'Interviews'],
  },
  tech: {
    label: 'Product / Tech',
    icon: <Cpu className="w-5 h-5 text-gold" />,
    stages: ['Info Night', 'Alumni Night', 'Pitch Prep', 'Interviews'],
  },
  custom: {
    label: 'Build my own',
    icon: (
      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    stages: ['Screening', 'Interview', 'Decision'],
  },
};

const DEFAULT_FALLBACK = ['Screening', 'Interview', 'Decision', 'Final Review', 'Offer', 'Onboarding'];

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
  const [stageNames, setStageNames] = useState(TEMPLATES.professional.stages);
  const [saving, setSaving] = useState(false);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const pickTemplate = (key: string) => {
    setStageNames([...TEMPLATES[key].stages]);
    go(1);
  };

  const adjustCount = (delta: number) => {
    const next = Math.max(1, Math.min(6, stageNames.length + delta));
    setStageNames((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push(DEFAULT_FALLBACK[arr.length] ?? `Round ${arr.length + 1}`);
      return arr.slice(0, next);
    });
  };

  const handleLaunch = async () => {
    setSaving(true);
    await enableRecruitment().catch(() => {});
    await createStages(stageNames).catch(() => {});
    setSaving(false);
    // createStages calls setStages internally → parent re-renders → wizard unmounts automatically
  };

  const allStages = ['Applied', ...stageNames];

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 py-8">
      {/* Progress */}
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

        {/* ── Step 0: Welcome + template picker ─────────────────────────── */}
        {step === 0 && (
          <motion.div
            key="s0"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-xl flex flex-col gap-7"
          >
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                Set up your recruitment pipeline
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Pick a starting point for {clubName}'s process — you can customize every stage after.
              </p>
            </div>

            <div className="grid gap-3">
              {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => pickTemplate(key)}
                  className="flex items-start gap-4 p-4 rounded-xl border border-white/8 bg-zinc-900/60 hover:bg-zinc-900 hover:border-white/15 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                    {tmpl.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white">{tmpl.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                        Applied
                      </span>
                      {tmpl.stages.map((s) => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Step 1: Stage editor ───────────────────────────────────────── */}
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
              <h2 className="text-xl font-display font-bold text-white mb-1">Customize your stages</h2>
              <p className="text-sm text-zinc-400">
                Rename any stage or adjust how many rounds you have. Applicants always start in{' '}
                <span className="text-zinc-300">Applied</span>.
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
                  disabled={stageNames.length >= 6}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stage list */}
            <div className="space-y-2">
              {/* Applied — locked */}
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/8 bg-zinc-900"
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
                    placeholder={`Stage ${i + 2}`}
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

        {/* ── Step 2: Preview + launch ───────────────────────────────────── */}
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
                      i === 0
                        ? 'bg-gold/10 border-gold/25'
                        : 'bg-zinc-900 border-white/10'
                    }`}
                  >
                    <span
                      className={`text-[9px] font-bold tracking-widest uppercase ${
                        i === 0 ? 'text-gold' : 'text-zinc-600'
                      }`}
                    >
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

            <p className="text-xs text-zinc-600 text-center">
              You can rename, reorder, and add more stages anytime from Settings.
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
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
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
