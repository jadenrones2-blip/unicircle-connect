import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, ExternalLink, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const CATEGORY_OPTIONS = [
  'Academic',
  'Cultural',
  'Greek Life',
  'Professional',
  'Service',
  'Social',
  'Spiritual',
  'Sports',
  'Tech / STEM',
  'Other',
];

const formSchema = z.object({
  clubName: z
    .string()
    .min(3, 'Club name must be at least 3 characters')
    .max(100, 'Club name must be less than 100 characters'),
  clubDescription: z.string().max(500, 'Description must be less than 500 characters').optional(),
  clubCategory: z.string().min(1, 'Please select a category'),
  proofLink: z.string().url('Please enter a valid URL'),
  additionalNotes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RequestNewClubModalProps {
  trigger?: React.ReactNode;
}

export default function RequestNewClubModal({ trigger }: RequestNewClubModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const userEmail = user?.email || '';
  const isEduEmail = userEmail.endsWith('.edu');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clubName: '',
      clubDescription: '',
      clubCategory: '',
      proofLink: '',
      additionalNotes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user || !isEduEmail) {
      toast({
        title: 'Ineligible',
        description: 'You must have a .edu email to submit a new club request.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('new_club_requests').insert({
        user_id: user.id,
        user_email: userEmail,
        club_name: values.clubName,
        club_description: values.clubDescription || null,
        club_category: values.clubCategory,
        proof_link: values.proofLink,
        additional_notes: values.additionalNotes || null,
      });

      if (error) throw error;

      toast({
        title: 'Request submitted!',
        description: "We'll review your club request and add it to the directory once verified.",
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error submitting club request:', error);
      toast({
        title: 'Submission failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Request New Club
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a New Club</DialogTitle>
          <DialogDescription>
            Can't find your club in the directory? Submit a request to add it.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please log in with your .edu email to submit a new club request.
            </AlertDescription>
          </Alert>
        ) : !isEduEmail ? (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Only users with a .edu email can submit new club requests. Your current email (
              {userEmail}) is not eligible.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clubName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Robotics Club" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clubCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clubDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of what the club does..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
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
                    <FormLabel>Proof of Affiliation *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-university.edu/clubs/..." {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center gap-1 text-xs">
                      <ExternalLink className="w-3 h-3" />
                      Link to your club's official university page or social media
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any other info to help us verify this club..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
