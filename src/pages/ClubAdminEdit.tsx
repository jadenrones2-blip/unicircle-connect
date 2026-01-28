import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Save, Instagram, Mail, Globe } from "lucide-react";
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
import { useClubs } from "@/hooks/useExternalDB";
import { supabase } from "@/integrations/supabase/client";
import { ClubImageUpload } from "@/components/club-admin/ClubImageUpload";

const clubEditSchema = z.object({
  description: z.string().max(2000, "Description must be under 2000 characters").optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  instagram: z.string().max(100).optional().or(z.literal("")),
  website: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
});

type ClubEditFormData = z.infer<typeof clubEditSchema>;

export default function ClubAdminEdit() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { ownedClubs, loading: ownershipLoading, isOwnerOf } = useClubOwnership();
  const { data: clubs, loading: clubsLoading } = useClubs();
  const [isSaving, setIsSaving] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const club = clubs.find((c) => c.id === clubId);
  const ownership = ownedClubs.find((o) => o.clubId === clubId);

  const form = useForm<ClubEditFormData>({
    resolver: zodResolver(clubEditSchema),
    defaultValues: {
      description: "",
      email: "",
      instagram: "",
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
        website: club.website || "",
      });
      setCoverImageUrl((club as any).cover_image || null);
    }
  }, [club, form]);

  // Check authorization
  useEffect(() => {
    if (!ownershipLoading && clubId && !isOwnerOf(clubId)) {
      toast.error("You don't have permission to edit this club");
      navigate("/club-admin");
    }
  }, [ownershipLoading, clubId, isOwnerOf, navigate]);

  const onSubmit = async (data: ClubEditFormData) => {
    if (!clubId) return;

    setIsSaving(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("external-db-proxy", {
        body: {
          table: "clubs",
          action: "update",
          id: clubId,
          record: {
            description: data.description || null,
            email: data.email || null,
            instagram: data.instagram || null,
            website: data.website || null,
            cover_image: coverImageUrl || null,
          },
        },
      });

      if (error || response?.error) {
        throw new Error(response?.error || error?.message || "Failed to update club");
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

  if (ownershipLoading || clubsLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <ClubAdminSidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!club || !ownership) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <ClubAdminSidebar />
          <main className="flex-1 p-8">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Club not found</h2>
              <Button variant="outline" asChild>
                <Link to="/club-admin">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
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

          <div className="p-6 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link
                to="/club-admin"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>

              <div className="premium-card p-6">
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
