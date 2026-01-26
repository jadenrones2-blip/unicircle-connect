import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ClubOwnership {
  clubId: string;
  clubName: string;
  email: string;
  verifiedAt: string;
}

export function useClubOwnership() {
  const { user } = useAuth();
  const [ownedClubs, setOwnedClubs] = useState<ClubOwnership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnedClubs = async () => {
      if (!user) {
        setOwnedClubs([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('club_owners')
          .select('club_id, club_name, email, verified_at')
          .eq('user_id', user.id);

        if (error) throw error;

        setOwnedClubs(
          (data || []).map((row) => ({
            clubId: row.club_id,
            clubName: row.club_name,
            email: row.email,
            verifiedAt: row.verified_at,
          }))
        );
      } catch (err) {
        console.error('Error fetching owned clubs:', err);
        setOwnedClubs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnedClubs();
  }, [user]);

  const isOwnerOf = (clubId: string): boolean => {
    return ownedClubs.some((club) => club.clubId === clubId);
  };

  const checkOwnershipByEmail = async (email: string, clubId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('club_owners')
        .select('id')
        .eq('email', email)
        .eq('club_id', clubId)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  return {
    ownedClubs,
    loading,
    isOwnerOf,
    checkOwnershipByEmail,
  };
}
