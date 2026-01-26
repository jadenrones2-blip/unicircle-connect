import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, Mail, CheckCircle2 } from "lucide-react";
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
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

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
      const { data: response, error } = await supabase.functions.invoke('verify-club-claim', {
        body: {
          action: 'send-verification',
          email: data.email.trim(),
          name: data.name.trim(),
          clubName,
          clubId,
          proofLink: data.proofLink?.trim() || null,
          redirectUrl: window.location.origin,
        },
      });

      if (error || response?.error) {
        throw new Error(response?.error || error?.message || 'Failed to submit claim');
      }

      setSentEmail(data.email);
      setEmailSent(true);
      form.reset();
    } catch (error: any) {
      console.error("Error submitting claim request:", error);
      toast.error(error.message || "Failed to submit claim request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmailSent(false);
    setSentEmail("");
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {emailSent ? (
          /* Success State - Email Sent */
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <Mail className="w-7 h-7 text-green-500" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-center">Check Your Email</DialogTitle>
              <DialogDescription className="text-center">
                We've sent a verification link to <span className="font-medium text-foreground">{sentEmail}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-6 p-4 rounded-lg bg-muted/50 text-left">
              <h4 className="text-sm font-medium text-foreground mb-2">Next steps:</h4>
              <ol className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-gold font-medium">1.</span>
                  Open the email we just sent
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold font-medium">2.</span>
                  Click the verification link
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold font-medium">3.</span>
                  Start managing your club!
                </li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Link expires in 24 hours. Check your spam folder if you don't see it.
            </p>

            <Button
              variant="outline"
              onClick={handleClose}
              className="mt-6 w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          /* Form State */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold" />
                Claim {clubName}
              </DialogTitle>
              <DialogDescription>
                Verify your email to become the owner of this club and manage its events.
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
                        We'll send a verification link to this email
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
                    onClick={handleClose}
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
                        Sending...
                      </>
                    ) : (
                      "Send Verification"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClaimClubModal;
