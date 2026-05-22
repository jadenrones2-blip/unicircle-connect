import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, X, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedKeywords {
  career_goals: string[];
  interests: string[];
  skills: string[];
  vibe: string[];
}

interface Props {
  onKeywordsExtracted: (keywords: ExtractedKeywords) => void;
  onSkip: () => void;
}

export default function ResumeUploadStep({ onKeywordsExtracted, onSkip }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      toast.error('Please upload a PDF.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Resume must be under 10 MB.');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Not signed in');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Step 1 — upload the file
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch(`${supabaseUrl}/functions/v1/upload-resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    }).catch(() => null);

    setUploading(false);

    if (!uploadRes?.ok) {
      const err = await uploadRes?.json().catch(() => ({}));
      toast.error(err?.error || 'Upload failed — please try again.');
      return;
    }

    // Step 2 — parse the resume with Claude
    setParsing(true);
    const parseRes = await fetch(`${supabaseUrl}/functions/v1/parse-resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => null);

    setParsing(false);

    if (!parseRes?.ok) {
      // Upload succeeded but parsing failed — still continue with no keywords
      toast.error(
        'Resume saved, but keyword extraction failed. You can re-analyze from your profile.'
      );
      onKeywordsExtracted({ career_goals: [], interests: [], skills: [], vibe: [] });
      return;
    }

    const { signals = [] } = await parseRes.json().catch(() => ({ signals: [] }));

    setDone(true);

    // Distribute flat signals into categories for interest matching
    const keywords: ExtractedKeywords = {
      career_goals: [],
      interests: signals,
      skills: [],
      vibe: [],
    };

    // Brief pause so the success state is visible before navigating
    setTimeout(() => onKeywordsExtracted(keywords), 900);
  };

  // ── Done state ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-display font-bold text-white">Resume analyzed!</h2>
        <p className="text-zinc-500 text-sm">Building your personalized recommendations…</p>
        <Loader2 className="w-5 h-5 animate-spin text-gold mx-auto" />
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <span className="inline-block text-xs text-zinc-500 tracking-widest uppercase mb-4">
          Step 5 of 5 · Optional
        </span>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Upload your resume</h1>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
          We'll analyze it to surface clubs that match your background — takes about 10 seconds.
        </p>
      </div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-gold bg-gold/10'
            : file
              ? 'border-gold/40 bg-gold/5 cursor-default'
              : 'border-white/10 hover:border-gold/30 hover:bg-gold/5'
        }`}
      >
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{file.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {(file.size / 1024).toFixed(0)} KB · PDF
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors mt-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Upload className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-zinc-300 font-medium text-sm">Drop your resume here</p>
              <p className="text-zinc-600 text-xs mt-0.5">
                or click to browse · PDF only · max 10 MB
              </p>
            </div>
          </div>
        )}
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
          e.target.value = '';
        }}
      />

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          onClick={handleUpload}
          disabled={!file || uploading || parsing}
          className="w-full bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-40 py-3"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : parsing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing with AI…
            </>
          ) : (
            <>
              Analyze & Continue <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>

        <button
          onClick={onSkip}
          disabled={uploading || parsing}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2 disabled:opacity-40"
        >
          Skip — I'll do this later from my profile
        </button>
      </div>
    </div>
  );
}
