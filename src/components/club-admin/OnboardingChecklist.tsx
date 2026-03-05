import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Image, FileText, Link2, Calendar, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClubOwnership } from '@/hooks/useClubOwnership';
import { useExternalClubRecord } from '@/hooks/useExternalClubRecord';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  href: string;
  ctaText: string;
}

interface OnboardingChecklistProps {
  club: ClubOwnership;
}

export function OnboardingChecklist({ club }: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasEvents, setHasEvents] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const { club: clubRecord, loading: loadingClub } = useExternalClubRecord(club.clubId);

  useEffect(() => {
    const checkEvents = async () => {
      if (!club.clubId) return;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&select=id&limit=1&filters=${encodeURIComponent(JSON.stringify({ club_handle: club.clubName }))}`,
          { headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        if (response.ok) {
          const result = await response.json();
          if (result.data?.length > 0) setHasEvents(true);
        }
      } catch { /* silent */ } finally { setLoadingEvents(false); }
    };
    checkEvents();
  }, [club.clubId, club.clubName]);

  const isLoading = loadingClub || loadingEvents;

  const checklistItems: ChecklistItem[] = [
    { id: 'cover-image', title: 'Upload a cover image', description: 'Add a visual identity to your club profile', icon: Image, completed: !!clubRecord?.cover_image, href: `/club-admin/clubs/${club.clubId}/edit`, ctaText: 'Add Image' },
    { id: 'description', title: 'Add a description', description: 'Tell students what your club is about', icon: FileText, completed: !!clubRecord?.description && clubRecord.description.length > 20, href: `/club-admin/clubs/${club.clubId}/edit`, ctaText: 'Write Description' },
    { id: 'social-links', title: 'Connect social links', description: 'Instagram, LinkedIn, or website', icon: Link2, completed: !!(clubRecord?.instagram || clubRecord?.linkedin || clubRecord?.website), href: `/club-admin/clubs/${club.clubId}/edit`, ctaText: 'Add Links' },
    { id: 'first-event', title: 'Submit your first event', description: 'Start promoting your club activities', icon: Calendar, completed: hasEvents, href: `/submit-event?club=${club.clubId}`, ctaText: 'Create Event' },
  ];

  const completedCount = checklistItems.filter(i => i.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (completedCount === totalCount && !isLoading) return null;

  return (
    <div
      className="rounded-2xl mb-6 overflow-hidden"
      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle
                cx="20" cy="20" r="17" fill="none"
                stroke="hsl(43 74% 56%)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 17}`}
                strokeDashoffset={`${2 * Math.PI * 17 * (1 - progressPercent / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white tracking-tight">Complete your club setup</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isLoading ? 'Checking progress…' : `${totalCount - completedCount} step${totalCount - completedCount !== 1 ? 's' : ''} remaining`}
            </p>
          </div>
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-zinc-600" />
          : <ChevronDown className="w-4 h-4 text-zinc-600" />}
      </button>

      {/* Thin progress line */}
      <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full"
          style={{ background: 'hsl(43 74% 56%)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Items */}
      <AnimatePresence>
        {isExpanded && !isLoading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <ul className="px-3 py-3 space-y-1">
              {checklistItems.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  {item.completed ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(234,179,8,0.12)' }}>
                        <Check className="w-3.5 h-3.5 text-gold" />
                      </div>
                      <span className="text-sm text-zinc-600 line-through">{item.title}</span>
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className="group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <item.icon className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="text-xs text-zinc-600">{item.description}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-500 group-hover:text-white transition-colors flex items-center gap-1">
                        {item.ctaText}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
