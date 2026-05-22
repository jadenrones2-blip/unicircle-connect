import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Briefcase, Star, ArrowRight, Loader2, MapPin, Clock } from 'lucide-react';
import { dataClient } from '@/integrations/supabase/dataClient';
import { supabase } from '@/integrations/supabase/client';
import type { Club } from '@/data/mockData';

interface FeedItem {
  id: string;
  type: 'event' | 'recruiting' | 'review';
  title: string;
  subtitle: string;
  meta: string | null;
  href: string;
  sortKey: number; // timestamp ms for ordering
}

interface Props {
  clubs: Club[];
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function upcomingLabel(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = d.getTime() - Date.now();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_META = {
  event: { label: 'Event', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: Calendar },
  recruiting: {
    label: 'Recruiting',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.1)',
    icon: Briefcase,
  },
  review: { label: 'Review', color: 'hsl(43,74%,56%)', bg: 'rgba(196,150,28,0.1)', icon: Star },
};

export default function ActivityFeed({ clubs }: Props) {
  const [events, setEvents] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const now = new Date().toISOString();
    const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString();

    Promise.all([
      // Upcoming events in next 2 weeks
      dataClient
        .from('events')
        .select(
          'id, title, corrected_title, start_time, corrected_start_time, location, corrected_location, club_handle, created_at'
        )
        .eq('verified', true)
        .gte('start_time', now)
        .lte('start_time', twoWeeks)
        .order('start_time', { ascending: true })
        .limit(30),
      // Recent reviews across all clubs
      (supabase as any)
        .from('club_reviews')
        .select('id, club_id, rating, body, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ])
      .then(([evRes, rvRes]) => {
        setEvents((evRes.data || []) as any[]);
        setReviews((rvRes.data || []) as any[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];

    // Events
    events.forEach((e) => {
      const title = e.corrected_title || e.title || 'Event';
      const start = e.corrected_start_time || e.start_time;
      const loc = e.corrected_location || e.location;
      items.push({
        id: `event-${e.id}`,
        type: 'event',
        title,
        subtitle: e.club_handle ? `@${e.club_handle}` : 'Campus event',
        meta: [upcomingLabel(start), loc].filter(Boolean).join(' · '),
        href: '/events',
        sortKey: start ? new Date(start).getTime() : 0,
      });
    });

    // Recruiting clubs
    clubs
      .filter((c) => c.recruitingStatus === 'open')
      .forEach((c) => {
        items.push({
          id: `recruiting-${c.id}`,
          type: 'recruiting',
          title: `${c.name} is now recruiting`,
          subtitle: c.category,
          meta: 'Applications open',
          href: `/clubs/${c.id}`,
          sortKey: Date.now() - Math.random() * 86400000 * 3, // blend into feed
        });
      });

    // Reviews
    reviews.forEach((r) => {
      const club = clubs.find((c) => c.id === r.club_id);
      if (!club) return;
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      items.push({
        id: `review-${r.id}`,
        type: 'review',
        title: `New review on ${club.name}`,
        subtitle: `${stars}  ${r.body ? `"${r.body.slice(0, 60)}${r.body.length > 60 ? '…' : ''}"` : ''}`,
        meta: timeAgo(r.created_at),
        href: `/clubs/${club.id}`,
        sortKey: r.created_at ? new Date(r.created_at).getTime() : 0,
      });
    });

    // Sort: events by start time asc, recruiting/reviews blended in
    return items.sort((a, b) => {
      if (a.type === 'event' && b.type === 'event') return a.sortKey - b.sortKey;
      return b.sortKey - a.sortKey;
    });
  }, [events, clubs, reviews]);

  const visible = showAll ? feed : feed.slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading feed…</span>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-10">
        Nothing yet — check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((item) => {
        const { color, bg, icon: Icon, label } = TYPE_META[item.type];
        return (
          <Link
            key={item.id}
            to={item.href}
            className="flex items-start gap-4 p-4 rounded-xl border border-white/[0.06] bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/[0.12] transition-all group"
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: bg, border: `1px solid ${color}30` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-1 group-hover:text-white transition-colors">
                  {item.title}
                </p>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider shrink-0 mt-0.5"
                  style={{ color }}
                >
                  {label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 line-clamp-1 mb-1">{item.subtitle}</p>
              {item.meta && (
                <div className="flex items-center gap-1 text-[11px] text-zinc-600">
                  {item.type === 'event' && <Clock className="w-3 h-3" />}
                  {item.meta}
                </div>
              )}
            </div>

            <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-2" />
          </Link>
        );
      })}

      {!showAll && feed.length > 8 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors border border-white/[0.06] rounded-xl hover:border-white/10 hover:bg-white/[0.02]"
        >
          Show {feed.length - 8} more
        </button>
      )}
    </div>
  );
}
