import { useState, useRef } from 'react';
import { Sparkles, Upload, Loader2, Check, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ExtractedEventData {
  title: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  description: string | null;
}

interface FlyerAutoFillProps {
  onExtracted: (data: ExtractedEventData) => void;
  disabled?: boolean;
}

export function FlyerAutoFill({ onExtracted, disabled }: FlyerAutoFillProps) {
  const [extracting, setExtracting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExtractedEventData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB for flyers)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreviewUrl(base64);

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = base64.split(',')[1];
      await extractEventDetails(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const extractEventDetails = async (imageBase64: string) => {
    setExtracting(true);
    setLastResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-event-from-flyer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ imageBase64 }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('AI credits exhausted. Please contact support.');
          return;
        }
        throw new Error('Failed to extract event details');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Extraction failed');
      }

      const data = result.data as ExtractedEventData;
      setLastResult(data);

      // Count how many fields were extracted
      const extractedFields = [
        data.title,
        data.date,
        data.time,
        data.location,
        data.description,
      ].filter(Boolean).length;

      if (extractedFields === 0) {
        toast.warning("Couldn't extract any details. Try a clearer image.");
      } else {
        toast.success(`Extracted ${extractedFields} field${extractedFields > 1 ? 's' : ''} from flyer!`);
        onExtracted(data);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      toast.error('Failed to extract event details. Please fill manually.');
    } finally {
      setExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setLastResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || extracting}
      />

      {previewUrl ? (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={previewUrl}
              alt="Flyer preview"
              className={cn(
                "w-full h-32 object-cover transition-opacity",
                extracting && "opacity-50"
              )}
            />
            {extracting && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  <span className="text-sm font-medium text-foreground">
                    Analyzing flyer...
                  </span>
                </div>
              </div>
            )}
            {!extracting && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleClear}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {lastResult && !extracting && (
            <div className="mt-2 p-2 rounded-md bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span className="font-medium">Fields auto-filled from flyer</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {[
                  lastResult.title && 'Title',
                  lastResult.date && 'Date',
                  lastResult.time && 'Time',
                  lastResult.location && 'Location',
                  lastResult.description && 'Description',
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || extracting}
          className={cn(
            "w-full p-4 border-2 border-dashed border-gold/30 rounded-lg flex items-center gap-4 transition-all",
            "hover:border-gold/60 hover:bg-gold/5",
            (disabled || extracting) && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-gold" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              Auto-fill from Flyer
              <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-normal">
                AI-powered
              </span>
            </h4>
            <p className="text-sm text-muted-foreground">
              Upload a screenshot of your event flyer or Instagram post
            </p>
          </div>
          <Upload className="w-5 h-5 text-muted-foreground ml-auto" />
        </button>
      )}
    </div>
  );
}
