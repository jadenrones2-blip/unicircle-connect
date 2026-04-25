import { useState, useEffect, useCallback } from 'react';

export interface UCSDEvent {
  id: number;
  title: string;
  description: string;
  tags: string[];
  date: string;
  location: string;
  experience: 'inperson' | 'online' | 'hybrid';
  free: boolean;
  url: string;
  matchScore: number;
  matchReason: string | null;
}

const LOCALIST_URL = 'https://calendar.ucsd.edu/api/2/events';

// Keywords that map interest/area values to event text signals
const INTEREST_EVENT_MAP: Record<string, string[]> = {
  // Goals
  career: ['career', 'internship', 'recruiting', 'networking', 'job', 'employer', 'professional', 'industry'],
  community: ['community', 'social', 'meetup', 'club', 'student org', 'welcome', 'mixer'],
  skills: ['workshop', 'training', 'bootcamp', 'seminar', 'skill', 'learn', 'tutorial'],
  impact: ['volunteer', 'service', 'advocacy', 'sustainability', 'nonprofit', 'social justice'],
  explore: ['expo', 'fair', 'discovery', 'showcase', 'open house', 'info session'],

  // Areas
  'tech / stem': ['tech', 'engineering', 'computer', 'coding', 'software', 'ai', 'data', 'hack', 'stem', 'science'],
  professional: ['business', 'finance', 'consulting', 'entrepreneurship', 'startup', 'investment', 'banking'],
  academic: ['research', 'academic', 'lecture', 'symposium', 'colloquium', 'lab', 'graduate', 'phd'],
  arts: ['art', 'music', 'dance', 'theater', 'creative', 'design', 'film', 'performance', 'gallery'],
  cultural: ['cultural', 'culture', 'heritage', 'identity', 'diversity', 'international', 'global'],
  service: ['volunteer', 'service', 'community', 'nonprofit', 'philanthropy', 'advocacy'],
  sports: ['sport', 'athletic', 'fitness', 'recreation', 'intramural', 'yoga', 'run', 'workout'],
  spiritual: ['spiritual', 'faith', 'meditation', 'mindfulness', 'religion', 'prayer', 'wellness'],
  social: ['social', 'party', 'mixer', 'game', 'trivia', 'food', 'movie', 'hang'],
  'greek life': ['greek', 'fraternity', 'sorority', 'panhellenic', 'rush', 'recruitment'],

  // Career interests
  tech_career: ['tech', 'software', 'engineering', 'google', 'amazon', 'microsoft', 'startup', 'coding'],
  finance_career: ['finance', 'banking', 'investment', 'wall street', 'trading', 'accounting', 'economics'],
  startup_career: ['startup', 'entrepreneurship', 'venture', 'founder', 'pitch', 'innovation'],
  consulting_career: ['consulting', 'strategy', 'case', 'mckinsey', 'bain', 'bcg', 'deloitte'],
  healthcare_career: ['medical', 'health', 'premed', 'clinical', 'hospital', 'nursing', 'pharmacy'],
  research_career: ['research', 'lab', 'graduate', 'phd', 'academic', 'faculty', 'science'],
  creative_career: ['design', 'media', 'creative', 'film', 'art', 'ux', 'content'],
};

function scoreEvent(event: UCSDEvent, interestValues: string[]): { score: number; reason: string | null } {
  const text = [event.title, event.description, ...event.tags].join(' ').toLowerCase();

  let bestScore = 0;
  let bestReason: string | null = null;

  for (const val of interestValues) {
    const terms = INTEREST_EVENT_MAP[val] || [val.toLowerCase()];
    let hits = 0;
    let matchedTerm: string | null = null;

    for (const term of terms) {
      if (text.includes(term.toLowerCase())) {
        hits++;
        if (!matchedTerm && term.length > 3) matchedTerm = term;
      }
    }

    if (hits > 0) {
      const score = Math.min(100, Math.round((hits / terms.length) * 100 * 3));
      if (score > bestScore) {
        bestScore = score;
        // Build a specific reason from the matched term
        if (matchedTerm) {
          bestReason = `Matches your interest in ${matchedTerm}`;
        }
      }
    }
  }

  // Bonus for tags that directly match a specific interest
  for (const tag of event.tags) {
    const tagLower = tag.toLowerCase();
    if (interestValues.some(v => tagLower.includes(v) || v.includes(tagLower))) {
      bestScore = Math.min(100, bestScore + 15);
    }
  }

  return { score: bestScore, reason: bestReason };
}

export function useUCSDEvents(interestValues: string[], limit = 6) {
  const [events, setEvents] = useState<UCSDEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch next 60 days, up to 100 events
      const res = await fetch(`${LOCALIST_URL}?days=60&pp=100`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to fetch UCSD events');

      const data = await res.json();
      const raw = (data.events || []) as any[];

      const mapped: UCSDEvent[] = raw.map((e: any) => ({
        id: e.event.id,
        title: e.event.title || '',
        description: (e.event.description_text || '').slice(0, 300),
        tags: Array.isArray(e.event.tags) ? e.event.tags : [],
        date: e.event.first_date || '',
        location: e.event.location_name || e.event.location || '',
        experience: e.event.experience || 'inperson',
        free: e.event.free ?? true,
        url: e.event.ticket_url || e.event.url || `https://calendar.ucsd.edu/event/${e.event.id}`,
        matchScore: 0,
        matchReason: null,
      }));

      if (interestValues.length > 0) {
        // Score and sort by relevance
        const scored = mapped
          .map((ev) => {
            const { score, reason } = scoreEvent(ev, interestValues);
            return { ...ev, matchScore: score, matchReason: reason };
          })
          .filter((ev) => ev.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, limit);

        setEvents(scored);
      } else {
        // No interests yet — show upcoming events
        setEvents(mapped.slice(0, limit));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [interestValues.join(','), limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
