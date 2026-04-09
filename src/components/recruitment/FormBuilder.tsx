import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  Save,
  Loader2,
  AlignLeft,
  AlignJustify,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { FormQuestion } from '@/hooks/useRecruitment';

interface FormBuilderProps {
  clubId: string;
  fetchForm: () => Promise<FormQuestion[]>;
  saveForm: (questions: FormQuestion[]) => Promise<boolean>;
}

const TYPE_LABELS: Record<FormQuestion['type'], string> = {
  short: 'Short Answer',
  long: 'Long Answer',
  multiple_choice: 'Multiple Choice',
};

const TYPE_ICONS: Record<FormQuestion['type'], React.ReactNode> = {
  short: <AlignLeft className="w-4 h-4" />,
  long: <AlignJustify className="w-4 h-4" />,
  multiple_choice: <ListChecks className="w-4 h-4" />,
};

// ─── Sortable Question Row ───────────────────────────────────────────────────

function SortableQuestion({
  question,
  onDelete,
}: {
  question: FormQuestion;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-3 p-4 rounded-lg border border-white/10 bg-zinc-900/60 ${
        isDragging ? 'opacity-60 shadow-xl z-50' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-zinc-500">{TYPE_ICONS[question.type]}</span>
          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
            {TYPE_LABELS[question.type]}
          </Badge>
          {question.required && (
            <Badge className="text-xs bg-gold/10 text-gold border-gold/20">Required</Badge>
          )}
        </div>
        <p className="text-sm text-white font-medium">{question.label}</p>
        {question.type === 'multiple_choice' && question.options.length > 0 && (
          <p className="text-xs text-zinc-500 mt-1">
            Options: {question.options.join(', ')}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-600 hover:text-red-400"
        onClick={() => onDelete(question.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  open,
  onClose,
  questions,
}: {
  open: boolean;
  onClose: () => void;
  questions: FormQuestion[];
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display">Application Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Standard fields */}
          {['First Name', 'Last Name', 'Email', 'Major', 'Year', 'GPA (optional)'].map((f) => (
            <div key={f} className="space-y-1">
              <Label className="text-zinc-300">{f}</Label>
              <Input disabled placeholder="" className="bg-zinc-900 border-white/10" />
            </div>
          ))}

          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <Label className="text-zinc-300">
                {q.label}
                {q.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              {q.type === 'short' && (
                <Input disabled className="bg-zinc-900 border-white/10" />
              )}
              {q.type === 'long' && (
                <Textarea disabled rows={4} className="bg-zinc-900 border-white/10 resize-none" />
              )}
              {q.type === 'multiple_choice' && (
                <div className="space-y-1">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
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

// ─── Add Question Modal ───────────────────────────────────────────────────────

function AddQuestionModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (q: FormQuestion) => void;
}) {
  const [type, setType] = useState<FormQuestion['type']>('short');
  const [label, setLabel] = useState('');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(['']);

  const reset = () => {
    setType('short');
    setLabel('');
    setRequired(false);
    setOptions(['']);
  };

  const handleAdd = () => {
    if (!label.trim()) return;
    const filteredOptions = options.filter((o) => o.trim());
    onAdd({
      id: crypto.randomUUID(),
      type,
      label: label.trim(),
      required,
      options: type === 'multiple_choice' ? filteredOptions : [],
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display">Add Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Question Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'short', label: 'Short Answer', icon: <AlignLeft className="w-4 h-4" /> },
                { value: 'long', label: 'Long Answer', icon: <AlignJustify className="w-4 h-4" /> },
                { value: 'multiple_choice', label: 'Multiple Choice', icon: <ListChecks className="w-4 h-4" /> },
              ] as const).map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-colors ${
                    type === value
                      ? 'bg-[hsl(43_74%_56%/0.15)] border-[hsl(43,74%,56%)] text-[hsl(43,74%,56%)]'
                      : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/25'
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400">Question Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Why do you want to join?"
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={required} onCheckedChange={setRequired} className="data-[state=checked]:bg-[hsl(43,74%,56%)]" />
            <span className="text-sm text-zinc-300">Required</span>
          </div>

          {type === 'multiple_choice' && (
            <div className="space-y-2">
              <Label className="text-zinc-400">Options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                  />
                  {options.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-zinc-600 hover:text-red-400"
                      onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-zinc-400"
                onClick={() => setOptions([...options, ''])}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Option
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 hover:text-white hover:border-white/40"
            onClick={() => { reset(); onClose(); }}
          >
            Cancel
          </Button>
          <Button
            className="bg-[hsl(43,74%,56%)] text-zinc-900 font-semibold hover:bg-[hsl(43,74%,48%)] disabled:opacity-40"
            onClick={handleAdd}
            disabled={!label.trim() || (type === 'multiple_choice' && options.filter(o => o.trim()).length < 2)}
          >
            Add Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── FormBuilder (main) ───────────────────────────────────────────────────────

export function FormBuilder({ fetchForm, saveForm }: FormBuilderProps) {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor),
  );

  useEffect(() => {
    fetchForm().then((q) => { setQuestions(q); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleDelete = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveForm(questions);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Design the application form students see at <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">/clubs/[id]/apply</code>.
            Standard fields (name, email, major, year, GPA) are always included.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
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

      {questions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-zinc-600">
          <p className="text-sm mb-3">No custom questions yet.</p>
          <p className="text-xs">Standard fields (name, email, major, year, GPA) are always shown.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {questions.map((q) => (
                <SortableQuestion key={q.id} question={q} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button
        variant="outline"
        className="w-full border-dashed border-white/15 text-zinc-400 hover:text-white"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Question
      </Button>

      <AddQuestionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(q) => setQuestions((prev) => [...prev, q])}
      />
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        questions={questions}
      />
    </div>
  );
}
