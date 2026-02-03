import { useState, useEffect } from 'react';
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
import { Loader2, User, Upload, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('club-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('club-images')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      
      // Save immediately
      await updateProfile({ avatar_url: publicUrl });
      toast.success('Photo updated!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    setRemovingAvatar(true);
    try {
      // Remove from storage
      const fileName = `${user.id}/avatar`;
      await supabase.storage
        .from('club-images')
        .remove([`${fileName}.png`, `${fileName}.jpg`, `${fileName}.jpeg`, `${fileName}.webp`]);

      // Update profile
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
        <div className="min-h-screen flex w-full bg-background">
          <ClubAdminSidebar />
          <main className="flex-1">
            <header className="h-16 border-b border-border flex items-center px-4 gap-4">
              <SidebarTrigger />
              <Skeleton className="h-6 w-40" />
            </header>
            <div className="p-6 max-w-lg">
              <Skeleton className="h-4 w-32 mb-6" />
              <div className="premium-card p-6 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <Skeleton className="h-9 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
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
      <div className="min-h-screen flex w-full bg-background">
        <ClubAdminSidebar />
        
        <main className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-4 gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-display font-semibold text-foreground">
              Profile Settings
            </h1>
          </header>

          <div className="p-6 max-w-lg">
            <AdminBreadcrumb 
              items={[{ label: 'Profile Settings' }]} 
              className="mb-6"
            />

            <div className="premium-card p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-4 pb-6 border-b border-border">
                    <Avatar className="w-24 h-24 border-2 border-gold/30">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-gold/10 text-gold">
                        <User className="w-10 h-10" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingAvatar}
                          asChild
                        >
                          <span>
                            {uploadingAvatar ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                          </span>
                        </Button>
                      </label>
                      
                      {avatarUrl && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={removingAvatar}
                            >
                              {removingAvatar ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Photo</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove your profile photo?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleRemoveAvatar}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Max 2MB • JPG, PNG, or WebP</p>
                  </div>

                  {/* Name Field */}
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Sarah Chen" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is how you'll appear to other admins
                        </FormDescription>
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
                        <FormLabel>Your Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. President, VP of Events" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your position in the club
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit */}
                  <Button
                    type="submit"
                    variant="gold"
                    disabled={saving || !form.formState.isDirty}
                  >
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
