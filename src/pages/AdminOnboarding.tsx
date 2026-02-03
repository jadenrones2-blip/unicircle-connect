import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Upload, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const profileSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role_title: z.string().min(2, 'Role must be at least 2 characters').max(100),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AdminOnboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, createProfile, isProfileComplete } = useAdminProfile();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();
  
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      navigate('/login?redirect=/admin-onboarding');
    }
  }, [authLoading, user, navigate]);

  // Redirect if no club ownership
  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && ownedClubs.length === 0) {
      toast.error('You need to claim a club first');
      navigate('/clubs');
    }
  }, [authLoading, ownershipLoading, user, ownedClubs, navigate]);

  // Redirect if profile already complete
  useEffect(() => {
    if (!profileLoading && isProfileComplete) {
      navigate('/club-admin');
    }
  }, [profileLoading, isProfileComplete, navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
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
      toast.success('Photo uploaded!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);
    try {
      await createProfile({
        display_name: data.display_name,
        role_title: data.role_title,
        avatar_url: avatarUrl || undefined,
      });
      toast.success('Profile created!');
      navigate('/club-admin');
    } catch (err) {
      console.error('Profile creation error:', err);
      toast.error('Failed to create profile');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = authLoading || profileLoading || ownershipLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || ownedClubs.length === 0) {
    return null; // Will redirect
  }

  const clubName = ownedClubs[0]?.clubName || 'your club';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-lg">
          {/* Welcome Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Welcome, Admin!</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Set Up Your Profile
            </h1>
            <p className="text-muted-foreground">
              Let's personalize your experience as an admin for <span className="text-gold font-medium">{clubName}</span>
            </p>
          </div>

          {/* Profile Form */}
          <div className="premium-card p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-24 h-24 border-2 border-gold/30">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-gold/10 text-gold">
                      <User className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
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
                        {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground">Optional • Max 2MB</p>
                </div>

                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sarah Chen" {...field} />
                      </FormControl>
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
                      <FormLabel>Your Role in the Club *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. President, VP of Events" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <Button
                  type="submit"
                  variant="gold"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  {submitting ? 'Creating Profile...' : 'Continue to Admin Portal'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
