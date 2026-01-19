import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useClubs, submitInterest } from "@/hooks/useExternalDB";

interface ExpressInterestFormProps {
  preselectedClubId?: string;
  onSuccess?: () => void;
  showClubSelector?: boolean;
}

const ExpressInterestForm = ({ 
  preselectedClubId, 
  onSuccess,
  showClubSelector = true 
}: ExpressInterestFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    clubId: preselectedClubId || "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const { data: clubs, loading: clubsLoading } = useClubs();

  const selectedClub = clubs.find(c => c.id === formData.clubId);

  // Update clubId when preselectedClubId changes
  useEffect(() => {
    if (preselectedClubId) {
      setFormData(prev => ({ ...prev, clubId: preselectedClubId }));
    }
  }, [preselectedClubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await submitInterest({
      name: formData.name,
      email: formData.email,
      clubId: formData.clubId,
      clubName: selectedClub?.name || "",
      message: formData.message,
    });
    
    setIsSubmitting(false);

    if (result.success) {
      setIsSubmitted(true);
      
      toast({
        title: "Interest Submitted!",
        description: selectedClub 
          ? `${selectedClub.name} will reach out to you soon.`
          : "We'll connect you with the right club soon.",
      });

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } else {
      toast({
        title: "Submission Failed",
        description: result.error || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleClubChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      clubId: value
    }));
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-8"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-display font-semibold text-foreground">You're on the list!</h3>
        <p className="text-muted-foreground text-center mt-2">
          {selectedClub 
            ? `${selectedClub.name} will reach out to you with next steps.`
            : "The club will reach out to you with next steps."
          }
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            name="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            required
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john@university.edu"
            value={formData.email}
            onChange={handleChange}
            required
            className="bg-background"
          />
        </div>
      </div>
      
      {showClubSelector && (
        <div className="space-y-2">
          <Label htmlFor="club">Select Club *</Label>
          {clubsLoading ? (
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading clubs...</span>
            </div>
          ) : (
            <Select 
              value={formData.clubId} 
              onValueChange={handleClubChange}
              required
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose a club to join" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {clubs.map((club) => (
                  <SelectItem 
                    key={club.id} 
                    value={club.id}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{club.name}</span>
                      <span className="text-xs text-muted-foreground">({club.category})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="message">Why are you interested? (Optional)</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Tell us a bit about yourself and why you'd like to join..."
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className="bg-background resize-none"
        />
      </div>

      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        disabled={isSubmitting || clubsLoading || (!preselectedClubId && showClubSelector && !formData.clubId)}
      >
        {isSubmitting ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
          />
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Submit Interest
          </>
        )}
      </Button>
    </form>
  );
};

export default ExpressInterestForm;
