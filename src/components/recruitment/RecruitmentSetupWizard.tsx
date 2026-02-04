import { useState } from 'react';
import { Briefcase, PartyPopper, Wrench, Plus, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RecruitmentSetupWizardProps {
  onComplete: (stages: string[]) => void;
  loading?: boolean;
}

const TEMPLATES = {
  professional: {
    icon: Briefcase,
    title: 'Professional Org',
    description: 'For consulting, business, and pre-professional clubs.',
    stages: ['Info Session', 'Networking Night', 'Case Study Night', 'Interviews'],
  },
  product: {
    icon: PartyPopper,
    title: 'Product / Tech Org',
    description: 'For product, design, and tech-focused organizations.',
    stages: ['Info Night', 'Alumni Night', 'Pitch Prep', 'Social Night', 'Interviews'],
  },
};

export function RecruitmentSetupWizard({ onComplete, loading }: RecruitmentSetupWizardProps) {
  const [mode, setMode] = useState<'select' | 'custom'>('select');
  const [customStages, setCustomStages] = useState<string[]>(['', '', '']);

  const handleTemplateSelect = (templateKey: keyof typeof TEMPLATES) => {
    onComplete(TEMPLATES[templateKey].stages);
  };

  const handleCustomSubmit = () => {
    const validStages = customStages.filter(s => s.trim().length > 0);
    if (validStages.length < 2) {
      return;
    }
    onComplete(validStages);
  };

  const updateCustomStage = (index: number, value: string) => {
    setCustomStages(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addCustomStage = () => {
    if (customStages.length < 8) {
      setCustomStages(prev => [...prev, '']);
    }
  };

  const removeCustomStage = (index: number) => {
    if (customStages.length > 2) {
      setCustomStages(prev => prev.filter((_, i) => i !== index));
    }
  };

  if (mode === 'custom') {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => setMode('select')}
        >
          ← Back to templates
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 mb-4">
            <Wrench className="w-6 h-6 text-gold" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Build Your Pipeline
          </h2>
          <p className="text-muted-foreground">
            Define the stages applicants will move through.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {customStages.map((stage, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">
                  {index + 1}
                </div>
                <Input
                  value={stage}
                  onChange={(e) => updateCustomStage(index, e.target.value)}
                  placeholder={`Stage ${index + 1} (e.g., ${['Application', 'Interview', 'Final Round'][index] || 'Stage name'})`}
                  className="flex-1"
                />
                {customStages.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCustomStage(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {customStages.length < 8 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={addCustomStage}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            )}

            <div className="pt-4">
              <Button
                variant="gold"
                className="w-full"
                onClick={handleCustomSubmit}
                disabled={loading || customStages.filter(s => s.trim()).length < 2}
              >
                {loading ? 'Creating...' : 'Create Pipeline'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Set Up Your Pipeline
        </h2>
        <p className="text-muted-foreground">
          Choose a template to get started quickly, or build your own.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {Object.entries(TEMPLATES).map(([key, template]) => (
          <Card 
            key={key} 
            className="cursor-pointer transition-all hover:border-gold/50 hover:shadow-md"
            onClick={() => !loading && handleTemplateSelect(key as keyof typeof TEMPLATES)}
          >
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-3">
                <template.icon className="w-5 h-5 text-gold" />
              </div>
              <CardTitle className="text-lg">{template.title}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {template.stages.map((stage, index) => (
                  <div 
                    key={stage}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm"
                  >
                    <span className="w-4 h-4 rounded-full bg-gold/20 text-gold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    {stage}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button 
          variant="outline" 
          onClick={() => setMode('custom')}
          className="gap-2"
        >
          <Wrench className="w-4 h-4" />
          Build Custom Pipeline
        </Button>
      </div>
    </div>
  );
}
