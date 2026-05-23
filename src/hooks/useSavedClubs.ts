import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SavedClub {
  id: string;
  user_id: string;
  club_id: string;
  club_name: string;
  created_at: string;
}

export function useSavedClubs() {
  const [savedClubs, setSavedClubs] = useState<SavedClub[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedClubs = useCallback(async (userId: string): Promise<SavedClub[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_clubs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const clubs = (data || []) as SavedClub[];
      setSavedClubs(clubs);
      return clubs;
    } catch (err) {
      console.error('Error fetching saved clubs:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveClub = useCallback(async (userId: string, clubId: string, clubName: string) => {
    try {
      const { error } = await supabase
        .from('saved_clubs')
        .insert({ user_id: userId, club_id: clubId, club_name: clubName });

      if (error) {
        if (error.code === '23505') return { success: true }; // Already saved
        throw error;
      }
      setSavedClubs((prev) => [
        {
          id: '',
          user_id: userId,
          club_id: clubId,
          club_name: clubName,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      return { success: true };
    } catch (err) {
      console.error('Error saving club:', err);
      return { success: false, error: 'Failed to save club' };
    }
  }, []);

  const unsaveClub = useCallback(async (userId: string, clubId: string) => {
    try {
      const { error } = await supabase
        .from('saved_clubs')
        .delete()
        .eq('user_id', userId)
        .eq('club_id', clubId);

      if (error) throw error;
      setSavedClubs((prev) => prev.filter((s) => s.club_id !== clubId));
      return { success: true };
    } catch (err) {
      console.error('Error unsaving club:', err);
      return { success: false, error: 'Failed to unsave club' };
    }
  }, []);

  const isSaved = useCallback(
    (clubId: string) => savedClubs.some((s) => s.club_id === clubId),
    [savedClubs]
  );

  return { savedClubs, loading, fetchSavedClubs, saveClub, unsaveClub, isSaved };
}
