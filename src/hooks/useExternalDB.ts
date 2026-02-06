import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Club, Event, RecruitingStatus } from "@/data/mockData";

interface UseExternalDBResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Transform external DB club record to app Club type
const transformClub = (record: Record<string, unknown>): Club => {
  const cleanText = (value: unknown) =>
    String(value ?? "")
      // Collapse newlines / tabs / repeated spaces so search matches what users see
      .replace(/\s+/g, " ")
      .trim()
      // Remove trailing " at" or " at at" that appears in source data
      .replace(/( at)+$/i, "")
      .trim();

  // Clean club name specifically - remove incomplete parenthetical suffixes and trailing fragments
  const cleanClubName = (name: string): string => {
    let cleaned = cleanText(name);
    // Remove trailing incomplete words after parentheses like "(AIChE) Pre" -> "(AIChE)"
    // Matches: ) followed by space and a short word (1-4 chars) at end
    cleaned = cleaned.replace(/\)\s+[A-Za-z]{1,4}$/, ')');
    // Remove trailing " Club" or " club" that's redundant
    cleaned = cleaned.replace(/\s+[Cc]lub$/i, '');
    // Remove trailing "Pre" which is a data artifact (e.g., "Business Leaders Association Pre")
    cleaned = cleaned.replace(/\s+Pre$/i, '');
    // Remove trailing single letters or very short fragments (1-2 chars)
    cleaned = cleaned.replace(/\s+[A-Za-z]{1,2}$/, '');
    return cleaned;
  };

  // Default to closed recruiting status since this data doesn't have it
  const recruitingStatus: RecruitingStatus = "closed";

  const category = cleanText(record.category);
  const categoryBucket = cleanText(record.category_bucket);

  // Build tags from category if available
  const tags: string[] = [];
  if (category) {
    tags.push(category);
  }

  return {
    id: cleanText(record.id || ""),
    name: cleanClubName(String(record.name ?? "")),
    category,
    categoryBucket, // Used for dropdown filtering
    description: cleanText(record.description),
    memberCount: 0, // Not available in external DB
    imageUrl:
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop",
    tags,
    recruitingStatus,
    meetingSchedule: "TBD",
    // Store additional external fields for potential use
    email: cleanText(record.email),
    instagram: cleanText(record.instagram),
    website: cleanText(record.website),
  };
};

// Transform external DB event record to app Event type
const transformEvent = (record: Record<string, unknown>, clubs: Club[]): Event => {
  // Map event type
  const rawType = String(record.type || record.event_type || "event").toLowerCase();
  let type: Event["type"] = "event";
  if (rawType.includes("recruit")) {
    type = "recruitment";
  } else if (rawType.includes("workshop")) {
    type = "workshop";
  } else if (rawType.includes("social")) {
    type = "social";
  }

  // Get club reference
  const clubId = String(record.club_id || record.clubId || "");
  const club = clubs.find(c => c.id === clubId);

  return {
    id: String(record.id || ""),
    title: String(record.title || record.name || ""),
    clubId,
    clubName: String(record.club_name || record.clubName || club?.name || ""),
    date: String(record.date || record.event_date || ""),
    time: String(record.time || record.event_time || ""),
    location: String(record.location || ""),
    type,
    description: String(record.description || ""),
    imageUrl: String(record.image_url || record.imageUrl || ""),
  };
};

export function useClubs(): UseExternalDBResult<Club> {
  const [data, setData] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=clubs&select=*&orderBy=name&orderAsc=true&limit=500`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          text
            ? `Failed to fetch clubs: ${response.status}`
            : `Failed to fetch clubs: ${response.status}`
        );
      }

      const result = await response.json();
      const clubs = (result.data || []).map(transformClub);
      setData(clubs);
    } catch (err) {
      console.error("Error fetching clubs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch clubs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return { data, loading, error, refetch: fetchClubs };
}

export function useEvents(clubs: Club[]): UseExternalDBResult<Event> {
  const [data, setData] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (clubs.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&select=*&limit=100`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      // Gracefully handle missing table - return empty array
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        // If table doesn't exist, just return empty - not a real error
        if (result.code === "PGRST205" || result.details?.includes("Could not find the table")) {
          console.log("Events table not available in external DB - returning empty");
          setData([]);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const result = await response.json();
      const events = (result.data || []).map((record: Record<string, unknown>) =>
        transformEvent(record, clubs)
      );
      setData(events);
    } catch (err) {
      console.error("Error fetching events:", err);
      // Don't set error state for missing table - just return empty
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [clubs]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { data, loading, error, refetch: fetchEvents };
}

export async function submitInterest(data: {
  name: string;
  email: string;
  clubId: string;
  clubName: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=interests&action=insert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          record: {
            name: data.name,
            email: data.email,
            club_id: data.clubId,
            club_name: data.clubName,
            message: data.message || null,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to submit interest: ${response.status}`);
    }

    return { success: true };
  } catch (err) {
    console.error("Error submitting interest:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Failed to submit" 
    };
  }
}
