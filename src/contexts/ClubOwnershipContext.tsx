import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
  isOwner: boolean;
}

const DEFAULT_RESTRICTIONS: ClubRestrictions = {
  can_publish_events: false,
  can_mass_message: false,
  can_add_links: false,
};

interface ClubOwnershipContextValue {
  ownedClubs: ClubOwnership[];
  loading: boolean;
  isOwnerOf: (clubId: string) => boolean;
  isOfficerOf: (clubId: string) => boolean;
  getClubOwnership: (clubId: string) => ClubOwnership | undefined;
  canPerformAction: (clubId: string, action: keyof ClubRestrictions) => boolean;
  isProvisional: (clubId: string) => boolean;
  isVerified: (clubId: string) => boolean;
  hasProvisionalClub: boolean;
  hasVerifiedClub: boolean;
  checkOwnershipByEmail: (email: string, clubId: string) => Promise<boolean>;
  refresh: () => void;
}

const ClubOwnershipContext = createContext<ClubOwnershipContextValue | null>(null);

const normalize = (id: string) => id.trim().toLowerCase();

export function ClubOwnershipProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [ownedClubs, setOwnedClubs] = useState<ClubOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let isMounted = true;

    const fetch = async () => {
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
        const [ownersRes, officersRes] = await Promise.all([
          supabase
            .from('club_owners')
            .select(
              'club_id, club_name, email, verified_at, verification_state, trust_level, trust_score, restrictions, provisional_until'
            )
            .eq('user_id', user.id),
          (supabase as any)
            .from('club_officers')
            .select('club_id, club_name, email')
            .eq('user_id', user.id),
        ]);

        if (!isMounted) return;
        if (ownersRes.error) throw ownersRes.error;

        // Deduplicate owner rows by normalized clubId — the DB can have duplicate
        // rows (same user, same club_id) which would surface as duplicate cards.
        const ownerSeen = new Set<string>();
        const ownerClubs: ClubOwnership[] = (ownersRes.data || [])
          .filter((row: any) => {
            const key = normalize(row.club_id);
            if (ownerSeen.has(key)) return false;
            ownerSeen.add(key);
            return true;
          })
          .map((row: any) => ({
            clubId: row.club_id,
            clubName: row.club_name,
            email: row.email,
            verifiedAt: row.verified_at || '',
            verificationState: (row.verification_state as VerificationState) || 'verified',
            trustLevel: (row.trust_level as TrustLevel) || 'high',
            trustScore: row.trust_score || 100,
            restrictions: (row.restrictions as ClubRestrictions) || DEFAULT_RESTRICTIONS,
            provisionalUntil: row.provisional_until,
            isOwner: true,
          }));

        const officerClubs: ClubOwnership[] = (officersRes.data || [])
          .filter((row: any) => !ownerClubs.some((o) => normalize(o.clubId) === normalize(row.club_id)))
          .map((row: any) => ({
            clubId: row.club_id,
            clubName: row.club_name,
            email: user.email || '',
            verifiedAt: '',
            verificationState: 'verified' as VerificationState,
            trustLevel: 'high' as TrustLevel,
            trustScore: 100,
            restrictions: DEFAULT_RESTRICTIONS,
            provisionalUntil: null,
            isOwner: false,
          }));

        setOwnedClubs([...ownerClubs, ...officerClubs]);
      } catch (err) {
        console.error('Error fetching owned clubs:', err);
        if (isMounted) setOwnedClubs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetch();
    return () => {
      isMounted = false;
    };
  }, [user?.id, authLoading, refreshTick]);

  const isOwnerOf = (clubId: string) => {
    const t = normalize(clubId);
    return ownedClubs.some((c) => normalize(c.clubId) === t && c.isOwner);
  };

  const isOfficerOf = (clubId: string) => {
    const t = normalize(clubId);
    return ownedClubs.some((c) => normalize(c.clubId) === t && !c.isOwner);
  };

  const getClubOwnership = (clubId: string) => {
    const t = normalize(clubId);
    return ownedClubs.find((c) => normalize(c.clubId) === t);
  };

  const canPerformAction = (clubId: string, action: keyof ClubRestrictions) => {
    const club = getClubOwnership(clubId);
    if (!club) return false;
    if (club.verificationState === 'verified') return true;
    if (club.verificationState === 'suspended') return false;
    return club.restrictions[action] === true;
  };

  const isProvisional = (clubId: string) =>
    getClubOwnership(clubId)?.verificationState === 'provisional';
  const isVerified = (clubId: string) => getClubOwnership(clubId)?.verificationState === 'verified';

  const checkOwnershipByEmail = async (email: string, clubId: string) => {
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

  const value: ClubOwnershipContextValue = {
    ownedClubs,
    loading,
    isOwnerOf,
    isOfficerOf,
    getClubOwnership,
    canPerformAction,
    isProvisional,
    isVerified,
    hasProvisionalClub: ownedClubs.some((c) => c.verificationState === 'provisional'),
    hasVerifiedClub: ownedClubs.some((c) => c.verificationState === 'verified'),
    checkOwnershipByEmail,
    refresh,
  };

  return <ClubOwnershipContext.Provider value={value}>{children}</ClubOwnershipContext.Provider>;
}

export function useClubOwnership(): ClubOwnershipContextValue {
  const ctx = useContext(ClubOwnershipContext);
  if (!ctx) throw new Error('useClubOwnership must be used inside ClubOwnershipProvider');
  return ctx;
}
