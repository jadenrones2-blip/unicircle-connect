import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type VerificationState = 'unverified' | 'provisional' | 'verified' | 'suspended';
export type TrustLevel = 'high' | 'medium' | 'low';

export interface ClubRestrictions {
  can_publish_events: boolean;
  can_mass_message: boolean;
  can_add_links: boolean;
}

export interface ClubOwnership {
  clubId: string;
  clubName: string;
  email: string;
  verifiedAt: string;
  verificationState: VerificationState;
  trustLevel: TrustLevel;
  trustScore: number;
  restrictions: ClubRestrictions;
  provisionalUntil: string | null;
}

const DEFAULT_RESTRICTIONS: ClubRestrictions = {
  can_publish_events: false,
  can_mass_message: false,
  can_add_links: false,
};

export function useClubOwnership() {
  const { user, loading: authLoading } = useAuth();
  const [ownedClubs, setOwnedClubs] = useState<ClubOwnership[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeClubId = (clubId: string) => clubId.trim().toLowerCase();

  useEffect(() => {
    let isMounted = true;

    const fetchOwnedClubs = async () => {
      // IMPORTANT: keep loading true while auth is still resolving.
      // Otherwise pages can briefly think "ownershipLoading=false" and redirect/toast incorrectly.
      if (authLoading) {
        if (isMounted) setLoading(true);
        return;
      }

      if (isMounted) setLoading(true);

      if (!user) {
        if (isMounted) {
          setOwnedClubs([]);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('club_owners')
          .select('club_id, club_name, email, verified_at, verification_state, trust_level, trust_score, restrictions, provisional_until')
          .eq('user_id', user.id);

        if (error) throw error;

        if (isMounted) {
          setOwnedClubs(
            (data || []).map((row) => ({
              clubId: row.club_id,
              clubName: row.club_name,
              email: row.email,
              verifiedAt: row.verified_at,
              verificationState: (row.verification_state as VerificationState) || 'verified',
              trustLevel: (row.trust_level as TrustLevel) || 'high',
              trustScore: row.trust_score || 100,
              restrictions: (row.restrictions as unknown as ClubRestrictions) || DEFAULT_RESTRICTIONS,
              provisionalUntil: row.provisional_until,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching owned clubs:', err);
        if (isMounted) setOwnedClubs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOwnedClubs();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const isOwnerOf = (clubId: string): boolean => {
    const target = normalizeClubId(clubId);
    return ownedClubs.some((club) => normalizeClubId(club.clubId) === target);
  };

  const getClubOwnership = (clubId: string): ClubOwnership | undefined => {
    const target = normalizeClubId(clubId);
    return ownedClubs.find((club) => normalizeClubId(club.clubId) === target);
  };

  const canPerformAction = (clubId: string, action: keyof ClubRestrictions): boolean => {
    const club = getClubOwnership(clubId);
    if (!club) return false;
    
    // Verified owners can do everything
    if (club.verificationState === 'verified') return true;
    
    // Suspended owners can do nothing
    if (club.verificationState === 'suspended') return false;
    
    // Provisional owners check restrictions
    return club.restrictions[action] === true;
  };

  const isProvisional = (clubId: string): boolean => {
    const club = getClubOwnership(clubId);
    return club?.verificationState === 'provisional';
  };

  const isVerified = (clubId: string): boolean => {
    const club = getClubOwnership(clubId);
    return club?.verificationState === 'verified';
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

  // Check if any owned club is provisional
  const hasProvisionalClub = ownedClubs.some(club => club.verificationState === 'provisional');
  
  // Check if any owned club is fully verified
  const hasVerifiedClub = ownedClubs.some(club => club.verificationState === 'verified');

  return {
    ownedClubs,
    loading,
    isOwnerOf,
    getClubOwnership,
    canPerformAction,
    isProvisional,
    isVerified,
    hasProvisionalClub,
    hasVerifiedClub,
    checkOwnershipByEmail,
  };
}
