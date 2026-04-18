import { motion } from 'framer-motion';
import { FileText, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExtractedKeywords {
  career_goals: string[];
  interests: string[];
  skills: string[];
  vibe: string[];
}

interface ResumeUploadStepProps {
  onKeywordsExtracted: (keywords: ExtractedKeywords) => void;
  onSkip: () => void;
}

export default function ResumeUploadStep({ onSkip }: ResumeUploadStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          <Sparkles className="h-3 w-3 text-primary" />
          Optional: Boost your matches
        </span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
        Want even better club recommendations?
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        Resume-based matching is coming soon — we'll use it to surface clubs that fit your experience and goals.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-dashed border-[#F5C842]/20 bg-[#F5C842]/5 rounded-2xl p-10 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#F5C842]/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-7 w-7 text-[#F5C842]" />
        </div>
        <p className="text-foreground font-semibold text-lg mb-1">Resume upload</p>
        <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[#F5C842]/10 text-[#F5C842] border border-[#F5C842]/20 mb-3">
          Coming soon
        </span>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          We're building resume-based club matching. Skip for now — you can add it later from your profile.
        </p>
      </motion.div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={onSkip}
          className="bg-[#F5C842] hover:bg-[#F5C842]/90 text-zinc-900 font-bold px-8"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
