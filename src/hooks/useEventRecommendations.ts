import { useMemo } from 'react';
import { ExternalEvent } from '@/integrations/external-supabase/client';
import { UserInterest } from '@/hooks/useUserInterests';

// Mapping from quiz interests to event/club keywords
const INTEREST_KEYWORD_MAP: Record<string, string[]> = {
  // Superpowers
  network: ['networking', 'social', 'community', 'connect', 'professional'],
  skills: ['workshop', 'training', 'learn', 'development', 'education'],
  squad: ['team', 'group', 'community', 'club', 'organization'],
  
  // Career goals
  tech_career: ['tech', 'engineering', 'software', 'data', 'computer', 'coding', 'stem', 'ai', 'machine learning'],
  finance_career: ['finance', 'business', 'consulting', 'investment', 'economics', 'accounting'],
  healthcare_career: ['health', 'medical', 'pre-med', 'biology', 'wellness', 'nursing'],
  startups_career: ['startup', 'entrepreneur', 'innovation', 'venture', 'founder'],
  
  // Rabbit holes (interests)
  arts: ['art', 'creative', 'design', 'music', 'theater', 'dance', 'film'],
  sports: ['sports', 'fitness', 'athletic', 'recreation', 'gym', 'running', 'basketball'],
  volunteering: ['volunteer', 'service', 'community service', 'philanthropy', 'nonprofit'],
  culture: ['cultural', 'heritage', 'international', 'diversity', 'ethnic'],
  academic: ['academic', 'research', 'study', 'honors', 'scholarship'],
  spiritual: ['spiritual', 'religious', 'faith', 'meditation', 'mindfulness'],
  gaming: ['gaming', 'esports', 'video games', 'game'],
  outdoors: ['outdoor', 'hiking', 'nature', 'adventure', 'camping'],
};

// Category mappings
const CATEGORY_MAP: Record<string, string[]> = {
  tech_career: ['Tech / STEM', 'Professional', 'Academic'],
  finance_career: ['Professional', 'Academic'],
  healthcare_career: ['Academic', 'Professional', 'Service'],
  startups_career: ['Professional', 'Tech / STEM'],
  arts: ['Cultural', 'Social'],
  sports: ['Sports'],
  volunteering: ['Service'],
  culture: ['Cultural'],
  academic: ['Academic'],
  spiritual: ['Spiritual', 'Cultural'],
  gaming: ['Social', 'Tech / STEM'],
  outdoors: ['Sports', 'Social'],
};

interface ScoredEvent extends ExternalEvent {
  score: number;
  matchedInterests: string[];
}

export function useEventRecommendations(
  events: ExternalEvent[],
  interests: UserInterest[],
  maxResults: number = 6
): { recommendedEvents: ScoredEvent[]; hasInterests: boolean } {
  const recommendedEvents = useMemo(() => {
    if (!interests || interests.length === 0 || !events || events.length === 0) {
      return [];
    }

    // Get future events only (verified or null verified)
    const now = new Date();
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      const isVerifiedOrPending = event.verified === true || event.verified === null;
      return eventDate >= now && isVerifiedOrPending;
    });

    // Build list of keywords and categories from user interests
    const userKeywords: string[] = [];
    const userCategories: string[] = [];

    interests.forEach(interest => {
      const value = interest.interest_value.toLowerCase();
      
      // Get keywords for this interest
      const keywords = INTEREST_KEYWORD_MAP[value] || [];
      userKeywords.push(...keywords);

      // Get categories for this interest
      const categories = CATEGORY_MAP[value] || [];
      userCategories.push(...categories);
    });

    // Score each event
    const scoredEvents: ScoredEvent[] = futureEvents.map(event => {
      let score = 0;
      const matchedInterests: string[] = [];

      // Create searchable text from event
      const eventTitle = (event.corrected_title || event.title || '').toLowerCase();
      const eventCaption = (event.caption || '').toLowerCase();
      const eventLocation = (event.corrected_location || event.location || '').toLowerCase();
      const clubHandle = (event.club_handle || '').toLowerCase();
      const searchText = `${eventTitle} ${eventCaption} ${eventLocation} ${clubHandle}`;

      // Score based on keyword matches
      userKeywords.forEach(keyword => {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 2;
          if (!matchedInterests.includes(keyword)) {
            matchedInterests.push(keyword);
          }
        }
      });

      // Bonus for title matches (more relevant)
      userKeywords.forEach(keyword => {
        if (eventTitle.includes(keyword.toLowerCase())) {
          score += 3; // Extra points for title match
        }
      });

      return {
        ...event,
        score,
        matchedInterests,
      };
    });

    // Sort by score (descending), then by date (ascending)
    return scoredEvents
      .filter(e => e.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      })
      .slice(0, maxResults);
  }, [events, interests, maxResults]);

  return {
    recommendedEvents,
    hasInterests: interests && interests.length > 0,
  };
}
