import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().trim().email({ message: 'Please enter a valid email address' });

interface WaitlistFormProps {
  variant?: 'default' | 'compact';
}

const WaitlistForm = ({ variant = 'default' }: WaitlistFormProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error: insertError } = await supabase.from('waitlist').insert({ email: result.data });

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation - email already exists
          setError("You're already on the waitlist!");
        } else {
          throw insertError;
        }
        setIsLoading(false);
        return;
      }

      // Send confirmation email via edge function
      try {
        const { error: emailError } = await supabase.functions.invoke('notify-waitlist-signup', {
          body: { email: result.data },
        });
        if (emailError) {
          console.error('Email notification error:', emailError);
        }
      } catch (emailErr) {
        // Don't fail the signup if email fails
        console.error('Email notification failed:', emailErr);
      }

      setIsLoading(false);
      setIsSuccess(true);
      setEmail('');

      toast({
        title: "You're on the list!",
        description: "We'll notify you when Unicircle launches.",
      });
    } catch (err) {
      console.error('Waitlist signup error:', err);
      setIsLoading(false);
      setError('Something went wrong. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 text-gold"
      >
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">You're on the waitlist!</span>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div
        className={`flex ${variant === 'compact' ? 'flex-row gap-2' : 'flex-col sm:flex-row gap-3'}`}
      >
        <div className="flex-1">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            className={`h-12 bg-background/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-gold focus:ring-gold/20 ${
              error ? 'border-red-400' : ''
            }`}
            disabled={isLoading}
          />
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-red-400 text-sm mt-1.5 text-left"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="h-12 px-6 group whitespace-nowrap"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Join Waitlist
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default WaitlistForm;
