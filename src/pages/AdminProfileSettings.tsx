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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, User, Camera, Save, Trash2 } from 'lucide-react';
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

const profileSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role_title: z.string().min(2, 'Role must be at least 2 characters').max(100),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please log in to continue');
      navigate('/login?redirect=/club-admin/profile');
    }
  }, [authLoading, user, navigate]);

  // Redirect if no club ownership
  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && ownedClubs.length === 0) {
      toast.error('You need to claim a club first');
      navigate('/clubs');
    }
  }, [authLoading, ownershipLoading, user, ownedClubs, navigate]);

  // Redirect to onboarding if profile not complete
  useEffect(() => {
    if (!profileLoading && !isProfileComplete && user && ownedClubs.length > 0) {
      navigate('/admin-onboarding');
    }
  }, [profileLoading, isProfileComplete, user, ownedClubs, navigate]);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || '',
        role_title: profile.role_title || '',
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile, form]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset input so same file can be re-selected
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
      // Profile table already updated by edge function — sync local state
      if (profile) {
        profile.avatar_url = json.url;
      }
      toast.success('Photo updated!');
    } catch (err: any) {
      console.error('Upload error:', err);
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
    } catch (err) {
      console.error('Remove error:', err);
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
      });
      toast.success('Profile updated!');
    } catch (err) {
      console.error('Profile update error:', err);
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
          <main className="flex-1">
            <header
              className="h-14 flex items-center px-4 gap-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
              <Skeleton className="h-5 w-40 bg-white/10" />
            </header>
            <div className="p-5 sm:p-7 max-w-lg">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="w-24 h-24 rounded-full bg-white/10" />
                  <Skeleton className="h-8 w-32 bg-white/10" />
                </div>
                <Skeleton className="h-10 w-full bg-white/10" />
                <Skeleton className="h-10 w-full bg-white/10" />
                <Skeleton className="h-10 w-32 bg-white/10" />
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!user || !isProfileComplete) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />

        <main className="flex-1">
          <header
            className="h-14 flex items-center px-4 gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb items={[{ label: 'Profile Settings' }]} />
          </header>

          <div className="p-5 sm:p-7 max-w-lg">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Avatar Section */}
                  <div
                    className="flex flex-col items-center gap-3 pb-6"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />

                    {/* Clickable avatar */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="relative group focus:outline-none"
                    >
                      <Avatar className="w-24 h-24 border-2 border-gold/30">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="bg-gold/10 text-gold">
                          <User className="w-10 h-10" />
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

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                      </button>

                      {avatarUrl && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="text-sm text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
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
                        </>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600">Max 2MB · JPG, PNG, or WebP</p>
                  </div>

                  {/* Name Field */}
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Your Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Sarah Chen"
                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-zinc-500">
                          This is how you'll appear to other admins
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role Field */}
                  <FormField
                    control={form.control}
                    name="role_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Your Role</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. President, VP of Events"
                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-gold/50"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-zinc-500">Your position in the club</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit */}
                  <Button type="submit" variant="gold" disabled={saving || !form.formState.isDirty}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
