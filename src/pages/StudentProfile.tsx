import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

// ─── All quiz options for the interest editor ──────────────────────────────
const INTEREST_OPTIONS: { category: string; label: string; value: string; emoji: string }[] = [
  // Goals / superpower
  { category: 'superpower', value: 'network',     label: 'Connections that open doors', emoji: '🚪' },
  { category: 'superpower', value: 'skills',      label: 'Skills that make me dangerous', emoji: '⚡' },
  { category: 'superpower', value: 'squad',       label: 'A squad that gets me', emoji: '👯' },
  { category: 'superpower', value: 'confidence',  label: 'Confidence to lead anything', emoji: '🦁' },
  { category: 'superpower', value: 'purpose',     label: 'A cause worth fighting for', emoji: '🔥' },
  { category: 'superpower', value: 'fun',         label: 'Honestly? Just vibes', emoji: '✨' },
  // Career
  { category: 'career', value: 'tech_career',        label: 'Break into tech', emoji: '💻' },
  { category: 'career', value: 'finance_career',     label: 'Wall Street / Finance', emoji: '📊' },
  { category: 'career', value: 'startup_career',     label: 'Start my own thing', emoji: '🚀' },
  { category: 'career', value: 'consulting_career',  label: 'Consulting / Strategy', emoji: '🎯' },
  { category: 'career', value: 'healthcare_career',  label: 'Med / Healthcare', emoji: '🩺' },
  { category: 'career', value: 'research_career',    label: 'Research / Academia', emoji: '🔬' },
  { category: 'career', value: 'creative_career',    label: 'Creative / Design / Media', emoji: '🎬' },
  { category: 'career', value: 'nonprofit_career',   label: 'Nonprofit / Public sector', emoji: '🌍' },
  { category: 'career', value: 'undecided_career',   label: 'Still figuring it out', emoji: '🤷' },
  // Interests
  { category: 'interests', value: 'tech',          label: 'Coding & building stuff', emoji: '🛠️' },
  { category: 'interests', value: 'business',      label: 'Startups & side hustles', emoji: '💡' },
  { category: 'interests', value: 'arts',          label: 'Art, music, or design', emoji: '🎨' },
  { category: 'interests', value: 'science',       label: 'Science & discovery', emoji: '🧬' },
  { category: 'interests', value: 'culture',       label: 'Culture & identity', emoji: '🎭' },
  { category: 'interests', value: 'fitness',       label: 'Sports & fitness', emoji: '🏋️' },
  { category: 'interests', value: 'social_impact', label: 'Changing the world', emoji: '✊' },
  { category: 'interests', value: 'gaming',        label: 'Gaming & esports', emoji: '🎮' },
  // Vibe
  { category: 'vibe', value: 'competitive',    label: 'Intense & high-achieving', emoji: '🏆' },
  { category: 'vibe', value: 'chill',          label: 'Chill & no pressure', emoji: '🧘' },
  { category: 'vibe', value: 'party',          label: 'Social butterflies unite', emoji: '🦋' },
  { category: 'vibe', value: 'professional',   label: 'Suit up & network', emoji: '👔' },
  { category: 'vibe', value: 'creative_vibe',  label: 'Weird & creative', emoji: '🎪' },
  { category: 'vibe', value: 'inclusive',      label: 'Warm & welcoming', emoji: '🤗' },
  // Energy
  { category: 'energy', value: 'explorer',   label: 'Dip my toes in', emoji: '🌊' },
  { category: 'energy', value: 'committed',  label: 'Show up & contribute', emoji: '💪' },
  { category: 'energy', value: 'all_in',     label: 'Run the whole thing', emoji: '👑' },
];

const CATEGORY_LABELS: Record<string, string> = {
  superpower: 'Goals',
  career: 'Career',
  interests: 'Interests',
  vibe: 'Club Vibe',
  energy: 'Commitment Level',
};

const YEAR_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];

interface Profile {
  display_name: string;
  email: string;
  avatar_url: string | null;
  major: string | null;
  year: string | null;
  bio: string | null;
}

export default function StudentProfile() {
  const { user, loading: authLoading } = useAuth();
  const { fetchInterests, saveInterests } = useUserInterests();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({
    display_name: '', email: '', avatar_url: null, major: null, year: null, bio: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Interests: set of "category:value" strings
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [savingInterests, setSavingInterests] = useState(false);
  const [interestsDirty, setInterestsDirty] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (!user) return;

    (async () => {
      setLoading(true);
      const [profileRes, interestsData] = await Promise.all([
        supabase.from('profiles' as any).select('*').eq('user_id', user.id).maybeSingle(),
        fetchInterests(user.id),
      ]);

      if (profileRes.data) {
        const p = profileRes.data as any;
        setProfile({
          display_name: p.display_name || user.email?.split('@')[0] || '',
          email: p.email || user.email || '',
          avatar_url: p.avatar_url || null,
          major: p.major || null,
          year: p.year || null,
          bio: p.bio || null,
        });
      } else {
        setProfile(f => ({ ...f, email: user.email || '', display_name: user.email?.split('@')[0] || '' }));
      }

      // Load interests
      const set = new Set<string>();
      (interestsData || []).forEach((i: any) => {
        set.add(`${i.interest_category}:${i.interest_value}`);
      });
      setSelectedInterests(set);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const handleAvatarClick = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Failed to upload image'); setUploadingAvatar(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`; // cache bust

    await supabase.from('profiles' as any).upsert({ user_id: user.id, avatar_url: url }, { onConflict: 'user_id' });
    setProfile(p => ({ ...p, avatar_url: url }));
    toast.success('Profile photo updated');
    setUploadingAvatar(false);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles' as any).upsert({
      user_id: user.id,
      display_name: profile.display_name.trim() || null,
      major: profile.major?.trim() || null,
      year: profile.year || null,
      bio: profile.bio?.trim() || null,
    }, { onConflict: 'user_id' });

    if (error) { toast.error('Failed to save profile'); setSaving(false); return; }
    toast.success('Profile saved');
    setSaving(false);
  };

  const toggleInterest = (key: string) => {
    setSelectedInterests(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setInterestsDirty(true);
  };

  const handleSaveInterests = async () => {
    if (!user) return;
    setSavingInterests(true);
    const interests = [...selectedInterests].map(key => {
      const [category, value] = key.split(':');
      return { category, value };
    });
    const result = await saveInterests(user.id, interests);
    if (result.success) {
      toast.success('Interests saved');
      setInterestsDirty(false);
    } else {
      toast.error('Failed to save interests');
    }
    setSavingInterests(false);
  };

  const groupedOptions = INTEREST_OPTIONS.reduce((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = [];
    acc[opt.category].push(opt);
    return acc;
  }, {} as Record<string, typeof INTEREST_OPTIONS>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-2xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-display font-bold text-white mb-8">My Profile</h1>

        {/* ── Avatar ─────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 mb-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">Photo</p>
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-2xl font-bold text-zinc-400">
                  {profile.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />}
              </div>
            </div>
            <div>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="text-sm text-gold hover:text-gold/80 transition-colors font-medium"
              >
                {uploadingAvatar ? 'Uploading...' : 'Change photo'}
              </button>
              <p className="text-xs text-zinc-600 mt-1">JPG, PNG or GIF · Max 5MB</p>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* ── Basic info ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 mb-4 space-y-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Basic Info</p>

          <div className="space-y-1.5">
            <Label className="text-zinc-300">Display Name</Label>
            <Input
              value={profile.display_name}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              className="bg-zinc-900 border-white/10 text-white"
              placeholder="How you want to be known"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300">Email</Label>
            <Input
              value={profile.email}
              disabled
              className="bg-zinc-900 border-white/10 text-zinc-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Major</Label>
              <Input
                value={profile.major || ''}
                onChange={e => setProfile(p => ({ ...p, major: e.target.value }))}
                className="bg-zinc-900 border-white/10 text-white"
                placeholder="e.g. Business Economics"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Year</Label>
              <Select value={profile.year || ''} onValueChange={v => setProfile(p => ({ ...p, year: v }))}>
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10">
                  {YEAR_OPTIONS.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300">Bio <span className="text-zinc-600">(optional)</span></Label>
            <Textarea
              value={profile.bio || ''}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              className="bg-zinc-900 border-white/10 text-white resize-none"
              rows={3}
              placeholder="A short intro about yourself..."
              maxLength={280}
            />
            <p className="text-xs text-zinc-600 text-right">{(profile.bio || '').length}/280</p>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full bg-gold text-black font-semibold hover:bg-gold/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" />Save Profile</>}
          </Button>
        </div>

        {/* ── Interests ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Interests & Goals</p>
            <span className="text-xs text-zinc-600">{selectedInterests.size} selected</span>
          </div>
          <p className="text-sm text-zinc-500 -mt-3">
            These power your club match scores. Toggle anything on or off — more = better recommendations.
          </p>

          {Object.entries(groupedOptions).map(([category, options]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-zinc-400 mb-2">{CATEGORY_LABELS[category] || category}</p>
              <div className="flex flex-wrap gap-2">
                {options.map(opt => {
                  const key = `${opt.category}:${opt.value}`;
                  const active = selectedInterests.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleInterest(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                        active
                          ? 'bg-gold/10 border-gold/40 text-gold'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                      {active && <X className="w-3 h-3 ml-0.5 opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Button
            onClick={handleSaveInterests}
            disabled={savingInterests || !interestsDirty}
            className="w-full bg-gold text-black font-semibold hover:bg-gold/90 disabled:opacity-40"
          >
            {savingInterests
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Check className="w-4 h-4 mr-1.5" />Save Interests</>}
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
