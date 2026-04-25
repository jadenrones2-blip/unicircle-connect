import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import type { Club, RecruitingStatus } from "@/data/mockData";

interface ClubCardProps {
  club: Club;
  isSaved?: boolean;
  onToggleSave?: (clubId: string) => void;
  matchScore?: number;
  reason?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  academic: '#60a5fa',
  cultural: '#fb923c',
  fraternity: '#a78bfa',
  'greek life': '#c084fc',
  professional: '#818cf8',
  service: '#34d399',
  social: '#f472b6',
  sorority: '#fb7185',
  spiritual: '#2dd4bf',
  sports: '#f87171',
  'tech / stem': '#22d3ee',
  tech: '#22d3ee',
  stem: '#22d3ee',
};

function getCategoryColor(category: string): string {
  const key = category.toLowerCase().trim();
  return CATEGORY_COLORS[key] ?? 'hsl(43 74% 56%)'; // default gold
}

const ClubCardComponent = ({ club, isSaved, onToggleSave, matchScore, reason }: ClubCardProps) => {
  const categoryColor = getCategoryColor(club.categoryBucket || club.category || '');

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Link
        to={`/clubs/${club.id}`}
        className="group flex flex-col h-full rounded-2xl overflow-hidden relative"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Top color accent line */}
        <div className="h-[2px] w-full shrink-0" style={{ background: categoryColor }} />

        <div className="flex flex-col flex-1 p-5">
          {/* Category + status row */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: categoryColor }}
            >
              {club.categoryBucket || club.category || 'Club'}
            </span>
            <div className="flex items-center gap-2">
              {matchScore !== undefined && matchScore > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {matchScore}% match
                </span>
              )}
              {club.recruitingStatus === 'open' && (
                <span className="text-[10px] font-medium text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Open
                </span>
              )}
              {club.recruitingStatus === 'upcoming' && (
                <span className="text-[10px] font-medium text-[hsl(43_74%_56%)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(43_74%_56%)] inline-block" />
                  Soon
                </span>
              )}
              {onToggleSave && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(club.id); }}
                  className="transition-colors"
                  aria-label={isSaved ? "Unsave club" : "Save club"}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-zinc-600 hover:text-zinc-300'}`}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <h3 className="font-display text-base font-bold text-white leading-tight mb-2 group-hover:text-[hsl(43_74%_56%)] transition-colors line-clamp-2">
            {club.name}
          </h3>

          {/* Description */}
          {club.description ? (
            <p className="text-xs text-zinc-500 line-clamp-3 flex-1 mb-4 leading-relaxed">
              {club.description}
            </p>
          ) : (
            <div className="flex-1 mb-4" />
          )}

          {/* Reason tag — only shown on recommended shelf */}
          {reason && (
            <p className="text-[11px] text-gold/80 mb-3 leading-snug">
              ✦ {reason}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto">
            <span className="text-[11px] text-zinc-600">View club</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[hsl(43_74%_56%)] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

ClubCardComponent.displayName = "ClubCard";

export default memo(ClubCardComponent);
