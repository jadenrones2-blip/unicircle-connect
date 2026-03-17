import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Save, Instagram, Mail, Globe, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ClubAdminSidebar } from "@/components/club-admin/ClubAdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useClubOwnership } from "@/hooks/useClubOwnership";
import { useAuth } from "@/hooks/useAuth";
import { dataClient } from "@/integrations/supabase/dataClient";
import { ClubImageUpload } from "@/components/club-admin/ClubImageUpload";
import { useExternalClubRecord } from "@/hooks/useExternalClubRecord";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBreadcrumb } from "@/components/club-admin/AdminBreadcrumb";
import { RecruitmentStatusCard } from "@/components/club-admin/RecruitmentStatusCard";


const clubEditSchema = z.object({
  description: z.string().max(2000, "Description must be under 2000 characters").optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  instagram: z.string().max(100).optional().or(z.literal("")),
  linkedin: z.string().max(200).optional().or(z.literal("")),
  website: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
});

type ClubEditFormData = z.infer<typeof clubEditSchema>;

export default function ClubAdminEdit() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading, isOwnerOf } = useClubOwnership();
  const { club, loading: clubLoading, error: clubError, refetch: refetchClub } = useExternalClubRecord(clubId);
  const [isSaving, setIsSaving] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const normalizeId = (id?: string) => (id ?? "").trim().toLowerCase();
  const isOwner = clubId ? isOwnerOf(clubId) : false;
  const ownership = ownedClubs.find((o) => normalizeId(o.clubId) === normalizeId(clubId));

  const form = useForm<ClubEditFormData>({
    resolver: zodResolver(clubEditSchema),
    defaultValues: {
      description: "",
      email: "",
      instagram: "",
      linkedin: "",
      website: "",
    },
  });

  // Populate form when club data loads
  useEffect(() => {
    if (club) {
      form.reset({
        description: club.description || "",
        email: club.email || "",
        instagram: club.instagram || "",
        linkedin: club.linkedin || "",
        website: club.website || "",
      });
      setCoverImageUrl(club.cover_image || null);
    }
  }, [club, form]);

  // Require authentication (avoid misleading "no permission" when signed out)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const redirect = clubId ? `/club-admin/clubs/${clubId}/edit` : "/club-admin";
      toast.error("Please log in to access club admin");
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [authLoading, user, clubId, navigate]);

  // Check authorization
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!ownershipLoading && clubId && !isOwnerOf(clubId)) {
      toast.error("You don't have permission to edit this club");
      navigate("/club-admin");
    }
  }, [ownershipLoading, clubId, isOwnerOf, navigate, authLoading, user]);

  const onSubmit = async (data: ClubEditFormData) => {
    if (!clubId) return;

    setIsSaving(true);
    try {
      const { error: dbError } = await dataClient
        .from('clubs')
        .update({
          description: data.description || null,
          email: data.email || null,
          instagram: data.instagram || null,
          linkedin: data.linkedin || null,
          website: data.website || null,
          cover_image: coverImageUrl || null,
        })
        .eq('id', clubId);

      if (dbError) {
        throw new Error(dbError.message || "Failed to update club");
      }

      toast.success("Club profile updated successfully!");
      navigate(`/clubs/${clubId}`);
    } catch (err: any) {
      console.error("Error updating club:", err);
      toast.error(err.message || "Failed to update club profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || ownershipLoading || clubLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <ClubAdminSidebar />
          <main className="flex-1">
            <header className="h-14 border-b border-border flex items-center px-4 gap-4">
              <SidebarTrigger />
              <div>
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-4 w-28" />
              </div>
            </header>

            <div className="p-6 w-full max-w-4xl">
              <Skeleton className="h-4 w-32 mb-6" />

              <div className="premium-card p-6 space-y-6">
                {/* Cover image skeleton */}
                <Skeleton className="h-40 w-full rounded-lg" />

                {/* Description skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-[150px] w-full rounded-md" />
                  <Skeleton className="h-3 w-64" />
                </div>

                {/* Email / Instagram row */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>

                {/* LinkedIn / Website row */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>

                {/* Buttons skeleton */}
                <div className="flex gap-3 pt-4">
                  <Skeleton className="h-10 w-20 rounded-md" />
                  <Skeleton className="h-10 w-32 rounded-md" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!clubId || !club || !isOwner) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <ClubAdminSidebar />
          <main className="flex-1 p-8">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Club not found</h2>
              {clubError && (
                <p className="text-sm text-muted-foreground mb-4">{clubError}</p>
              )}
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={refetchClub}>
                  Try Again
                </Button>
              <Button variant="outline" asChild>
                <Link to="/club-admin">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClubAdminSidebar />
        
        <main className="flex-1">
          <header className="h-14 border-b border-border flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="font-semibold text-foreground">Edit Club Profile</h1>
              <p className="text-sm text-muted-foreground">{club.name}</p>
            </div>
          </header>

          <div className="p-6 w-full max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AdminBreadcrumb 
                items={[
                  { label: club.name, href: `/clubs/${clubId}` },
                  { label: 'Edit Profile' }
                ]} 
                className="mb-6"
              />

              {/* Recruitment Status Card */}
              <RecruitmentStatusCard
                clubId={clubId!}
                clubName={club.name}
                currentStatus={club.recruitingStatus || "closed"}
                currentCycle={club.recruitment_cycle || "none"}
                onUpdate={refetchClub}
              />


              <div className="premium-card p-6 mt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <ClubImageUpload
                      clubId={clubId!}
                      currentImageUrl={coverImageUrl}
                      onImageUploaded={setCoverImageUrl}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell people about your club..."
                              className="min-h-[150px] resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Describe your club's mission, activities, and what makes it special.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Contact Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="club@ucsd.edu"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="@yourclub"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Username or full URL
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Linkedin className="w-4 h-4" />
                              LinkedIn
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://linkedin.com/company/yourclub"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Full URL or username
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Website
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="url"
                                placeholder="https://yourclub.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/clubs/${clubId}`)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="gold"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
