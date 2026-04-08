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
import { ArrowLeft, Camera, Loader2, Check, X, FileText, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const INTEREST_OPTIONS: { category: string; label: string; value: string; emoji: string }[] = [
  // Goals
  { category: 'superpower', value: 'network',     label: 'Networking', emoji: '🚪' },
  { category: 'superpower', value: 'skills',      label: 'Skill Building', emoji: '⚡' },
  { category: 'superpower', value: 'squad',       label: 'Finding Community', emoji: '👯' },
  { category: 'superpower', value: 'confidence',  label: 'Leadership', emoji: '🦁' },
  { category: 'superpower', value: 'purpose',     label: 'Social Impact', emoji: '🔥' },
  { category: 'superpower', value: 'fun',         label: 'Just for Fun', emoji: '✨' },
  { category: 'superpower', value: 'resume',      label: 'Resume Building', emoji: '📄' },
  { category: 'superpower', value: 'mentorship',  label: 'Mentorship', emoji: '🤝' },
  // Career
  { category: 'career', value: 'tech_career',        label: 'Tech', emoji: '💻' },
  { category: 'career', value: 'finance_career',     label: 'Finance', emoji: '📊' },
  { category: 'career', value: 'startup_career',     label: 'Startups', emoji: '🚀' },
  { category: 'career', value: 'consulting_career',  label: 'Consulting', emoji: '🎯' },
  { category: 'career', value: 'healthcare_career',  label: 'Healthcare', emoji: '🩺' },
  { category: 'career', value: 'research_career',    label: 'Research', emoji: '🔬' },
  { category: 'career', value: 'creative_career',    label: 'Creative & Media', emoji: '🎬' },
  { category: 'career', value: 'nonprofit_career',   label: 'Nonprofit', emoji: '🌍' },
  { category: 'career', value: 'law_career',         label: 'Law', emoji: '⚖️' },
  { category: 'career', value: 'realestate_career',  label: 'Real Estate', emoji: '🏠' },
  { category: 'career', value: 'marketing_career',   label: 'Marketing & PR', emoji: '📣' },
  { category: 'career', value: 'education_career',   label: 'Education', emoji: '🎓' },
  { category: 'career', value: 'government_career',  label: 'Government & Policy', emoji: '🏛️' },
  { category: 'career', value: 'undecided_career',   label: 'Still Figuring It Out', emoji: '🤷' },
  // Topics / Hobbies
  { category: 'interests', value: 'tech',          label: 'Coding', emoji: '🛠️' },
  { category: 'interests', value: 'business',      label: 'Business', emoji: '💡' },
  { category: 'interests', value: 'arts',          label: 'Art & Design', emoji: '🎨' },
  { category: 'interests', value: 'music',         label: 'Music', emoji: '🎵' },
  { category: 'interests', value: 'science',       label: 'Science', emoji: '🧬' },
  { category: 'interests', value: 'culture',       label: 'Culture & Identity', emoji: '🎭' },
  { category: 'interests', value: 'fitness',       label: 'Sports & Fitness', emoji: '🏋️' },
  { category: 'interests', value: 'social_impact', label: 'Activism', emoji: '✊' },
  { category: 'interests', value: 'gaming',        label: 'Gaming', emoji: '🎮' },
  { category: 'interests', value: 'writing',       label: 'Writing & Journalism', emoji: '✍️' },
  { category: 'interests', value: 'film',          label: 'Film & Photography', emoji: '🎥' },
  { category: 'interests', value: 'travel',        label: 'Travel & Languages', emoji: '🌐' },
  { category: 'interests', value: 'food',          label: 'Food & Cooking', emoji: '🍜' },
  { category: 'interests', value: 'sustainability', label: 'Sustainability', emoji: '🌱' },
  { category: 'interests', value: 'investing',     label: 'Investing', emoji: '📈' },
  { category: 'interests', value: 'dance',         label: 'Dance', emoji: '💃' },
  { category: 'interests', value: 'ai',            label: 'AI & Data Science', emoji: '🤖' },
  { category: 'interests', value: 'fashion',       label: 'Fashion', emoji: '👗' },
  // Vibe
  { category: 'vibe', value: 'competitive',    label: 'High-achieving', emoji: '🏆' },
  { category: 'vibe', value: 'chill',          label: 'Low-key', emoji: '🧘' },
  { category: 'vibe', value: 'party',          label: 'Social', emoji: '🦋' },
  { category: 'vibe', value: 'professional',   label: 'Professional', emoji: '👔' },
  { category: 'vibe', value: 'creative_vibe',  label: 'Creative', emoji: '🎪' },
  { category: 'vibe', value: 'inclusive',      label: 'Welcoming', emoji: '🤗' },
  // Commitment
  { category: 'energy', value: 'explorer',   label: 'Casual', emoji: '🌊' },
  { category: 'energy', value: 'committed',  label: 'Committed', emoji: '💪' },
  { category: 'energy', value: 'all_in',     label: 'All In', emoji: '👑' },
];

const CATEGORY_LABELS: Record<string, string> = {
  superpower: 'Goals',
  career: 'Career Path',
  interests: 'Topics & Hobbies',
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
  resume_url: string | null;
}

export default function StudentProfile() {
  const { user, loading: authLoading } = useAuth();
  const { fetchInterests, saveInterests } = useUserInterests();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({
    display_name: '', email: '', avatar_url: null, major: null, year: null, bio: null, resume_url: null,
  });
  const [uploadingResume, setUploadingResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
          resume_url: p.resume_url || null,
        });
      } else {
        setProfile(f => ({ ...f, email: user.email || '', display_name: user.email?.split('@')[0] || '' }));
      }
      const set = new Set<string>();
      (interestsData || []).forEach((i: any) => set.add(`${i.interest_category}:${i.interest_value}`));
      setSelectedInterests(set);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) {
      console.error('Avatar upload error:', JSON.stringify(uploadError));
      toast.error(`Upload failed: ${uploadError.message || uploadError.error || JSON.stringify(uploadError)}`);
      setUploadingAvatar(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles' as any).upsert({ user_id: user.id, avatar_url: url }, { onConflict: 'user_id' });
    setProfile(p => ({ ...p, avatar_url: url }));
    toast.success('Photo updated');
    setUploadingAvatar(false);
    e.target.value = '';
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Resume must be under 10MB'); return; }
    setUploadingResume(true);
    const path = `profile/${user.id}/resume.pdf`;
    const { error: uploadError } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Failed to upload resume'); setUploadingResume(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles' as any).update({ resume_url: url }).eq('user_id', user.id);
    setProfile(p => ({ ...p, resume_url: url }));
    toast.success('Resume uploaded');
    setUploadingResume(false);
    e.target.value = '';
  };

  const handleRemoveResume = async () => {
    if (!user) return;
    await supabase.storage.from('resumes').remove([`profile/${user.id}/resume.pdf`]);
    await supabase.from('profiles' as any).update({ resume_url: null }).eq('user_id', user.id);
    setProfile(p => ({ ...p, resume_url: null }));
    toast.success('Resume removed');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      display_name: profile.display_name.trim() || null,
      major: profile.major?.trim() || null,
      year: profile.year || null,
      bio: profile.bio?.trim() || null,
    };

    // Check if profile row exists
    const { data: existing } = await supabase.from('profiles' as any).select('user_id').eq('user_id', user.id).maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase.from('profiles' as any).update(payload).eq('user_id', user.id));
    } else {
      ({ error } = await supabase.from('profiles' as any).insert({ user_id: user.id, email: user.email, ...payload }));
    }

    if (error) {
      console.error('Profile save error:', error);
      toast.error(`Failed to save: ${error.message}`);
      setSaving(false);
      return;
    }
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
    if (result.success) { toast.success('Interests saved'); setInterestsDirty(false); }
    else toast.error('Failed to save interests');
    setSavingInterests(false);
  };

  const groupedOptions = INTEREST_OPTIONS.reduce((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = [];
    acc[opt.category].push(opt);
    return acc;
  }, {} as Record<string, typeof INTEREST_OPTIONS>);

  const initials = profile.display_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?';

  if (loading) {
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
        <Header />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
      <Header />

      <div className="container mx-auto px-4 pt-24 pb-24 max-w-2xl">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
        </Link>

        {/* ── Hero: avatar + name ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 mb-3 flex items-center gap-5">
          <div className="relative flex-shrink-0 cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10" />
            ) : (
              <div className="w-20 h-20 rounded-full ring-2 ring-white/10 flex items-center justify-center text-3xl font-bold"
                style={{ background: 'linear-gradient(135deg, #b8860b44, #b8860b22)', color: '#f59e0b' }}>
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Camera className="w-5 h-5 text-white" />}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">
              {profile.display_name || 'Your Name'}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5 truncate">{profile.email}</p>
            {(profile.major || profile.year) && (
              <p className="text-sm text-zinc-400 mt-1">
                {[profile.major, profile.year].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <button
            onClick={() => avatarInputRef.current?.click()}
            className="flex-shrink-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-white/10 rounded-lg px-3 py-1.5"
          >
            {uploadingAvatar ? 'Uploading…' : 'Change photo'}
          </button>
        </div>

        {/* ── Basic info ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 mb-3 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Basic Info</h2>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Display Name</Label>
            <Input
              value={profile.display_name}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              className="bg-white/5 border-white/8 text-white placeholder:text-zinc-600 focus:border-gold/40 focus:ring-0"
              placeholder="How you want to be known"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Major</Label>
              <Input
                value={profile.major || ''}
                onChange={e => setProfile(p => ({ ...p, major: e.target.value }))}
                className="bg-white/5 border-white/8 text-white placeholder:text-zinc-600 focus:border-gold/40 focus:ring-0"
                placeholder="e.g. Business Economics"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Year</Label>
              <Select value={profile.year || ''} onValueChange={v => setProfile(p => ({ ...p, year: v }))}>
                <SelectTrigger className="bg-white/5 border-white/8 text-white focus:border-gold/40">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y} className="text-white">{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-500">Bio</Label>
              <span className="text-xs text-zinc-700">{(profile.bio || '').length}/280</span>
            </div>
            <Textarea
              value={profile.bio || ''}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              className="bg-white/5 border-white/8 text-white placeholder:text-zinc-600 resize-none focus:border-gold/40 focus:ring-0"
              rows={3}
              placeholder="A short intro about yourself…"
              maxLength={280}
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full bg-gold text-black font-semibold hover:bg-gold/90 h-10"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" />Save Profile</>}
          </Button>
        </div>

        {/* ── Resume ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 mb-3 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Resume</h2>

          {profile.resume_url ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/[0.03]">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">resume.pdf</p>
                <p className="text-xs text-zinc-500 mt-0.5">Uploaded</p>
              </div>
              <a
                href={profile.resume_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                View
              </a>
              <button
                onClick={() => resumeInputRef.current?.click()}
                className="text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                Replace
              </button>
              <button
                onClick={handleRemoveResume}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-xl py-8 cursor-pointer hover:border-white/25 transition-colors">
              {uploadingResume
                ? <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                : <Upload className="w-5 h-5 text-zinc-500" />}
              <span className="text-sm text-zinc-400">{uploadingResume ? 'Uploading…' : 'Upload resume'}</span>
              <span className="text-xs text-zinc-600">PDF · Max 10MB</span>
              <input ref={resumeInputRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeChange} />
            </label>
          )}
          {/* Hidden input for replace flow */}
          {profile.resume_url && (
            <input ref={resumeInputRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeChange} />
          )}
        </div>

        {/* ── Interests ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Interests & Goals</h2>
            <span className="text-xs text-zinc-600 bg-white/5 border border-white/8 rounded-full px-2.5 py-1">
              {selectedInterests.size} selected
            </span>
          </div>
          <p className="text-xs text-zinc-600 -mt-3">These power your club match scores. Toggle anything on or off.</p>

          <div className="space-y-5">
            {Object.entries(groupedOptions).map(([category, options]) => (
              <div key={category}>
                <p className="text-xs font-medium text-zinc-500 mb-2.5 uppercase tracking-wider">
                  {CATEGORY_LABELS[category] || category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map(opt => {
                    const key = `${opt.category}:${opt.value}`;
                    const active = selectedInterests.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleInterest(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? 'border-gold/50 text-gold'
                            : 'border-white/8 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                        }`}
                        style={active ? { background: 'rgba(180,135,11,0.1)' } : { background: 'rgba(255,255,255,0.03)' }}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                        {active && <X className="w-3 h-3 opacity-50" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveInterests}
            disabled={savingInterests || !interestsDirty}
            className="w-full bg-gold text-black font-semibold hover:bg-gold/90 h-10 disabled:opacity-30"
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
