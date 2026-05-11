import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Eye, Loader2, GripVertical, Zap } from 'lucide-react';

interface Slide { emoji: string; title: string; body: string; }
const EMPTY_SLIDE: Slide = { emoji: '✨', title: '', body: '' };

const EMOJI_SUGGESTIONS = ['✨', '🎯', '💡', '🔥', '🚀', '👥', '🎤', '🏆', '💼', '🌍', '🎨', '⚡'];

export default function ClubSpotlightCreator() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();

  const [slides, setSlides] = useState<Slide[]>([{ ...EMPTY_SLIDE }]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(0);
  const [existingId, setExistingId] = useState<string | null>(null);

  const club = ownedClubs.find(c => c.clubId?.trim().toLowerCase() === clubId?.trim().toLowerCase());
  const clubName = club?.clubName || 'Club';

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId && !isOwnerOf(clubId)) {
      navigate('/club-admin');
    }
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, navigate]);

  // Load existing spotlight
  useEffect(() => {
    if (!clubId) return;
    (supabase as any)
      .from('club_spotlights')
      .select('*')
      .eq('club_id', clubId.trim().toLowerCase())
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExistingId(data.id);
          setSlides(data.slides?.length ? data.slides : [{ ...EMPTY_SLIDE }]);
        }
      });
  }, [clubId]);

  const updateSlide = (i: number, field: keyof Slide, val: string) => {
    setSlides(s => s.map((slide, idx) => idx === i ? { ...slide, [field]: val } : slide));
    setPreview(i);
  };

  const addSlide = () => {
    if (slides.length >= 5) { toast.error('Max 5 slides per spotlight'); return; }
    setSlides(s => [...s, { ...EMPTY_SLIDE }]);
    setPreview(slides.length);
  };

  const removeSlide = (i: number) => {
    if (slides.length <= 1) return;
    setSlides(s => s.filter((_, idx) => idx !== i));
    setPreview(Math.max(0, preview - 1));
  };

  const save = async () => {
    if (!user || !clubId) return;
    if (slides.some(s => !s.title.trim())) {
      toast.error('Every slide needs a title');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        club_id: clubId.trim().toLowerCase(),
        club_name: clubName,
        slides,
        active: true,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };
      if (existingId) {
        await (supabase as any).from('club_spotlights').update(payload).eq('id', existingId);
      } else {
        const { data } = await (supabase as any).from('club_spotlights').insert(payload).select().single();
        if (data) setExistingId(data.id);
      }
      toast.success('Spotlight saved! Students will see it on their dashboard.');
    } catch {
      toast.error('Failed to save spotlight');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || ownershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  const previewSlide = slides[preview] ?? slides[0];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb items={[{ label: clubName, href: `/club-admin/clubs/${clubId}/recruitment` }, { label: 'Spotlight' }]} />
          </header>

          <div className="flex-1 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl">

            {/* Editor */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-gold" />
                  <h1 className="text-xl font-display font-bold text-white">Club Spotlight</h1>
                </div>
                <p className="text-sm text-zinc-500">Create 1–5 slides students swipe through on their dashboard.</p>
              </div>

              {slides.map((slide, i) => (
                <div
                  key={i}
                  onClick={() => setPreview(i)}
                  className="rounded-xl border p-5 space-y-4 cursor-pointer transition-all"
                  style={{ borderColor: preview === i ? 'rgba(196,150,28,0.4)' : 'rgba(255,255,255,0.07)', background: preview === i ? 'rgba(196,150,28,0.04)' : 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-zinc-700" />
                      <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Slide {i + 1}</span>
                    </div>
                    {slides.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); removeSlide(i); }} className="p-1 text-zinc-700 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Emoji picker */}
                  <div>
                    <Label className="text-zinc-500 text-xs mb-2 block">Emoji</Label>
                    <div className="flex flex-wrap gap-2">
                      {EMOJI_SUGGESTIONS.map(e => (
                        <button
                          key={e}
                          onClick={() => updateSlide(i, 'emoji', e)}
                          className="w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all"
                          style={{ background: slide.emoji === e ? 'rgba(196,150,28,0.15)' : 'rgba(255,255,255,0.05)', border: slide.emoji === e ? '1px solid rgba(196,150,28,0.4)' : '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-zinc-500 text-xs mb-1.5 block">Title <span className="text-red-400">*</span></Label>
                    <Input
                      value={slide.title}
                      onChange={e => updateSlide(i, 'title', e.target.value)}
                      placeholder="e.g. Who We Are"
                      maxLength={48}
                      className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-500 text-xs mb-1.5 block">Body</Label>
                    <Textarea
                      value={slide.body}
                      onChange={e => updateSlide(i, 'body', e.target.value)}
                      placeholder="2–3 sentences. Be direct and real."
                      maxLength={200}
                      className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                {slides.length < 5 && (
                  <button onClick={addSlide} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/15 text-zinc-500 hover:text-white hover:border-white/25 text-sm font-medium transition-all">
                    <Plus className="w-4 h-4" /> Add slide
                  </button>
                )}
                <Button onClick={save} disabled={saving} className="bg-gold text-zinc-900 font-bold hover:bg-gold/90 ml-auto">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {existingId ? 'Update Spotlight' : 'Publish Spotlight'}
                </Button>
              </div>
            </div>

            {/* Live preview */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 uppercase tracking-widest">
                <Eye className="w-3.5 h-3.5" /> Preview
              </div>

              {/* Phone mockup */}
              <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: '#111', maxWidth: 320 }}>
                {/* Card */}
                <div className="p-6 flex flex-col gap-4" style={{ minHeight: 240 }}>
                  <div className="text-5xl">{previewSlide?.emoji || '✨'}</div>
                  <div>
                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">{clubName}</p>
                    <h3 className="text-xl font-bold text-white leading-tight mb-2">
                      {previewSlide?.title || 'Your slide title'}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {previewSlide?.body || 'Your slide body text will appear here.'}
                    </p>
                  </div>
                </div>
                {/* Dots */}
                <div className="flex items-center justify-center gap-1.5 pb-4">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPreview(i)}
                      className="w-1.5 h-1.5 rounded-full transition-all"
                      style={{ background: i === preview ? 'hsl(43 74% 56%)' : 'rgba(255,255,255,0.15)' }}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-zinc-600">Students can swipe through your slides on their dashboard feed.</p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
