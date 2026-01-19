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
  // Map recruiting status - normalize to lowercase
  const rawStatus = String(record.recruiting_status || record.recruitingStatus || "closed").toLowerCase();
  let recruitingStatus: RecruitingStatus = "closed";
  if (rawStatus === "open" || rawStatus === "actively recruiting") {
    recruitingStatus = "open";
  } else if (rawStatus === "upcoming" || rawStatus === "coming soon") {
    recruitingStatus = "upcoming";
  }

  return {
    id: String(record.id || ""),
    name: String(record.name || record.club_name || ""),
    category: String(record.category || ""),
    description: String(record.description || ""),
    memberCount: Number(record.member_count || record.memberCount || record.events_hosted || 0),
    imageUrl: String(
      record.image_url || record.imageUrl || 
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop"
    ),
    tags: Array.isArray(record.tags) 
      ? record.tags as string[]
      : typeof record.tags === "string" 
        ? (record.tags as string).split(",").map(t => t.trim())
        : [],
    recruitingStatus,
    meetingSchedule: String(record.meeting_schedule || record.meetingSchedule || "TBD"),
    meetingStyle: String(record.meeting_style || record.meetingStyle || record.contact_link || ""),
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=clubs&select=id,name,category,description,recruiting_status,image_url,member_count,meeting_schedule,tags&order=name.asc&limit=100`,
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

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          text
            ? `Failed to fetch events: ${response.status}`
            : `Failed to fetch events: ${response.status}`
        );
      }

      const result = await response.json();
      const events = (result.data || []).map((record: Record<string, unknown>) =>
        transformEvent(record, clubs)
      );
      setData(events);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch events");
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
