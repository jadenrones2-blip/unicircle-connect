import { useState } from 'react';
import type { Json } from '@/integrations/supabase/types';
import { Plus, Trash2, Settings2, Brain, GraduationCap, Calendar, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { useRecruitmentRequirements, RecruitmentRequirement } from '@/hooks/useRecruitmentRequirements';

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
  const {
    strictFilters,
    aiCriteria,
    loading,
    addRequirement,
    deleteRequirement,
  } = useRecruitmentRequirements(clubId);

  const [addStrictOpen, setAddStrictOpen] = useState(false);
  const [addAIOpen, setAddAIOpen] = useState(false);
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

  const handleAddAICriteria = async () => {
    if (!aiCriterion.trim()) return;
    setSaving(true);

    const success = await addRequirement('ai', 'look_for', { description: aiCriterion, weight: aiWeight });
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
        {([
          { key: 'strict', label: 'Strict Filters', icon: <Settings2 className="w-4 h-4" /> },
          { key: 'ai', label: 'AI Criteria', icon: <Brain className="w-4 h-4" /> },
        ] as const).map(({ key, label, icon }) => (
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
                      <p className="text-xs text-zinc-500">
                        {renderStrictFilterValue(filter)}
                      </p>
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
                      <p className="text-xs text-zinc-500">
                        Selected: {selectedMajors.join(', ')}
                      </p>
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
          <div>
            <p className="text-sm font-semibold text-zinc-200">AI Evaluation Criteria</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tell the AI exactly what to look for in applicant responses. The more specific, the better.
            </p>
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
                        <Brain className="w-4 h-4" />
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
                            <span className="text-xs text-zinc-500 ml-1">weight {val.weight}/5</span>
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
                    Weight{' '}
                    <span className="text-zinc-500 font-normal">({aiWeight}/5)</span>
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
    </div>
  );
}
