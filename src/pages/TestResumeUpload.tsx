import ResumeUploadStep from '@/components/onboarding/ResumeUploadStep';
import { toast } from 'sonner';

export default function TestResumeUpload() {
  const handleKeywordsExtracted = (keywords: {
    career_goals: string[];
    interests: string[];
    skills: string[];
    vibe: string[];
  }) => {
    console.log('Extracted keywords:', keywords);
    toast.success('Keywords extracted successfully! Check console for details.');
  };

  const handleSkip = () => {
    toast.info('Skipped resume upload');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Test Page - No Auth Required
          </span>
        </div>
        <ResumeUploadStep
          onKeywordsExtracted={handleKeywordsExtracted}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}
