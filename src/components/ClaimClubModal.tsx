import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";

const claimSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  proofLink: z.string().trim().url("Must be a valid URL").max(500).optional().or(z.literal("")),
});

type ClaimFormData = z.infer<typeof claimSchema>;

interface ClaimClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubName: string;
  clubId: string;
}

const ClaimClubModal = ({ isOpen, onClose, clubName, clubId }: ClaimClubModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      name: "",
      email: "",
      proofLink: "",
    },
  });

  const onSubmit = async (data: ClaimFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("club_claim_requests")
        .insert({
          club_id: clubId,
          club_name: clubName,
          name: data.name.trim(),
          email: data.email.trim(),
          proof_link: data.proofLink?.trim() || null,
        });

      if (error) throw error;

      toast.success("Claim request submitted! We'll review it and get back to you.");
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error submitting claim request:", error);
      toast.error("Failed to submit claim request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold" />
            Claim {clubName}
          </DialogTitle>
          <DialogDescription>
            Are you a leader of this club? Submit a claim request to manage this profile.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Preferably your official club email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proofLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proof Link (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://instagram.com/yourclub" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Link to your club's official social media or website
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Claim"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimClubModal;
