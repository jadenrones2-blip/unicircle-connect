import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Clock, GraduationCap, Globe, Building, Briefcase, Users, Star, Trophy, Cpu, Crown, Music, Palette, Dumbbell, type LucideIcon } from "lucide-react";
import type { Club, RecruitingStatus } from "@/data/mockData";
import { useClubEnrichment } from "@/contexts/ClubsContext";

interface ClubCardProps {
  club: Club;
  isSaved?: boolean;
  onToggleSave?: (clubId: string) => void;
  matchScore?: number;
  reason?: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  academic: GraduationCap,
  cultural: Globe,
  fraternity: Building,
  'greek life': Building,
  professional: Briefcase,
  service: Heart,
  social: Users,
  sorority: Crown,
  spiritual: Star,
  sports: Trophy,
  'tech / stem': Cpu,
  tech: Cpu,
  stem: Cpu,
  music: Music,
  arts: Palette,
  fitness: Dumbbell,
};

function getCategoryIcon(category: string): LucideIcon {
  const key = category.toLowerCase().trim();
  return CATEGORY_ICONS[key] ?? Users;
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

const TIME_COLORS: Record<string, string> = {
  Light: '#4ade80',
  Medium: '#facc15',
  Heavy: '#f87171',
};

const ClubCardComponent = ({ club, isSaved, onToggleSave, matchScore, reason }: ClubCardProps) => {
  const categoryColor = getCategoryColor(club.categoryBucket || club.category || '');
  const CategoryIcon = getCategoryIcon(club.categoryBucket || club.category || '');
  const enrichment = useClubEnrichment(club.id);
  const photo = enrichment?.instagram_photo_url || (club as any).cover_image;
  const description = enrichment?.one_liner || club.description;

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
        {/* Club photo or colorful gradient header */}
        {photo ? (
          <div className="h-32 w-full shrink-0 overflow-hidden relative">
            <img
              src={photo}
              alt={club.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(17,17,17,0.7) 100%)' }}
            />
          </div>
        ) : (
          <div
            className="h-32 w-full shrink-0 relative overflow-hidden flex items-end px-5 pb-4"
            style={{
              background: `radial-gradient(ellipse at 85% -20%, ${categoryColor}40, transparent 55%), radial-gradient(ellipse at 10% 120%, ${categoryColor}20, transparent 50%), linear-gradient(160deg, ${categoryColor}18 0%, transparent 70%)`,
              borderBottom: `1px solid ${categoryColor}22`,
            }}
          >
            {/* Large watermark icon */}
            <CategoryIcon
              className="absolute -right-3 -top-3 w-28 h-28 pointer-events-none"
              style={{ color: `${categoryColor}22`, strokeWidth: 1 }}
            />
            {/* Small accent dot */}
            <div className="absolute top-5 right-[4.5rem] w-1.5 h-1.5 rounded-full" style={{ background: `${categoryColor}50` }} />
            {/* Club initial badge */}
            <div
              className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${categoryColor}22`, border: `1px solid ${categoryColor}45` }}
            >
              <span className="text-lg font-black leading-none select-none" style={{ color: categoryColor }}>
                {club.name[0]}
              </span>
            </div>
          </div>
        )}

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
              {enrichment?.time_commitment && (
                <span
                  className="text-[10px] font-semibold flex items-center gap-0.5"
                  style={{ color: TIME_COLORS[enrichment.time_commitment] ?? '#71717a' }}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {enrichment.time_commitment}
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

          {/* One-liner or description */}
          {description ? (
            <p className="text-xs text-zinc-500 line-clamp-3 flex-1 mb-3 leading-relaxed">
              {description}
            </p>
          ) : (
            <div className="flex-1 mb-3" />
          )}

          {/* Vibe tags from enrichment */}
          {enrichment?.vibe && (
            <div className="flex flex-wrap gap-1 mb-3">
              {enrichment.vibe.split(',').map(v => v.trim()).filter(Boolean).map((v, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: `${categoryColor}15`,
                    color: categoryColor,
                    border: `1px solid ${categoryColor}30`,
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
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
