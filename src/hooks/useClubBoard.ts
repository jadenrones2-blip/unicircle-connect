import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BoardMember {
  user_id: string;
  memberRole: 'owner' | 'officer';
  display_name: string | null;
  role_title: string | null;
  avatar_url: string | null;
  bio: string | null;
  major: string | null;
  graduation_year: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  calendly_url: string | null;
  phone: string | null;
  email: string | null;
}

export function useClubBoard(clubId: string | undefined) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const normalizedId = clubId.trim().toLowerCase();

      const [{ data: ownerRows }, { data: officerRows }] = await Promise.all([
        (supabase as any).from('club_owners').select('user_id').eq('club_id', normalizedId),
        (supabase as any).from('club_officers').select('user_id').eq('club_id', normalizedId),
      ]);

      const ownerIds: string[] = (ownerRows || []).map((r: any) => r.user_id);
      const officerIds: string[] = (officerRows || []).map((r: any) => r.user_id);

      const allIds = [...new Set([...ownerIds, ...officerIds])];
      if (allIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await (supabase as any)
        .from('admin_profiles')
        .select('*')
        .in('user_id', allIds);

      const profileMap: Record<string, any> = {};
      for (const p of profiles || []) profileMap[p.user_id] = p;

      // Owners first, then officers (deduped)
      const ordered = [
        ...ownerIds.map((uid) => ({ uid, memberRole: 'owner' as const })),
        ...officerIds
          .filter((uid) => !ownerIds.includes(uid))
          .map((uid) => ({ uid, memberRole: 'officer' as const })),
      ];

      setMembers(
        ordered.map(({ uid, memberRole }) => {
          const p = profileMap[uid] || {};
          return {
            user_id: uid,
            memberRole,
            display_name: p.display_name ?? null,
            role_title: p.role_title ?? null,
            avatar_url: p.avatar_url ?? null,
            bio: p.bio ?? null,
            major: p.major ?? null,
            graduation_year: p.graduation_year ?? null,
            linkedin_url: p.linkedin_url ?? null,
            github_url: p.github_url ?? null,
            portfolio_url: p.portfolio_url ?? null,
            calendly_url: p.calendly_url ?? null,
            phone: p.phone ?? null,
            email: p.contact_email ?? null,
          };
        })
      );
    } catch (err) {
      console.error('useClubBoard error:', err);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return { members, loading, refetch: fetchBoard };
}
