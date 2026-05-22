import { useState, useRef } from 'react';
import type { Json } from '@/integrations/supabase/types';
import {
  Plus,
  Trash2,
  Settings2,
  BarChart2,
  GraduationCap,
  Calendar,
  BookOpen,
  Upload,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useRecruitmentRequirements,
  RecruitmentRequirement,
} from '@/hooks/useRecruitmentRequirements';

// ─── Rubric parser ────────────────────────────────────────────────────────────

interface ParsedCriterion {
  description: string;
  weight: number;
}

function detectWeight(line: string): number {
  // Explicit patterns: "weight: 4", "(5)", "x3", "5/5", "4 out of 5"
  const explicit =
    line.match(/weight\s*[:\-]?\s*(\d)/i) ||
    line.match(/\((\d)\s*\/\s*5\)/) ||
    line.match(/\bx(\d)\b/) ||
    line.match(/(\d)\s*\/\s*5/) ||
    line.match(/(\d)\s*out\s*of\s*5/i) ||
    line.match(/\[(\d)\]/);
  if (explicit) {
    const n = parseInt(explicit[1]);
    if (n >= 1 && n <= 5) return n;
  }
  // Keyword hints
  if (/\b(critical|must.have|required|essential|core)\b/i.test(line)) return 5;
  if (/\b(important|key|primary|major|significant)\b/i.test(line)) return 4;
  if (/\b(nice.to.have|preferred|bonus|secondary|minor)\b/i.test(line)) return 2;
  if (/\b(optional|extra|low.priority)\b/i.test(line)) return 1;
  return 3; // default
}

function parseRubricText(raw: string): ParsedCriterion[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const results: ParsedCriterion[] = [];

  for (const line of lines) {
    // Skip section headers (short all-caps or ends with ':' with no lowercase)
    if (/^[A-Z\s\d]{2,40}:?\s*$/.test(line) && line.length < 50) continue;
    // Strip leading bullets, numbers, dashes
    const cleaned = line
      .replace(/^[•\-*◦▪]\s+/, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^\[[\dx]\]\s*/i, '')
      .trim();
    if (cleaned.length < 8) continue; // too short to be a real criterion

    const weight = detectWeight(line);
    // Remove weight annotations from the description
    const description = cleaned
      .replace(/weight\s*[:\-]?\s*\d/gi, '')
      .replace(/\(\d\s*\/\s*5\)/g, '')
      .replace(/\[\d\]/g, '')
      .replace(/\bx\d\b/gi, '')
      .replace(/\d\s*\/\s*5/g, '')
      .replace(/\d\s*out\s*of\s*5/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (description.length >= 8) {
      results.push({ description, weight });
    }
  }

  return results;
}

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
  throw new Error('Unsupported file type. Use .txt, .docx, or .pdf');
}

// ─── Import Rubric Modal ──────────────────────────────────────────────────────

function ImportRubricModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (criteria: ParsedCriterion[]) => Promise<void>;
}) {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCriterion[]>([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = async () => {
    setProcessing(true);
    try {
      const text = tab === 'paste' ? pasteText : file ? await extractTextFromFile(file) : '';
      const results = parseRubricText(text);
      if (results.length === 0) {
        toast.error('No criteria detected. Try formatting each criterion on its own line.');
      } else {
        setParsed(results);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse rubric');
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    await onImport(parsed);
    setPasteText('');
    setFile(null);
    setParsed([]);
    setImporting(false);
    onClose();
  };

  const reset = () => {
    setPasteText('');
    setFile(null);
    setParsed([]);
  };
  const canParse = tab === 'paste' ? pasteText.trim().length > 0 : file !== null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-display font-semibold text-white">Import Rubric</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Paste or upload your rubric — we'll extract criteria and weights automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-zinc-900 border border-white/10 w-fit">
            {(['paste', 'upload'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  reset();
                }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t === 'paste' ? 'Paste Text' : 'Upload File'}
              </button>
            ))}
          </div>

          {tab === 'paste' ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Paste your rubric text. Each line becomes a criterion. Add weight hints like
                <code className="bg-zinc-900 px-1 rounded mx-1 text-zinc-400">weight: 5</code>
                or keywords like{' '}
                <code className="bg-zinc-900 px-1 rounded text-zinc-400">critical</code> /{' '}
                <code className="bg-zinc-900 px-1 rounded text-zinc-400">important</code>.
              </p>
              <Textarea
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  setParsed([]);
                }}
                placeholder={`Leadership experience (weight: 4)\nPublic speaking skills — critical\nPrior club involvement\nGPA above 3.0 (5/5)\nAvailability 5+ hrs/week`}
                rows={8}
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 text-sm resize-none font-mono"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                Upload a <code className="bg-zinc-900 px-1 rounded text-zinc-400">.txt</code>,{' '}
                <code className="bg-zinc-900 px-1 rounded text-zinc-400">.docx</code>, or{' '}
                <code className="bg-zinc-900 px-1 rounded text-zinc-400">.pdf</code> rubric file.
              </p>
              <label className="flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed border-white/10 cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-colors">
                <Upload className="w-6 h-6 text-zinc-500" />
                <div className="text-center">
                  <p className="text-sm text-zinc-400">
                    {file ? file.name : 'Click to select a file'}
                  </p>
                  {file ? (
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-600 mt-0.5">.txt · .docx · .pdf</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setParsed([]);
                  }}
                />
              </label>
            </div>
          )}

          {canParse && parsed.length === 0 && (
            <Button
              onClick={handleParse}
              disabled={processing}
              className="w-full bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10"
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {processing ? 'Parsing…' : 'Detect Criteria'}
            </Button>
          )}

          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400">
                  {parsed.length} criterion{parsed.length !== 1 ? 'a' : ''} detected — adjust
                  weights before importing
                </p>
                <button
                  onClick={reset}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {parsed.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-zinc-900"
                  >
                    <p className="flex-1 text-sm text-zinc-200 min-w-0">{c.description}</p>
                    {/* Weight picker */}
                    <div className="flex gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() =>
                            setParsed((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, weight: w } : p))
                            )
                          }
                          className={`w-6 h-6 rounded-full text-[10px] font-bold border transition-colors ${
                            c.weight === w
                              ? 'bg-gold border-gold text-zinc-900'
                              : 'bg-white/5 border-white/15 text-zinc-600 hover:border-white/30'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setParsed((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-zinc-700 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsed.length === 0 || importing}
            className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed gap-1.5"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Add {parsed.length > 0 ? parsed.length : ''} Criteria
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── RequirementsBuilder ──────────────────────────────────────────────────────

interface RequirementsBuilderProps {
  clubId: string;
}

const YEAR_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];
const MAJOR_SUGGESTIONS = [
  'Computer Science',
  'Data Science',
  'Business',
  'Economics',
  'Engineering',
  'Biology',
  'Psychology',
  'Communications',
];

export function RequirementsBuilder({ clubId }: RequirementsBuilderProps) {
  const { strictFilters, aiCriteria, loading, addRequirement, deleteRequirement } =
    useRecruitmentRequirements(clubId);

  const [addStrictOpen, setAddStrictOpen] = useState(false);
  const [addAIOpen, setAddAIOpen] = useState(false);
  const [importRubricOpen, setImportRubricOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Strict filter form state
  const [strictType, setStrictType] = useState<string>('min_gpa');
  const [minGpa, setMinGpa] = useState('3.0');
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [customMajor, setCustomMajor] = useState('');

  // AI criteria form state
  const [aiCriterion, setAiCriterion] = useState('');
  const [aiWeight, setAiWeight] = useState(3);

  const handleAddStrictFilter = async () => {
    setSaving(true);
    let value: Json = {};

    if (strictType === 'min_gpa') {
      value = { min_gpa: parseFloat(minGpa) };
    } else if (strictType === 'allowed_majors') {
      value = { majors: selectedMajors };
    } else if (strictType === 'allowed_years') {
      value = { years: selectedYears };
    }

    const success = await addRequirement('strict', strictType, value);
    if (success) {
      setAddStrictOpen(false);
      resetStrictForm();
    }
    setSaving(false);
  };

  const handleImportRubric = async (criteria: ParsedCriterion[]) => {
    let added = 0;
    for (const c of criteria) {
      const ok = await addRequirement('ai', 'look_for', {
        description: c.description,
        weight: c.weight,
      });
      if (ok) added++;
    }
    if (added > 0) toast.success(`Added ${added} criteria from rubric`);
  };

  const handleAddAICriteria = async () => {
    if (!aiCriterion.trim()) return;
    setSaving(true);

    const success = await addRequirement('ai', 'look_for', {
      description: aiCriterion,
      weight: aiWeight,
    });
    if (success) {
      setAddAIOpen(false);
      setAiCriterion('');
      setAiWeight(3);
    }
    setSaving(false);
  };

  const resetStrictForm = () => {
    setStrictType('min_gpa');
    setMinGpa('3.0');
    setSelectedMajors([]);
    setSelectedYears([]);
    setCustomMajor('');
  };

  const toggleMajor = (major: string) => {
    setSelectedMajors((prev) =>
      prev.includes(major) ? prev.filter((m) => m !== major) : [...prev, major]
    );
  };

  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const addCustomMajor = () => {
    if (customMajor.trim() && !selectedMajors.includes(customMajor.trim())) {
      setSelectedMajors((prev) => [...prev, customMajor.trim()]);
      setCustomMajor('');
    }
  };

  const renderStrictFilterValue = (req: RecruitmentRequirement) => {
    const val = req.value as Record<string, unknown>;
    if (req.criterion === 'min_gpa') {
      return `Min GPA: ${val.min_gpa}`;
    }
    if (req.criterion === 'allowed_majors') {
      const majors = val.majors as string[];
      return majors.slice(0, 3).join(', ') + (majors.length > 3 ? ` +${majors.length - 3}` : '');
    }
    if (req.criterion === 'allowed_years') {
      const years = val.years as string[];
      return years.join(', ');
    }
    return '';
  };

  const getStrictFilterIcon = (criterion: string) => {
    switch (criterion) {
      case 'min_gpa':
        return <GraduationCap className="w-4 h-4" />;
      case 'allowed_majors':
        return <BookOpen className="w-4 h-4" />;
      case 'allowed_years':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Settings2 className="w-4 h-4" />;
    }
  };

  const [activeTab, setActiveTab] = useState<'strict' | 'ai'>('strict');

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-white/5 rounded-lg" />
        <div className="h-32 bg-white/5 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Tab switcher */}
      <div className="flex border border-white/15 rounded-lg overflow-hidden">
        {(
          [
            { key: 'strict', label: 'Strict Filters', icon: <Settings2 className="w-4 h-4" /> },
            { key: 'ai', label: 'AI Criteria', icon: <BarChart2 className="w-4 h-4" /> },
          ] as const
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white/10 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Strict Filters panel */}
      {activeTab === 'strict' && (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Strict Filters</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Hard requirements applicants must meet. Failing any caps their AI score at 30.
            </p>
          </div>

          {strictFilters.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-4">
              No strict filters set. Add one to start filtering applicants.
            </p>
          ) : (
            <div className="space-y-2">
              {strictFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-gold/10 text-gold">
                      {getStrictFilterIcon(filter.criterion)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200 capitalize">
                        {filter.criterion.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-zinc-500">{renderStrictFilterValue(filter)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRequirement(filter.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Dialog open={addStrictOpen} onOpenChange={setAddStrictOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-white/20 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/30 transition-colors">
                <Plus className="w-4 h-4" />
                Add Strict Filter
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Strict Filter</DialogTitle>
                <DialogDescription>
                  Define a hard requirement for applicant screening.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Filter Type</Label>
                  <Select value={strictType} onValueChange={setStrictType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="min_gpa">Minimum GPA</SelectItem>
                      <SelectItem value="allowed_majors">Allowed Majors</SelectItem>
                      <SelectItem value="allowed_years">Allowed Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {strictType === 'min_gpa' && (
                  <div className="space-y-2">
                    <Label>Minimum GPA</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="4.0"
                      value={minGpa}
                      onChange={(e) => setMinGpa(e.target.value)}
                      placeholder="3.0"
                    />
                  </div>
                )}

                {strictType === 'allowed_majors' && (
                  <div className="space-y-3">
                    <Label>Select Majors</Label>
                    <div className="flex flex-wrap gap-2">
                      {MAJOR_SUGGESTIONS.map((major) => (
                        <Badge
                          key={major}
                          variant={selectedMajors.includes(major) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleMajor(major)}
                        >
                          {major}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom major..."
                        value={customMajor}
                        onChange={(e) => setCustomMajor(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomMajor()}
                      />
                      <Button variant="outline" size="icon" onClick={addCustomMajor}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {selectedMajors.length > 0 && (
                      <p className="text-xs text-zinc-500">Selected: {selectedMajors.join(', ')}</p>
                    )}
                  </div>
                )}

                {strictType === 'allowed_years' && (
                  <div className="space-y-2">
                    <Label>Select Years</Label>
                    <div className="flex flex-wrap gap-2">
                      {YEAR_OPTIONS.map((year) => (
                        <Badge
                          key={year}
                          variant={selectedYears.includes(year) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleYear(year)}
                        >
                          {year}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddStrictOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gold" onClick={handleAddStrictFilter} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Filter'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* AI Criteria panel */}
      {activeTab === 'ai' && (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-200">AI Evaluation Criteria</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tell the AI exactly what to look for in applicant responses. The more specific, the
                better.
              </p>
            </div>
            <button
              onClick={() => setImportRubricOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-white/25 hover:bg-white/5 transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Rubric
            </button>
          </div>

          {aiCriteria.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-4">
              No AI criteria set. Add evaluation points for AI screening.
            </p>
          ) : (
            <div className="space-y-2">
              {aiCriteria.map((criteria) => {
                const val = criteria.value as { description: string; weight?: number };
                return (
                  <div
                    key={criteria.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-white/10 bg-white/5"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-md bg-gold/10 text-gold mt-0.5 shrink-0">
                        <BarChart2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200">{val.description}</p>
                        {val.weight && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 w-5 rounded-full ${
                                  i < val.weight! ? 'bg-gold' : 'bg-white/10'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-zinc-500 ml-1">
                              weight {val.weight}/5
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteRequirement(criteria.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <Dialog open={addAIOpen} onOpenChange={setAddAIOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-white/20 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/30 transition-colors">
                <Plus className="w-4 h-4" />
                Add AI Criterion
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add AI Evaluation Criterion</DialogTitle>
                <DialogDescription>
                  Describe what the AI should look for in applicant responses.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>What should the AI look for?</Label>
                  <Textarea
                    placeholder="e.g., Prior leadership experience in high school clubs, Experience with Python or data analysis, High-quality written responses with specific examples..."
                    value={aiCriterion}
                    onChange={(e) => setAiCriterion(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-zinc-500">
                    Be specific! The more detailed your criteria, the better the AI screening.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>
                    Weight <span className="text-zinc-500 font-normal">({aiWeight}/5)</span>
                  </Label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={aiWeight}
                    onChange={(e) => setAiWeight(Number(e.target.value))}
                    className="w-full accent-yellow-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Low priority</span>
                    <span>High priority</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddAIOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  onClick={handleAddAICriteria}
                  disabled={saving || !aiCriterion.trim()}
                >
                  {saving ? 'Adding...' : 'Add Criterion'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <ImportRubricModal
        open={importRubricOpen}
        onClose={() => setImportRubricOpen(false)}
        onImport={handleImportRubric}
      />
    </div>
  );
}
