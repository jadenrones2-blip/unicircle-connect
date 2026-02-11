import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker using local copy via Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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

export default function ResumeUploadStep({ onKeywordsExtracted, onSkip }: ResumeUploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedKeywords, setExtractedKeywords] = useState<ExtractedKeywords | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  };

  const extractTextFromTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['text/plain', 'application/pdf'];
    const isValidType = validTypes.includes(selectedFile.type) || 
      selectedFile.name.endsWith('.txt') || 
      selectedFile.name.endsWith('.pdf');

    if (!isValidType) {
      toast.error('Please upload a .txt or .pdf file');
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setExtractedKeywords(null);
    setProcessing(true);

    try {
      let text: string;

      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        try {
          text = await extractTextFromPDF(selectedFile);
        } catch (pdfError) {
          console.error('Error parsing PDF:', pdfError);
          toast.error('Could not parse PDF. Please try a different file or use a .txt file.');
          setProcessing(false);
          setFile(null);
          return;
        }
      } else {
        text = await extractTextFromTextFile(selectedFile);
      }

      if (!text || text.trim().length < 50) {
        toast.error('Could not extract enough text from the file. Try pasting your resume content instead.');
        setProcessing(false);
        setFile(null);
        return;
      }

      // Send to edge function for AI extraction
      const { data, error } = await supabase.functions.invoke('extract-resume-keywords', {
        body: { resumeText: text },
      });

      if (error) {
        console.error('Error extracting keywords:', error);
        toast.error('Failed to analyze resume. Please try again.');
        setFile(null);
      } else if (data?.keywords) {
        setExtractedKeywords(data.keywords);
        toast.success('Resume analyzed successfully!');
      } else {
        toast.error('No keywords could be extracted from the resume.');
        setFile(null);
      }
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error('Failed to process file. Please try again.');
      setFile(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setExtractedKeywords(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (extractedKeywords) {
      onKeywordsExtracted(extractedKeywords);
    }
  };

  const totalKeywords = extractedKeywords
    ? extractedKeywords.career_goals.length +
      extractedKeywords.interests.length +
      extractedKeywords.skills.length +
      extractedKeywords.vibe.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          <Sparkles className="h-3 w-3 text-primary" />
          Optional: Boost your matches
        </span>
      </div>

      {/* Question */}
      <h1 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
        Want even better club recommendations?
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        Upload your resume and we'll match you with clubs that fit your experience.
        <br />
        <span className="text-xs opacity-75">Your file is processed securely and not stored.</span>
      </p>

      {/* Upload area */}
      {!file && !processing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-1">
            Drop your resume here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports PDF and .txt files (max 5MB)
          </p>
        </motion.div>
      )}

      {/* Processing state */}
      {processing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-2 border-primary/30 bg-primary/5 rounded-xl p-8 text-center"
        >
          <Loader2 className="h-10 w-10 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-foreground font-medium mb-1">
            Analyzing your resume...
          </p>
          <p className="text-sm text-muted-foreground">
            Extracting keywords to improve your matches
          </p>
        </motion.div>
      )}

      {/* File uploaded state */}
      {file && !processing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Extracted keywords preview */}
          {extractedKeywords && totalKeywords > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Found {totalKeywords} matching keywords</span>
              </div>

              {extractedKeywords.career_goals.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Career Goals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedKeywords.career_goals.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedKeywords.interests.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedKeywords.interests.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gold/10 text-gold text-xs rounded-full">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedKeywords.skills.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedKeywords.skills.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-muted text-foreground text-xs rounded-full">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedKeywords.vibe.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vibe</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedKeywords.vibe.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-muted text-foreground text-xs rounded-full">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {extractedKeywords && totalKeywords === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No keywords could be extracted. You can skip this step or try a different file.
            </p>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Skip this step
        </Button>

        {extractedKeywords && totalKeywords > 0 && (
          <Button
            onClick={handleConfirm}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Use these matches
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
