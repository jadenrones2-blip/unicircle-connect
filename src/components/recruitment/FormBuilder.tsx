import { useState, useEffect, useRef } from 'react';
import {
  DndContext, DragEndEvent, closestCenter,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Trash2, Eye, Save, Loader2,
  AlignLeft, AlignJustify, ListChecks, Copy, Upload, X, Video,
  ChevronDown, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { FormQuestion } from '@/hooks/useRecruitment';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormRecord {
  id: string;
  form_name: string;
  is_active: boolean;
  questions: FormQuestion[];
}

interface FormBuilderProps {
  clubId: string;
  // Legacy props kept for compatibility — FormBuilder now manages forms internally
  fetchForm?: () => Promise<FormQuestion[]>;
  saveForm?: (questions: FormQuestion[]) => Promise<boolean>;
}

const TYPES = [
  { value: 'short' as const, label: 'Short', icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { value: 'long' as const, label: 'Long', icon: <AlignJustify className="w-3.5 h-3.5" /> },
  { value: 'multiple_choice' as const, label: 'Multiple Choice', icon: <ListChecks className="w-3.5 h-3.5" /> },
  { value: 'video' as const, label: 'Video', icon: <Video className="w-3.5 h-3.5" /> },
];

const VIDEO_DURATION_OPTIONS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
];

// ─── Text parser ──────────────────────────────────────────────────────────────

function parseQuestionsFromText(raw: string): FormQuestion[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: FormQuestion[] = [];
  let i = 0;

  while (i < lines.length) {
    // Strip leading numbering: "1." "1)" "Q1." "Question 1:" etc.
    const questionText = lines[i]
      .replace(/^[Qq]uestion\s*\d+[.):\s]\s*/i, '')
      .replace(/^[Qq]?\d+[.)]\s*/, '')
      .trim();

    if (!questionText) { i++; continue; }

    // Look ahead for option lines: a) b) c) / A. B. / - or • or *
    const optionLines: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const nl = lines[j].trim();
      const optMatch = nl.match(/^[a-eA-E][.)]\s+(.+)/);
      const bulletMatch = nl.match(/^[-•*◦]\s+(.+)/);
      if (optMatch) { optionLines.push(optMatch[1].trim()); j++; }
      else if (bulletMatch) { optionLines.push(bulletMatch[1].trim()); j++; }
      else break;
    }

    if (optionLines.length >= 2) {
      questions.push({
        id: crypto.randomUUID(),
        type: 'multiple_choice',
        label: questionText,
        required: false,
        options: optionLines,
      });
      i = j;
    } else {
      const isLong =
        questionText.length > 80 ||
        /\b(describe|explain|tell us|elaborate|discuss|write|share|summarize|why do you|how do you|what is your experience|what motivates)\b/i.test(questionText);
      questions.push({
        id: crypto.randomUUID(),
        type: isLong ? 'long' : 'short',
        label: questionText,
        required: false,
        options: [],
      });
      i++;
    }
  }

  return questions;
}

// ─── File text extractor ──────────────────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n';
    }
    return text;
  }

  throw new Error('Unsupported file type. Please use .txt, .docx, or .pdf');
}

// ─── Inline Question Card ─────────────────────────────────────────────────────

interface CardProps {
  question: FormQuestion;
  onChange: (id: string, updates: Partial<FormQuestion>) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  focusOnMount?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: { attributes: any; listeners: any };
}

function InlineQuestionCard({
  question, onChange, onDelete, onDuplicate, focusOnMount, dragHandleProps,
}: CardProps) {
  const labelRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (focusOnMount) setTimeout(() => labelRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setType = (type: FormQuestion['type']) => {
    const updates: Partial<FormQuestion> = { type };
    if (type === 'multiple_choice' && question.options.length === 0) {
      updates.options = [''];
    }
    onChange(question.id, updates);
  };

  const updateOption = (idx: number, value: string) => {
    const next = [...question.options];
    next[idx] = value;
    onChange(question.id, { options: next });
  };

  const addOptionAfter = (idx: number) => {
    const next = [...question.options];
    next.splice(idx + 1, 0, '');
    onChange(question.id, { options: next });
    setTimeout(() => optionRefs.current[idx + 1]?.focus(), 0);
  };

  const removeOption = (idx: number) => {
    if (question.options.length <= 1) return;
    const next = question.options.filter((_, i) => i !== idx);
    onChange(question.id, { options: next });
    setTimeout(() => optionRefs.current[Math.max(0, idx - 1)]?.focus(), 0);
  };

  const options = question.options.length > 0 ? question.options : [''];

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 space-y-3 group">
      {/* Top row: drag handle + question text + actions */}
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className="mt-2 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 shrink-0 transition-colors"
            tabIndex={-1}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <input
          ref={labelRef}
          value={question.label}
          onChange={(e) => onChange(question.id, { label: e.target.value })}
          placeholder="Question text"
          className="flex-1 bg-transparent text-white placeholder:text-zinc-600 text-sm font-medium focus:outline-none border-b border-transparent focus:border-white/20 py-1 transition-colors min-w-0"
        />

        {onDuplicate && (
          <button
            onClick={() => onDuplicate(question.id)}
            title="Duplicate"
            className="mt-1 p-1.5 text-zinc-700 hover:text-zinc-300 transition-colors rounded shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(question.id)}
          title="Delete"
          className="mt-1 p-1.5 text-zinc-700 hover:text-red-400 transition-colors rounded shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Type pills */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPES.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              question.type === value
                ? 'bg-gold/15 border-gold/40 text-gold'
                : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Video config */}
      {question.type === 'video' && (
        <div className="space-y-2.5 pl-2 border-l-2 border-white/5">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Max recording duration</p>
            <div className="flex gap-1.5 flex-wrap">
              {VIDEO_DURATION_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange(question.id, { maxDuration: value })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    (question.maxDuration ?? 60) === value
                      ? 'bg-gold/15 border-gold/40 text-gold'
                      : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Prompt shown while recording (optional)</p>
            <input
              value={question.videoPrompt || ''}
              onChange={(e) => onChange(question.id, { videoPrompt: e.target.value })}
              placeholder="e.g. Introduce yourself in 60 seconds"
              className="w-full bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-white/20 py-1 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Multiple choice options */}
      {question.type === 'multiple_choice' && (
        <div className="space-y-1.5 pl-2">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-zinc-600 shrink-0" />
              <input
                ref={(el) => { optionRefs.current[idx] = el; }}
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addOptionAfter(idx); }
                  if (e.key === 'Backspace' && !opt && options.length > 1) { e.preventDefault(); removeOption(idx); }
                }}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-white/15 py-0.5 transition-colors"
              />
              {options.length > 1 && (
                <button
                  onClick={() => removeOption(idx)}
                  className="text-zinc-700 hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const next = [...options, ''];
              onChange(question.id, { options: next });
              setTimeout(() => optionRefs.current[next.length - 1]?.focus(), 0);
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors pl-5 pt-0.5"
          >
            <Plus className="w-3 h-3" /> Add option
          </button>
        </div>
      )}

      {/* Required toggle */}
      <div className="flex items-center gap-2 pt-1.5 border-t border-white/5">
        <Switch
          checked={question.required}
          onCheckedChange={(checked) => onChange(question.id, { required: checked })}
          className="data-[state=checked]:bg-gold"
        />
        <span className="text-xs text-zinc-500">Required</span>
      </div>
    </div>
  );
}

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableInlineCard(props: Omit<CardProps, 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.question.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50 z-50 relative' : ''}
    >
      <InlineQuestionCard
        {...props}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

// ─── Import Questions Modal ───────────────────────────────────────────────────

function ImportQuestionsModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (questions: FormQuestion[]) => void;
}) {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<FormQuestion[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = async () => {
    setProcessing(true);
    try {
      let text = '';
      if (tab === 'paste') {
        text = pasteText;
      } else if (file) {
        text = await extractTextFromFile(file);
      }
      const results = parseQuestionsFromText(text);
      if (results.length === 0) {
        toast.error('No questions detected. Try numbering them like "1. Your question".');
      } else {
        setParsed(results);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse questions');
    } finally {
      setProcessing(false);
    }
  };

  const updateParsed = (id: string, updates: Partial<FormQuestion>) => {
    setParsed(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteParsed = (id: string) => {
    setParsed(prev => prev.filter(q => q.id !== id));
  };

  const handleImport = () => {
    const cleaned = parsed.map(q => ({
      ...q,
      label: q.label.trim(),
      options: q.type === 'multiple_choice' ? q.options.filter(o => o.trim()) : [],
    }));
    onImport(cleaned);
    setPasteText('');
    setFile(null);
    setParsed([]);
    onClose();
  };

  const reset = () => {
    setPasteText('');
    setFile(null);
    setParsed([]);
  };

  const canParse = tab === 'paste' ? pasteText.trim().length > 0 : file !== null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Import Questions</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-zinc-900 border border-white/10 w-fit">
            {(['paste', 'upload'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); reset(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t === 'paste' ? 'Paste Text' : 'Upload File'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'paste' ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Paste questions one per line. Number them for clarity. Add options on the next lines
                starting with <code className="bg-zinc-900 px-1 rounded text-zinc-400">a)</code> or{' '}
                <code className="bg-zinc-900 px-1 rounded text-zinc-400">-</code> to create multiple choice questions.
              </p>
              <Textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setParsed([]); }}
                placeholder={`1. What is your major?\n2. Why do you want to join our club?\n3. Preferred meeting time?\na) Morning\nb) Afternoon\nc) Evening`}
                rows={8}
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 text-sm resize-none font-mono"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                Upload a <code className="bg-zinc-900 px-1 rounded text-zinc-400">.txt</code>,{' '}
                <code className="bg-zinc-900 px-1 rounded text-zinc-400">.docx</code>, or{' '}
                <code className="bg-zinc-900 px-1 rounded text-zinc-400">.pdf</code> file containing your questions.
                Text is extracted client-side — nothing is uploaded.
              </p>
              <label className="flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed border-white/10 cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-colors">
                <Upload className="w-6 h-6 text-zinc-500" />
                <div className="text-center">
                  <p className="text-sm text-zinc-400">
                    {file ? file.name : 'Click to select a file'}
                  </p>
                  {file ? (
                    <p className="text-xs text-zinc-600 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                  ) : (
                    <p className="text-xs text-zinc-600 mt-0.5">.txt · .docx · .pdf</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setParsed([]); }}
                />
              </label>
            </div>
          )}

          {/* Parse button */}
          {canParse && parsed.length === 0 && (
            <Button
              onClick={handleParse}
              disabled={processing}
              className="w-full bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10"
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {processing ? 'Parsing…' : 'Detect Questions'}
            </Button>
          )}

          {/* Parsed preview */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400">
                  {parsed.length} question{parsed.length !== 1 ? 's' : ''} detected — tweak types and options before adding
                </p>
                <button
                  onClick={reset}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {parsed.map(q => (
                  <InlineQuestionCard
                    key={q.id}
                    question={q}
                    onChange={updateParsed}
                    onDelete={deleteParsed}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-white/10 mt-2 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsed.length === 0}
            className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add {parsed.length > 0 ? parsed.length : ''} question{parsed.length !== 1 ? 's' : ''} to form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  open, onClose, questions,
}: { open: boolean; onClose: () => void; questions: FormQuestion[] }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display">Application Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {['First Name', 'Last Name', 'Email', 'Major', 'Year', 'GPA (optional)'].map((f) => (
            <div key={f} className="space-y-1">
              <Label className="text-zinc-300">{f}</Label>
              <Input disabled placeholder="" className="bg-zinc-900 border-white/10" />
            </div>
          ))}
          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <Label className="text-zinc-300">
                {q.label || <span className="text-zinc-600 italic">Untitled question</span>}
                {q.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              {q.type === 'short' && <Input disabled className="bg-zinc-900 border-white/10" />}
              {q.type === 'long' && <Textarea disabled rows={4} className="bg-zinc-900 border-white/10 resize-none" />}
              {q.type === 'video' && (
                <div className="flex items-center gap-3 px-4 py-5 rounded-lg border border-dashed border-white/15 bg-zinc-900/40">
                  <Video className="w-5 h-5 text-zinc-600 shrink-0" />
                  <div>
                    <p className="text-sm text-zinc-500">Video response</p>
                    <p className="text-xs text-zinc-600">
                      Up to {Math.floor((q.maxDuration ?? 60) / 60) > 0 ? `${Math.floor((q.maxDuration ?? 60) / 60)}m ` : ''}{(q.maxDuration ?? 60) % 60 > 0 ? `${(q.maxDuration ?? 60) % 60}s` : ''} — record or upload
                    </p>
                  </div>
                </div>
              )}
              {q.type === 'multiple_choice' && (
                <div className="space-y-1.5">
                  {(q.options.filter(o => o.trim()).length > 0 ? q.options.filter(o => o.trim()) : ['Option 1', 'Option 2']).map((opt) => (
                    <label key={opt} className="flex items-center gap-2.5 text-sm text-zinc-400 cursor-pointer">
                      <input type="radio" disabled className="accent-yellow-500" />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-zinc-300">Resume (PDF, optional)</Label>
            <Input type="file" disabled className="bg-zinc-900 border-white/10" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close Preview</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Form Dialog ──────────────────────────────────────────────────────────

function NewFormDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display">New Application Form</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-zinc-300">Form name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Round 2 — Interview Form"
            className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onCreate(name.trim()); setName(''); } }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">Cancel</Button>
          <Button
            className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90"
            disabled={!name.trim()}
            onClick={() => { onCreate(name.trim()); setName(''); }}
          >
            Create Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── FormBuilder (main) ───────────────────────────────────────────────────────

export function FormBuilder({ clubId }: FormBuilderProps) {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [formName, setFormName] = useState('Default Form');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor),
  );

  const loadForms = async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('application_forms')
        .select('id, form_name, is_active, questions')
        .eq('club_id', clubId);
      if (error) throw error;
      const rows: FormRecord[] = (data || []).map((r: any) => ({
        id: r.id,
        form_name: r.form_name || 'Default Form',
        is_active: r.is_active ?? false,
        questions: (r.questions as FormQuestion[]) || [],
      }));
      setForms(rows);
      const active = rows.find((f) => f.is_active) || rows[0] || null;
      if (active) {
        setActiveFormId(active.id);
        setFormName(active.form_name || 'Default Form');
        setQuestions(active.questions);
      } else {
        setActiveFormId(null);
        setFormName('Default Form');
        setQuestions([]);
      }
    } catch (err: any) {
      console.error('Failed to load forms:', err);
      // If new columns don't exist yet, fall back to simple fetch
      try {
        const { data: fallback } = await (supabase as any)
          .from('application_forms')
          .select('id, questions')
          .eq('club_id', clubId)
          .maybeSingle();
        if (fallback) {
          const row: FormRecord = { id: fallback.id, form_name: 'Default Form', is_active: true, questions: fallback.questions || [] };
          setForms([row]);
          setActiveFormId(row.id);
          setQuestions(row.questions);
        }
      } catch { /* no form exists yet */ }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const switchToForm = (form: FormRecord) => {
    setActiveFormId(form.id);
    setFormName(form.form_name || 'Default Form');
    setQuestions(form.questions);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((prev) => {
        const oldIdx = prev.findIndex((q) => q.id === active.id);
        const newIdx = prev.findIndex((q) => q.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleChange = (id: string, updates: Partial<FormQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleDelete = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleDuplicate = (id: string) => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: crypto.randomUUID() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const handleAddQuestion = () => {
    const id = crypto.randomUUID();
    setQuestions(prev => [...prev, { id, type: 'short', label: '', required: false, options: [] }]);
    setFocusId(id);
  };

  const handleImport = (imported: FormQuestion[]) => {
    setQuestions(prev => [...prev, ...imported]);
  };

  const handleSave = async () => {
    setSaving(true);
    const cleaned = questions.map(q => ({
      ...q,
      label: q.label.trim(),
      options: q.type === 'multiple_choice' ? q.options.filter(o => o.trim()) : [],
    }));
    try {
      if (activeFormId) {
        const { error } = await (supabase as any)
          .from('application_forms')
          .update({ questions: cleaned, form_name: formName })
          .eq('id', activeFormId);
        if (error) throw error;
        setForms(prev => prev.map(f => f.id === activeFormId ? { ...f, questions: cleaned, form_name: formName } : f));
        toast.success('Form saved!');
      } else {
        // No form exists yet — upsert by club_id (works whether constraint exists or not)
        const { data, error } = await (supabase as any)
          .from('application_forms')
          .upsert({ club_id: clubId, questions: cleaned, form_name: formName, is_active: true }, { onConflict: 'club_id', ignoreDuplicates: false })
          .select('id, form_name, is_active, questions')
          .maybeSingle();
        if (error) {
          // Fallback: plain insert if upsert fails
          const { data: inserted, error: insertErr } = await (supabase as any)
            .from('application_forms')
            .insert({ club_id: clubId, questions: cleaned, form_name: formName, is_active: true })
            .select('id, form_name, is_active, questions')
            .single();
          if (insertErr) throw insertErr;
          const newForm = { ...inserted, questions: cleaned };
          setForms([newForm]);
          setActiveFormId(newForm.id);
        } else if (data) {
          const newForm = { ...data, questions: cleaned };
          setForms([newForm]);
          setActiveFormId(newForm.id);
        }
        toast.success('Form saved!');
      }
    } catch (err: any) {
      console.error('Save form error:', err);
      toast.error(err?.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateForm = async (name: string) => {
    setNewFormOpen(false);
    try {
      const { data, error } = await (supabase as any)
        .from('application_forms')
        .insert({ club_id: clubId, questions: [], form_name: name, is_active: false })
        .select('id, form_name, is_active, questions')
        .single();
      if (error) throw error;
      const newForm: FormRecord = { id: data.id, form_name: data.form_name || name, is_active: false, questions: [] };
      setForms(prev => [...prev, newForm]);
      switchToForm(newForm);
      toast.success(`"${name}" created`);
    } catch (err: any) {
      console.error('Create form error:', err);
      toast.error(err?.message || 'Failed to create form');
    }
  };

  const handleSetActive = async (formId: string) => {
    setSettingActive(true);
    try {
      // Set all forms for this club to inactive
      await (supabase as any)
        .from('application_forms')
        .update({ is_active: false })
        .eq('club_id', clubId);
      // Set selected form to active
      const { error } = await (supabase as any)
        .from('application_forms')
        .update({ is_active: true })
        .eq('id', formId);
      if (error) throw error;
      setForms(prev => prev.map(f => ({ ...f, is_active: f.id === formId })));
      toast.success('Active form updated — students will now see this form');
    } catch {
      toast.error('Failed to set active form');
    } finally {
      setSettingActive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gold" />
      </div>
    );
  }

  const currentForm = forms.find(f => f.id === activeFormId) ?? null;
  const isCurrentActive = currentForm?.is_active ?? false;

  return (
    <div className="space-y-4">
      {/* Form selector bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {forms.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-white/10 text-zinc-300 hover:text-white gap-2 max-w-[220px]">
                <span className="truncate">{currentForm?.form_name || 'Select form'}</span>
                {isCurrentActive && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-semibold leading-none">LIVE</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-white/10 text-white min-w-[200px]">
              {forms.map(f => (
                <DropdownMenuItem
                  key={f.id}
                  onClick={() => switchToForm(f)}
                  className="flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5"
                >
                  <span className="truncate text-sm">{f.form_name || 'Untitled'}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {f.is_active && <span className="px-1.5 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-semibold">LIVE</span>}
                    {f.id === activeFormId && <Check className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => setNewFormOpen(true)}
                className="text-zinc-400 hover:text-white cursor-pointer hover:bg-white/5"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New form
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" className="border-white/10 text-zinc-400 hover:text-white" onClick={() => setNewFormOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New form
          </Button>
        )}

        {/* Form name editable inline */}
        {activeFormId && (
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-white/20 py-1 transition-colors"
            placeholder="Form name"
          />
        )}

        {/* Set as active button */}
        {activeFormId && !isCurrentActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSetActive(activeFormId)}
            disabled={settingActive}
            className="border-gold/30 text-gold hover:bg-gold/10 shrink-0"
          >
            {settingActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Set as Live'}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => setNewFormOpen(true)} className="border-white/10 text-zinc-400 hover:text-white shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Form
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-zinc-500">
          Standard fields (name, email, major, year, GPA) are always included.
          Add custom questions below — drag to reorder.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="border-white/10 text-zinc-400 hover:text-white"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import Questions
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="w-4 h-4 mr-1.5" />
            Preview
          </Button>
          <Button variant="gold" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save Form
          </Button>
        </div>
      </div>

      {/* Standard fields hint */}
      <div className="rounded-xl border border-white/5 bg-white/[0.015] px-4 py-3">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2 font-medium">Always included</p>
        <div className="flex flex-wrap gap-1.5">
          {['First Name', 'Last Name', 'Email', 'Major', 'Year', 'GPA', 'Resume'].map(f => (
            <span
              key={f}
              className="px-2.5 py-1 rounded-full bg-white/5 text-zinc-500 text-xs border border-white/8"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Questions list */}
      {questions.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {questions.map(q => (
                <SortableInlineCard
                  key={q.id}
                  question={q}
                  onChange={handleChange}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  focusOnMount={q.id === focusId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <p className="text-sm text-zinc-500 mb-1">No custom questions yet.</p>
          <p className="text-xs text-zinc-600">
            Click "Add Question" below or import from a file / pasted text.
          </p>
        </div>
      )}

      {/* Add question */}
      <button
        onClick={handleAddQuestion}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-zinc-500 hover:text-white hover:border-white/25 hover:bg-white/[0.02] transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Question
      </button>

      <ImportQuestionsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        questions={questions}
      />
      <NewFormDialog
        open={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        onCreate={handleCreateForm}
      />
    </div>
  );
}
