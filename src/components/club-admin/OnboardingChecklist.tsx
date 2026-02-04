import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Circle, Image, FileText, Link2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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

  // Check if club has any events via edge function
  useEffect(() => {
    const checkEvents = async () => {
      if (!club.clubId) return;
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&select=id&limit=1&filters=${encodeURIComponent(JSON.stringify({ club_handle: club.clubName }))}`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            setHasEvents(true);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingEvents(false);
      }
    };

    checkEvents();
  }, [club.clubId]);

  const isLoading = loadingClub || loadingEvents;

  // Build checklist items based on club data
  const checklistItems: ChecklistItem[] = [
    {
      id: 'cover-image',
      title: 'Upload a cover image',
      description: 'Add a visual identity to your club profile',
      icon: Image,
      completed: !!clubRecord?.cover_image,
      href: `/club-admin/clubs/${club.clubId}/edit`,
      ctaText: 'Add Image',
    },
    {
      id: 'description',
      title: 'Add a description',
      description: 'Tell students what your club is about',
      icon: FileText,
      completed: !!clubRecord?.description && clubRecord.description.length > 20,
      href: `/club-admin/clubs/${club.clubId}/edit`,
      ctaText: 'Add Description',
    },
    {
      id: 'social-links',
      title: 'Add social links',
      description: 'Connect your Instagram, LinkedIn, or website',
      icon: Link2,
      completed: !!(clubRecord?.instagram || clubRecord?.linkedin || clubRecord?.website),
      href: `/club-admin/clubs/${club.clubId}/edit`,
      ctaText: 'Add Links',
    },
    {
      id: 'first-event',
      title: 'Submit your first event',
      description: 'Start promoting your club activities',
      icon: Calendar,
      completed: hasEvents,
      href: `/submit-event?club=${club.clubId}`,
      ctaText: 'Create Event',
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  // Don't show if everything is complete
  if (isComplete && !isLoading) {
    return null;
  }

  return (
    <div className="premium-card p-4 mb-6 border-gold/20">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{
                background: `conic-gradient(hsl(var(--gold)) ${progressPercent}%, hsl(var(--muted)) ${progressPercent}%)`,
              }}
            >
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                {isLoading ? (
                  <Circle className="w-4 h-4 text-muted-foreground animate-pulse" />
                ) : (
                  <span className="text-xs font-medium text-foreground">
                    {completedCount}/{totalCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Complete your club setup
            </h3>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? 'Checking progress...'
                : isComplete
                ? 'All done! 🎉'
                : `${totalCount - completedCount} step${totalCount - completedCount > 1 ? 's' : ''} remaining`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Progress bar */}
      <Progress value={isLoading ? 0 : progressPercent} className="h-1 mt-3" />

      {/* Expandable checklist */}
      <AnimatePresence>
        {isExpanded && !isLoading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="mt-4 space-y-2">
              {checklistItems.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    item.completed
                      ? 'bg-green-500/5 border border-green-500/20'
                      : 'bg-muted/30 border border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.completed
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.completed ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <item.icon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          item.completed ? 'text-green-600 line-through' : 'text-foreground'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  {!item.completed && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={item.href}>{item.ctaText}</Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
