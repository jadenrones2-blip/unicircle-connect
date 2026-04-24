import { useState, useRef } from 'react';
import { Upload, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

// Resize image to max 1200px wide, JPEG 0.82 quality — reduces 5MB flyers to ~150KB
async function resizeImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX) {
        height = Math.round((height * MAX) / width);
        width = MAX;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      // Strip the data:image/...;base64, prefix — edge function expects raw base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

export function FlyerAutoFill({ onExtracted, disabled }: FlyerAutoFillProps) {
  const [extracting, setExtracting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExtractedEventData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be under 20MB');
      return;
    }

    // Show a small preview using object URL (fast, no base64 overhead)
    const previewObjectUrl = URL.createObjectURL(file);
    setPreviewUrl(previewObjectUrl);
    setExtracting(true);
    setLastResult(null);

    try {
      // Resize before sending — dramatically reduces payload and AI latency
      const base64Data = await resizeImageToBase64(file);
      await extractEventDetails(base64Data);
    } catch (err) {
      console.error('Flyer processing error:', err);
      toast.error('Failed to process image. Please try again.');
      setExtracting(false);
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const extractEventDetails = async (imageBase64: string) => {
    try {
      // Get user auth token — edge function requires Bearer token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to use flyer auto-fill');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-event-from-flyer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ imageBase64 }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Authentication error. Please refresh and try again.');
          return;
        }
        if (response.status === 429) {
          toast.error('Rate limit hit. Please wait a moment and try again.');
          return;
        }
        // Read body to get actual error message
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Extraction failed');


      const data = result.data as ExtractedEventData;
      setLastResult(data);

      const extractedCount = [data.title, data.date, data.time, data.location, data.description].filter(Boolean).length;
      if (extractedCount === 0) {
        toast.warning("Couldn't read any details. Try a clearer image.");
      } else {
        toast.success(`Auto-filled ${extractedCount} field${extractedCount > 1 ? 's' : ''} from flyer`);
        onExtracted(data);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      toast.error(err?.message || 'Failed to extract event details. Please fill in manually.');
    } finally {
      setExtracting(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLastResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              className={cn('w-full h-32 object-cover transition-opacity', extracting && 'opacity-50')}
            />
            {extracting && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  <span className="text-sm font-medium text-foreground">Analyzing flyer…</span>
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
              <div className="flex items-center gap-2 text-sm text-green-500">
                <Check className="w-4 h-4" />
                <span className="font-medium">Fields auto-filled from flyer</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {[
                  lastResult.title && 'Title',
                  lastResult.date && 'Date',
                  lastResult.time && 'Time',
                  lastResult.location && 'Location',
                  lastResult.description && 'Description',
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || extracting}
          className={cn(
            'w-full p-4 border-2 border-dashed border-gold/30 rounded-lg flex items-center gap-4 transition-all',
            'hover:border-gold/60 hover:bg-gold/5',
            (disabled || extracting) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="text-left">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              Auto-fill from Flyer
              <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-normal">AI</span>
            </h4>
            <p className="text-sm text-muted-foreground">Upload a flyer or Instagram screenshot</p>
          </div>
          <Upload className="w-5 h-5 text-muted-foreground ml-auto" />
        </button>
      )}
    </div>
  );
}
