import { useState } from 'react';
import { Plus, Trash2, Settings2, Brain, GraduationCap, Calendar, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const handleAddStrictFilter = async () => {
    setSaving(true);
    let value: Record<string, unknown> = {};

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

    const success = await addRequirement('ai', 'look_for', { description: aiCriterion });
    if (success) {
      setAddAIOpen(false);
      setAiCriterion('');
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="strict" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="strict" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Strict Filters
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-2">
          <Brain className="w-4 h-4" />
          AI Criteria
        </TabsTrigger>
      </TabsList>

      <TabsContent value="strict" className="space-y-4 mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Strict Filters</CardTitle>
            <CardDescription>
              Set hard requirements that applicants must meet. These are used for automatic filtering.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {strictFilters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No strict filters set. Add one to start filtering applicants.
              </p>
            ) : (
              <div className="space-y-2">
                {strictFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        {getStrictFilterIcon(filter.criterion)}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {filter.criterion.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {renderStrictFilterValue(filter)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteRequirement(filter.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={addStrictOpen} onOpenChange={setAddStrictOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Strict Filter
                </Button>
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
                        <p className="text-xs text-muted-foreground">
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ai" className="space-y-4 mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Evaluation Criteria</CardTitle>
            <CardDescription>
              Define what the AI should look for when screening candidates. Be specific!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiCriteria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No AI criteria set. Add evaluation points for AI screening.
              </p>
            ) : (
              <div className="space-y-2">
                {aiCriteria.map((criteria) => (
                  <div
                    key={criteria.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-gold/10 text-gold mt-0.5">
                        <Brain className="w-4 h-4" />
                      </div>
                      <p className="text-sm">
                        {(criteria.value as { description: string }).description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteRequirement(criteria.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={addAIOpen} onOpenChange={setAddAIOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add AI Criterion
                </Button>
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
                    <p className="text-xs text-muted-foreground">
                      Be specific! The more detailed your criteria, the better the AI screening.
                    </p>
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
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
