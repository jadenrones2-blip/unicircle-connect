import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications((data as Notification[]) ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async (userId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, fetchNotifications, markAllRead };
}
