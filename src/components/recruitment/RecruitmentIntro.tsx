import { Users, Kanban, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RecruitmentIntroProps {
  onEnable: () => void;
  loading?: boolean;
}

export function RecruitmentIntro({ onEnable, loading }: RecruitmentIntroProps) {
  const features = [
    {
      icon: Kanban,
      title: 'Visual Pipeline',
      description: 'Track applicants through customizable stages with drag-and-drop simplicity.',
    },
    {
      icon: Users,
      title: 'Centralized Applicants',
      description: 'Keep all applicant information organized in one place.',
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description: 'See where each applicant stands at a glance.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-4">
          Recruitment Tracking
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Streamline your club's recruitment process with a visual Kanban board. 
          Track applicants from application to decision, all in one place.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-12">
        {features.map((feature) => (
          <Card key={feature.title} className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-gold" />
              </div>
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button 
          variant="gold" 
          size="lg" 
          onClick={onEnable}
          disabled={loading}
          className="px-8"
        >
          {loading ? 'Enabling...' : 'Enable Recruitment Tracking'}
        </Button>
        <p className="text-sm text-muted-foreground mt-3">
          You can disable this feature anytime from settings.
        </p>
      </div>
    </div>
  );
}
