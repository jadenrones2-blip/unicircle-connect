import { useState, useEffect, useCallback } from "react";
import { dataClient } from "@/integrations/supabase/dataClient";
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
      .replace(/\s+/g, " ")
      .trim()
      .replace(/( at)+$/i, "")
      .trim();

  const cleanClubName = (name: string): string => {
    let cleaned = cleanText(name);
    cleaned = cleaned.replace(/\)\s+[A-Za-z]{1,4}$/, ')');
    cleaned = cleaned.replace(/\s+[Cc]lub$/i, '');
    cleaned = cleaned.replace(/\s+(Pre|Pro|The|And|For|With|Of|At|In|On|To|By|Or|As|An|A)$/i, '');
    cleaned = cleaned.replace(/\s+[A-Za-z]{1,2}$/, '');
    return cleaned;
  };

  const recruitingStatus: RecruitingStatus = "closed";
  const category = cleanText(record.category);
  const categoryBucket = cleanText(record.category_bucket);
  const tags: string[] = [];
  if (category) tags.push(category);

  return {
    id: cleanText(record.id || ""),
    name: cleanClubName(String(record.name ?? "")),
    category,
    categoryBucket,
    description: cleanText(record.description),
    memberCount: 0,
    imageUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop",
    tags,
    recruitingStatus,
    meetingSchedule: "TBD",
    email: cleanText(record.email),
    instagram: cleanText(record.instagram),
    website: cleanText(record.website),
  };
};

// Transform external DB event record to app Event type
const transformEvent = (record: Record<string, unknown>, clubs: Club[]): Event => {
  const rawType = String(record.type || record.event_type || "event").toLowerCase();
  let type: Event["type"] = "event";
  if (rawType.includes("recruit")) type = "recruitment";
  else if (rawType.includes("workshop")) type = "workshop";
  else if (rawType.includes("social")) type = "social";

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
      const { data: records, error: dbError } = await dataClient
        .from('clubs')
        .select('*')
        .order('name', { ascending: true })
        .limit(500);

      if (dbError) throw new Error(dbError.message);

      const clubs = (records || []).map(transformClub);
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
      const { data: records, error: dbError } = await dataClient
        .from('events')
        .select('*')
        .limit(100);

      if (dbError) {
        // Gracefully handle missing table
        if (dbError.code === 'PGRST205' || dbError.message?.includes('does not exist')) {
          console.log("Events table not available - returning empty");
          setData([]);
          return;
        }
        throw new Error(dbError.message);
      }

      const events = (records || []).map((record) =>
        transformEvent(record as Record<string, unknown>, clubs)
      );
      setData(events);
    } catch (err) {
      console.error("Error fetching events:", err);
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
    const { error: dbError } = await dataClient
      .from('interests')
      .insert({
        name: data.name,
        email: data.email,
        club_id: data.clubId,
        club_name: data.clubName,
        message: data.message || null,
      });

    if (dbError) throw new Error(dbError.message);
    return { success: true };
  } catch (err) {
    console.error("Error submitting interest:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit",
    };
  }
}
