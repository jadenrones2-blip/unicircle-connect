import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Club, Event, RecruitingStatus } from "@/data/mockData";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface UseAirtableResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Transform Airtable club record to app Club type
const transformClub = (record: AirtableRecord): Club => {
  const fields = record.fields;
  
  // Map recruiting status - normalize to lowercase
  const rawStatus = String(fields["Recruiting Status"] || "closed").toLowerCase();
  let recruitingStatus: RecruitingStatus = "closed";
  if (rawStatus === "open" || rawStatus === "actively recruiting") {
    recruitingStatus = "open";
  } else if (rawStatus === "upcoming" || rawStatus === "coming soon") {
    recruitingStatus = "upcoming";
  }

  return {
    id: record.id,
    name: String(fields["Club Name"] || fields["Name"] || ""),
    category: String(fields["Category"] || ""),
    description: String(fields["Description"] || ""),
    memberCount: Number(fields["# Events Hosted"] || 0),
    imageUrl: String(
      // Handle Airtable attachment fields
      Array.isArray(fields["Image"]) && fields["Image"][0]?.url 
        ? fields["Image"][0].url 
        : fields["Image URL"] || "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop"
    ),
    tags: Array.isArray(fields["Tags"]) 
      ? fields["Tags"] as string[]
      : [],
    recruitingStatus,
    meetingSchedule: String(fields["Meeting Notes"] || "TBD"),
    meetingStyle: String(fields["Contact Link"] || ""),
  };
};

// Transform Airtable event record to app Event type
const transformEvent = (record: AirtableRecord, clubs: Club[]): Event => {
  const fields = record.fields;
  
  // Map event type
  const rawType = String(fields["Type"] || fields["type"] || "event").toLowerCase();
  let type: Event["type"] = "event";
  if (rawType.includes("recruit")) {
    type = "recruitment";
  } else if (rawType.includes("workshop")) {
    type = "workshop";
  } else if (rawType.includes("social")) {
    type = "social";
  }

  // Get club reference - Airtable linked records come as array of IDs
  const clubIdField = fields["Club"] || fields["club"];
  const clubId = Array.isArray(clubIdField) ? String(clubIdField[0]) : String(clubIdField || "");
  const club = clubs.find(c => c.id === clubId);

  return {
    id: record.id,
    title: String(fields["Title"] || fields["Name"] || fields["name"] || ""),
    clubId,
    clubName: String(fields["Club Name"] || club?.name || ""),
    date: String(fields["Date"] || fields["date"] || ""),
    time: String(fields["Time"] || fields["time"] || ""),
    location: String(fields["Location"] || fields["location"] || ""),
    type,
    description: String(fields["Description"] || fields["description"] || ""),
    imageUrl: Array.isArray(fields["Image"]) && fields["Image"][0]?.url 
      ? fields["Image"][0].url 
      : String(fields["imageUrl"] || fields["Image URL"] || ""),
  };
};

export function useClubs(): UseAirtableResult<Club> {
  const [data, setData] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClubs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/airtable-proxy?table=clubs`,
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
            ? `Failed to fetch clubs: ${response.status} - ${text}`
            : `Failed to fetch clubs: ${response.status}`
        );
      }

      const result = await response.json();
      const clubs = (result.records || []).map(transformClub);
      setData(clubs);
    } catch (err) {
      console.error("Error fetching clubs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch clubs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  return { data, loading, error, refetch: fetchClubs };
}

export function useEvents(clubs: Club[]): UseAirtableResult<Event> {
  const [data, setData] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (clubs.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/airtable-proxy?table=events`,
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
            ? `Failed to fetch events: ${response.status} - ${text}`
            : `Failed to fetch events: ${response.status}`
        );
      }

      const result = await response.json();
      const events = (result.records || []).map((record: AirtableRecord) =>
        transformEvent(record, clubs)
      );
      setData(events);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [clubs]);

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
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/airtable-proxy?table=interests&action=create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          fields: {
            "Name": data.name,
            "Email": data.email,
            "Notes": `Club: ${data.clubName}${data.message ? `\n\n${data.message}` : ""}`,
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        text
          ? `Failed to submit interest: ${response.status} - ${text}`
          : `Failed to submit interest: ${response.status}`
      );
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
