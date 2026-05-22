import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { Loader2, Inbox, MailOpen, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ClubMessage {
  id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string | null;
  body: string;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ClubAdminInbox() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, isOfficerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();

  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClubMessage | null>(null);

  const club = ownedClubs.find(
    (c) => c.clubId?.trim().toLowerCase() === clubId?.trim().toLowerCase()
  );
  const clubName = club?.clubName || 'Club';

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId) {
      if (!isOwnerOf(clubId) && !isOfficerOf(clubId)) navigate('/club-admin');
    }
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, isOfficerOf, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('club_messages')
      .select('*')
      .eq('club_id', clubId.trim().toLowerCase())
      .order('created_at', { ascending: false });
    setMessages((data || []) as ClubMessage[]);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`inbox:${clubId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId.trim().toLowerCase()}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as ClubMessage, ...prev]);
          toast.success('New message received');
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId]);

  const markRead = async (msg: ClubMessage) => {
    setSelected(msg);
    if (!msg.read) {
      await (supabase as any).from('club_messages').update({ read: true }).eq('id', msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  if (authLoading || ownershipLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0A0A' }}
      >
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header
            className="h-14 flex items-center px-4 gap-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb
              items={[
                { label: clubName, href: `/club-admin/clubs/${clubId}/recruitment` },
                { label: 'Inbox' },
              ]}
            />
            {unreadCount > 0 && (
              <span className="ml-auto text-xs font-bold bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </header>

          <div className="flex-1 flex min-h-0">
            {/* Message list */}
            <div
              className="w-full max-w-sm border-r flex flex-col"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-gold" />
                  <h2 className="font-display font-bold text-white text-sm">Inbox</h2>
                  <span className="text-xs text-zinc-600 ml-auto">{messages.length} total</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                    <Inbox className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-600">No messages yet.</p>
                  <p className="text-xs text-zinc-700">
                    Students can message you from your club's page.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {messages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => markRead(msg)}
                      className="w-full text-left px-4 py-4 border-b transition-colors hover:bg-white/[0.03]"
                      style={{
                        borderColor: 'rgba(255,255,255,0.05)',
                        background: selected?.id === msg.id ? 'rgba(255,255,255,0.04)' : undefined,
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0 mt-0.5">
                          {(msg.sender_name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p
                              className={`text-sm truncate ${msg.read ? 'text-zinc-400 font-medium' : 'text-white font-semibold'}`}
                            >
                              {msg.sender_name || 'Student'}
                            </p>
                            {!msg.read && (
                              <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                            )}
                            <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
                              {timeAgo(msg.created_at)}
                            </span>
                          </div>
                          <p
                            className={`text-xs truncate ${msg.read ? 'text-zinc-600' : 'text-zinc-400'}`}
                          >
                            {msg.subject || msg.body}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message detail */}
            <div className="flex-1 flex flex-col">
              {selected ? (
                <div className="flex-1 p-6 max-w-2xl">
                  <div
                    className="mb-6 pb-6 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <h3 className="text-xl font-display font-bold text-white mb-1">
                      {selected.subject || 'No subject'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <span className="font-medium text-zinc-300">
                        {selected.sender_name || 'Student'}
                      </span>
                      {selected.sender_email && <span>·</span>}
                      {selected.sender_email && <span>{selected.sender_email}</span>}
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(selected.created_at)}
                      </div>
                    </div>
                  </div>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selected.body}
                  </p>

                  {selected.sender_email && (
                    <a
                      href={`mailto:${selected.sender_email}?subject=Re: ${encodeURIComponent(selected.subject || '')}`}
                      className="inline-flex items-center gap-2 mt-8 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm font-semibold hover:bg-gold/20 transition-all"
                    >
                      <Mail className="w-4 h-4" /> Reply via email
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                    <MailOpen className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-zinc-600 text-sm">Select a message to read it</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
