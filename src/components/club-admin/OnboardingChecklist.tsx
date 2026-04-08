import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Image, FileText, Link2, Calendar, ClipboardList, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ClubOwnership } from '@/hooks/useClubOwnership';
import { useExternalClubRecord } from '@/hooks/useExternalClubRecord';
import { dataClient } from '@/integrations/supabase/dataClient';
import { supabase } from '@/integrations/supabase/client';

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
  const [hasEvents, setHasEvents] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [hasApplicationForm, setHasApplicationForm] = useState(false);
  const { club: clubRecord, loading: loadingClub } = useExternalClubRecord(club.clubId);

  useEffect(() => {
    const checkEvents = async () => {
      if (!club.clubId) return;
      try {
        const { data } = await dataClient
          .from('events')
          .select('id')
          .eq('club_handle', club.clubId)
          .limit(1);
        if (data && data.length > 0) setHasEvents(true);
      } catch { /* silent */ } finally { setLoadingEvents(false); }
    };
    checkEvents();
  }, [club.clubId]);

  useEffect(() => {
    const checkForm = async () => {
      if (!club.clubId) return;
      try {
        const { data } = await supabase
          .from('application_forms')
          .select('questions')
          .eq('club_id', club.clubId)
          .maybeSingle();
        if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setHasApplicationForm(true);
        }
      } catch { /* silent */ }
    };
    checkForm();
  }, [club.clubId]);

  const isLoading = loadingClub || loadingEvents;

  const checklistItems: ChecklistItem[] = [
    { id: 'cover-image', title: 'Upload a cover image', description: 'Add a visual identity to your club profile', icon: Image, completed: !!clubRecord?.cover_image, href: `/club-admin/clubs/${club.clubId}/edit`, ctaText: 'Add Image' },
    { id: 'description', title: 'Add a description', description: 'Tell students what your club is about', icon: FileText, completed: !!clubRecord?.description && clubRecord.description.length > 20, href: `/club-admin/clubs/${club.clubId}/edit`, ctaText: 'Write Description' },
    { id: 'social-links', title: 'Connect social links', description: 'Instagram, LinkedIn, or website', icon: Link2, completed: !!(clubRecord?.instagram || clubRecord?.linkedin || clubRecord?.website), href: `/club-admin/clubs/${club.clubId}/edit`, ctaText: 'Add Links' },
    { id: 'first-event', title: 'Submit your first event', description: 'Start promoting your club activities', icon: Calendar, completed: hasEvents, href: `/submit-event?club=${club.clubId}`, ctaText: 'Create Event' },
    { id: 'application-form', title: 'Customize your application form', description: 'Add custom questions for applicants to answer', icon: ClipboardList, completed: hasApplicationForm, href: `/club-admin/clubs/${club.clubId}/recruitment`, ctaText: 'Build Form' },
  ];

  const completedCount = checklistItems.filter(i => i.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (completedCount === totalCount && !isLoading) return null;

  return (
    <div className="mb-10 w-full">
      {/* Header row */}
      <div className="flex items-end justify-between mb-1">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-600 mb-1.5">
            Getting Started
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight leading-none">
            Complete your club setup
          </h2>
        </div>

        {/* Circular progress */}
        <div className="relative w-11 h-11 shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
            <motion.circle
              cx="22" cy="22" r="18" fill="none"
              stroke="hsl(43 74% 56%)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 18}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - progressPercent / 100) }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white tabular-nums">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Gold progress bar */}
      <div className="mt-4 mb-2 h-px w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full"
          style={{ background: 'hsl(43 74% 56%)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Task rows — staggered drop-in */}
      {!isLoading && (
        <div className="mt-1 overflow-hidden">
          {checklistItems.map((item, i) => {
            const num = String(i + 1).padStart(2, '0');

            if (item.completed) {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -14, clipPath: 'inset(0 0 100% 0)' }}
                  animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
                  transition={{ delay: i * 0.13, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-5 sm:gap-7 py-4 sm:py-5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-3xl sm:text-4xl font-display font-bold tabular-nums w-10 sm:w-12 shrink-0 select-none"
                    style={{ color: 'rgba(255,255,255,0.08)' }}>
                    {num}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(234,179,8,0.12)' }}
                  >
                    <Check className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <span className="flex-1 text-sm sm:text-base text-zinc-600 line-through">{item.title}</span>
                  <span className="text-[11px] font-semibold tracking-wide text-gold/50 uppercase">Done</span>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -14, clipPath: 'inset(0 0 100% 0)' }}
                animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
                transition={{ delay: i * 0.13, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <Link
                  to={item.href}
                  className="group flex items-center gap-5 sm:gap-7 py-4 sm:py-5 -mx-3 px-3 rounded-xl hover:bg-white/[0.025] transition-all duration-200"
                >
                  <span
                    className="text-3xl sm:text-4xl font-display font-bold tabular-nums w-10 sm:w-12 shrink-0 select-none transition-colors duration-200 group-hover:text-zinc-500"
                    style={{ color: 'rgba(255,255,255,0.08)' }}
                  >
                    {num}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <item.icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-white leading-tight">{item.title}</p>
                    <p className="text-xs text-zinc-600 mt-0.5 truncate">{item.description}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase text-zinc-600 group-hover:text-white transition-colors duration-200 shrink-0">
                    {item.ctaText}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="mt-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-7 py-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="w-12 h-8 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="w-7 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-2.5 w-28 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
