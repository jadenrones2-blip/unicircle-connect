import { useState } from 'react';
import { MessageCircle, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  clubId: string;
  clubName: string;
}

export default function ClubMessageButton({ clubId, clubName }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Please write a message.');
      return;
    }
    if (!user) {
      toast.error('You need to be logged in to send a message.');
      return;
    }

    setSending(true);
    try {
      // Fetch sender name from profiles
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await (supabase as any).from('club_messages').insert({
        club_id: clubId.trim().toLowerCase(),
        sender_id: user.id,
        sender_name: profile?.display_name || user.email?.split('@')[0] || 'Student',
        sender_email: user.email,
        subject: subject.trim() || `Message from ${profile?.display_name || 'a student'}`,
        body: body.trim(),
        read: false,
      });

      if (error) throw error;
      setSent(true);
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSent(false);
      setSubject('');
      setBody('');
    }, 300);
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full border-white/20 text-white hover:border-gold/50 hover:text-gold transition-all"
        onClick={() => (user ? setOpen(true) : toast.error('Sign in to message this club'))}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Message Club
      </Button>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className="bg-zinc-950 border-white/10 rounded-t-2xl pb-safe"
          style={{ maxHeight: '90vh' }}
        >
          <SheetHeader className="mb-5">
            <SheetTitle className="text-white font-display text-lg">Message {clubName}</SheetTitle>
            <SheetDescription className="text-zinc-500 text-sm">
              Your message goes directly to the club's admin inbox.
            </SheetDescription>
          </SheetHeader>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-base mb-1">Message sent!</p>
                <p className="text-zinc-500 text-sm">
                  The {clubName} team will receive it in their inbox.
                </p>
              </div>
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-white/10 text-zinc-300 mt-2"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  Subject
                </Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={`e.g. Interest in joining ${clubName}`}
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  Message <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Introduce yourself and what you'd like to know…"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 min-h-[120px] resize-none"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={sending || !body.trim()}
                className="w-full h-12 font-bold bg-gold text-zinc-900 hover:bg-gold/90"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Send Message
                  </>
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
