import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, Mail, CheckCircle2, LogIn } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

const claimSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
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
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      name: "",
      proofLink: "",
    },
  });

  const onSubmit = async (data: ClaimFormData) => {
    if (!user) {
      toast.error("You must be logged in to claim a club");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { data: response, error } = await supabase.functions.invoke('verify-club-claim', {
        body: {
          action: 'send-verification',
          name: data.name.trim(),
          clubName,
          clubId,
          proofLink: data.proofLink?.trim() || null,
          redirectUrl: window.location.origin,
        },
      });

      // When edge function returns non-2xx, supabase-js puts the response body in error.context
      if (error) {
        // Try to extract the actual error message from the response body
        let errorMessage = 'Failed to submit claim request';
        try {
          // supabase-js FunctionsHttpError stores the response in context
          const errorBody = await (error as any)?.context?.json?.();
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          // If we can't parse the error context, use the generic message
          if (error.message && !error.message.includes('non-2xx')) {
            errorMessage = error.message;
          }
        }
        throw new Error(errorMessage);
      }

      if (response?.error) {
        throw new Error(response.error);
      }

      setSentEmail(user.email || '');
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

  // Not logged in state
  if (!authLoading && !user) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/10 border border-gold/20 mb-4">
              <LogIn className="w-7 h-7 text-gold" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-center">Login Required</DialogTitle>
              <DialogDescription className="text-center">
                You need to be logged in to claim ownership of <span className="font-medium text-foreground">{clubName}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 p-4 rounded-lg bg-muted/50 text-left">
              <h4 className="text-sm font-medium text-foreground mb-2">Why do I need to login?</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  Ensures only verified users can claim clubs
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  Links ownership to your account securely
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  Enables email verification via your account
                </li>
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={() => {
                  handleClose();
                  navigate('/login');
                }}
                className="flex-1"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
              Link expires in 1 hour. Check your spam folder if you don't see it.
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
                We'll send a verification link to <span className="font-medium text-foreground">{user?.email}</span> to confirm ownership.
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
