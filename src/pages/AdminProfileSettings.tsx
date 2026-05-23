import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  User,
  Camera,
  Save,
  Linkedin,
  GraduationCap,
  Phone,
  Mail,
  BookOpen,
  BadgeInfo,
  Github,
  Globe,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const urlField = z
  .string()
  .optional()
  .refine((v) => !v || v === '' || v.startsWith('http'), { message: 'Must be a valid URL' });

const profileSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role_title: z.string().min(2, 'Role must be at least 2 characters').max(100),
  bio: z.string().max(300, 'Bio must be under 300 characters').optional(),
  major: z.string().max(100).optional(),
  graduation_year: z.string().max(10).optional(),
  contact_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  linkedin_url: z
    .string()
    .optional()
    .refine(
      (v) => !v || v === '' || v.startsWith('https://linkedin.com') || v.startsWith('https://www.linkedin.com'),
      { message: 'Must be a valid LinkedIn URL' }
    ),
  github_url: urlField,
  portfolio_url: urlField,
  calendly_url: urlField,
  phone: z.string().max(20).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Icon className="w-4 h-4 text-gold" />
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function AdminProfileSettings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile, isProfileComplete } = useAdminProfile();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();

  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      role_title: '',
      bio: '',
      major: '',
      graduation_year: '',
      contact_email: '',
      linkedin_url: '',
      github_url: '',
      portfolio_url: '',
      calendly_url: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please log in to continue');
      navigate('/login?redirect=/club-admin/profile');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && ownedClubs.length === 0) {
      toast.error('You need to claim a club first');
      navigate('/clubs');
    }
  }, [authLoading, ownershipLoading, user, ownedClubs, navigate]);

  useEffect(() => {
    if (!profileLoading && !isProfileComplete && user && ownedClubs.length > 0) {
      navigate('/admin-onboarding');
    }
  }, [profileLoading, isProfileComplete, user, ownedClubs, navigate]);

  useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || '',
        role_title: profile.role_title || '',
        bio: profile.bio || '',
        major: profile.major || '',
        graduation_year: profile.graduation_year || '',
        // Pre-fill from auth email if not yet set
        contact_email: profile.contact_email || user?.email || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        portfolio_url: profile.portfolio_url || '',
        calendly_url: profile.calendly_url || '',
        phone: profile.phone || '',
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile, form, user?.email]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Upload failed');

      setAvatarUrl(json.url);
      if (profile) profile.avatar_url = json.url;
      toast.success('Photo updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setRemovingAvatar(true);
    try {
      await supabase.storage
        .from('avatars')
        .remove([
          `admin-avatars/${user.id}.png`,
          `admin-avatars/${user.id}.jpg`,
          `admin-avatars/${user.id}.jpeg`,
          `admin-avatars/${user.id}.webp`,
        ]);
      await updateProfile({ avatar_url: '' });
      setAvatarUrl(null);
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    } finally {
      setRemovingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: data.display_name,
        role_title: data.role_title,
        bio: data.bio || null,
        major: data.major || null,
        graduation_year: data.graduation_year || null,
        contact_email: data.contact_email || user?.email || null,
        linkedin_url: data.linkedin_url || null,
        github_url: data.github_url || null,
        portfolio_url: data.portfolio_url || null,
        calendly_url: data.calendly_url || null,
        phone: data.phone || null,
      });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const isLoading = authLoading || profileLoading || ownershipLoading;

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
          <ClubAdminSidebar />
          <main className="flex-1 overflow-auto">
            <header
              className="h-14 flex items-center px-4 gap-3 sticky top-0 z-10"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0A0A0A' }}
            >
              <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
              <Skeleton className="h-5 w-40 bg-white/10" />
            </header>
            <div className="p-6 md:p-8 max-w-5xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 rounded-2xl bg-white/5" />
                <div className="lg:col-span-2 space-y-6">
                  <Skeleton className="h-48 rounded-2xl bg-white/5" />
                  <Skeleton className="h-48 rounded-2xl bg-white/5" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!user || !isProfileComplete) return null;

  const initials = (profile?.display_name || user.email || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />

        <main className="flex-1 overflow-auto">
          <header
            className="h-14 flex items-center px-4 gap-3 sticky top-0 z-10"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0A0A0A' }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb items={[{ label: 'Profile & Settings' }]} />
          </header>

          <div className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">

                  {/* ── Left column: Avatar + identity ── */}
                  <div className="flex flex-col gap-6">
                    <SectionCard icon={User} title="Profile Photo">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />

                      <div className="flex flex-col items-center gap-4">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="relative group focus:outline-none"
                        >
                          <Avatar className="w-24 h-24 border-2 border-gold/30">
                            <AvatarImage src={avatarUrl || undefined} />
                            <AvatarFallback className="bg-gold/10 text-gold text-lg font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploadingAvatar ? (
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            ) : (
                              <Camera className="w-6 h-6 text-white" />
                            )}
                          </div>
                        </button>

                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                          >
                            {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                          </button>

                          {avatarUrl && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                                  disabled={removingAvatar}
                                >
                                  {removingAvatar ? 'Removing...' : 'Remove'}
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-zinc-900 border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">
                                    Remove Photo
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-zinc-400">
                                    Are you sure you want to remove your profile photo?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleRemoveAvatar}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          <p className="text-[11px] text-zinc-600 mt-1">Max 2MB · JPG, PNG, WebP</p>
                        </div>
                      </div>
                    </SectionCard>

                    {/* Read-only account info */}
                    <SectionCard icon={Mail} title="Account">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                            Email
                          </p>
                          <p className="text-sm text-zinc-300 break-all">{user.email}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                            Member since
                          </p>
                          <p className="text-sm text-zinc-300">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </SectionCard>
                  </div>

                  {/* ── Right columns: editable sections ── */}
                  <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Identity */}
                    <SectionCard icon={BadgeInfo} title="Identity">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="display_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs">Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Sarah Chen"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="role_title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs">Board Role</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. President, VP of Events"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs">Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="A short intro for other officers and applicants to see..."
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50 resize-none h-24"
                                  {...field}
                                />
                              </FormControl>
                              <div className="flex justify-between">
                                <FormMessage />
                                <p className="text-[11px] text-zinc-600 ml-auto">
                                  {(field.value ?? '').length}/300
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>

                    {/* Academic */}
                    <SectionCard icon={GraduationCap} title="Academic">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="major"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs">Major</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Computer Science"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="graduation_year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs">Graduation Year</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
                                  {...field}
                                >
                                  <option value="" className="bg-zinc-900">Select year</option>
                                  {GRAD_YEARS.map((y) => (
                                    <option key={y} value={y} className="bg-zinc-900">
                                      {y}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>

                    {/* Contact & Socials */}
                    <SectionCard icon={BookOpen} title="Contact & Socials">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contact_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs flex items-center gap-1.5">
                                <Mail className="w-3 h-3" /> Contact Email
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="you@ucsd.edu"
                                  type="email"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-[11px] text-zinc-600">Shown on your team card</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="linkedin_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs flex items-center gap-1.5">
                                <Linkedin className="w-3 h-3" /> LinkedIn
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://linkedin.com/in/yourname"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="github_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs flex items-center gap-1.5">
                                <Github className="w-3 h-3" /> GitHub
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://github.com/yourhandle"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="portfolio_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs flex items-center gap-1.5">
                                <Globe className="w-3 h-3" /> Portfolio / Website
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://yoursite.com"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="calendly_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs flex items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" /> Calendly
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://calendly.com/yourname"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-400 text-xs flex items-center gap-1.5">
                                <Phone className="w-3 h-3" /> Phone (internal only)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. (619) 555-0100"
                                  type="tel"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>

                    {/* Save */}
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="gold"
                        disabled={saving || !form.formState.isDirty}
                        className="min-w-[130px]"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
