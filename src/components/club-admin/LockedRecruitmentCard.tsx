import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { WaitlistModal } from './WaitlistModal';

interface LockedRecruitmentCardProps {
  clubId: string;
}

// Fake kanban data for the blurred preview
const FAKE_PIPELINE = [
  { label: 'Applied', count: 48, items: ['Sofia R.', 'James K.', 'Priya M.', 'Tom W.'] },
  { label: 'Reviewing', count: 21, items: ['Aisha J.', 'Carlos D.', 'Nina P.'] },
  { label: 'Accepted', count: 6, items: ['Marcus L.', 'Zoe C.'] },
];

export function LockedRecruitmentCard({ clubId }: LockedRecruitmentCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.015, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative rounded-2xl overflow-hidden cursor-pointer col-span-full"
        style={{
          background: '#0D0D0D',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
        }}
        onClick={() => setModalOpen(true)}
      >
        {/* Beta badge */}
        <div className="absolute top-4 right-4 z-20">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.15em] uppercase border border-gold/50 text-gold bg-gold/10">
            Beta
          </span>
        </div>

        {/* Blurred kanban preview */}
        <div className="relative p-5 pb-0 select-none pointer-events-none">
          <div className="flex gap-3 blur-sm opacity-25">
            {FAKE_PIPELINE.map((col) => (
              <div key={col.label} className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-zinc-400 tracking-wide uppercase">{col.label}</span>
                  <span className="text-[10px] text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded-full">{col.count}</span>
                </div>
                <div className="space-y-1.5">
                  {col.items.map((name) => (
                    <div
                      key={name}
                      className="px-3 py-2 rounded-lg text-xs text-zinc-300 font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {name}
                    </div>
                  ))}
                  <div
                    className="px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Gradient fade at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16"
            style={{ background: 'linear-gradient(to bottom, transparent, #0D0D0D)' }}
          />
        </div>

        {/* Overlay CTA */}
        <div className="relative z-10 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Lock className="w-4 h-4 text-zinc-400" />
          </div>

          <h3 className="text-xl font-display font-bold text-white tracking-tight mb-2 leading-snug max-w-sm mx-auto">
            Automate your next cycle with<br />
            <span className="text-gold">Absolute Precision.</span>
          </h3>

          <p className="text-sm text-zinc-500 mb-6 max-w-xs mx-auto leading-relaxed">
            Structured intake, drag-and-drop pipelines, automated scoring, and applicant notifications — all in one place.
          </p>

          <button
            className="inline-flex items-center gap-2 bg-gold text-zinc-900 text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-gold/90 active:scale-[0.98] transition-all"
            onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
          >
            Request Exclusive Access
          </button>
        </div>
      </motion.div>

      <WaitlistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clubId={clubId}
      />
    </>
  );
}
