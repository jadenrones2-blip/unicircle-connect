import { useState } from 'react';
import { Settings, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import type { RecruitmentSettings } from '@/hooks/useRecruitment';

interface StudentVisibilitySettingsProps {
  clubId: string;
  settings: RecruitmentSettings | null;
  onUpdate: () => void;
}

export function StudentVisibilitySettings({
  clubId,
  settings,
  onUpdate,
}: StudentVisibilitySettingsProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    show_stage_names: settings?.show_stage_names ?? false,
    show_progress_bar: settings?.show_progress_bar ?? true,
    show_timeline: settings?.show_timeline ?? false,
    student_visible_message: settings?.student_visible_message ?? (null as string | null),
  });

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('recruitment_settings')
      .update({
        show_stage_names: localSettings.show_stage_names,
        show_progress_bar: localSettings.show_progress_bar,
        show_timeline: localSettings.show_timeline,
        student_visible_message: localSettings.student_visible_message || null,
      })
      .eq('club_id', clubId);

    if (error) {
      console.error('Error saving visibility settings:', error);
      toast.error('Failed to save settings');
    } else {
      toast.success('Visibility settings saved');
      onUpdate();
      setOpen(false);
    }

    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-white/15 text-zinc-300 hover:text-white hover:bg-white/5"
        >
          <Eye className="h-4 w-4" />
          Student Visibility
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Student Visibility Settings
          </SheetTitle>
          <SheetDescription>
            Control what applicants can see about their recruitment progress.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="progress-bar">Show Progress Bar</Label>
              <p className="text-sm text-muted-foreground">Display a visual progress indicator</p>
            </div>
            <Switch
              id="progress-bar"
              checked={localSettings.show_progress_bar}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, show_progress_bar: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="stage-names">Show Stage Names</Label>
              <p className="text-sm text-muted-foreground">
                Reveal the names of recruitment stages
              </p>
            </div>
            <Switch
              id="stage-names"
              checked={localSettings.show_stage_names}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, show_stage_names: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="timeline">Show Timeline View</Label>
              <p className="text-sm text-muted-foreground">
                Display a step-by-step timeline of all stages
              </p>
            </div>
            <Switch
              id="timeline"
              checked={localSettings.show_timeline}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, show_timeline: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message for Applicants</Label>
            <Textarea
              id="message"
              placeholder="e.g., 'Thank you for applying! We'll be in touch within 2 weeks.'"
              value={localSettings.student_visible_message || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  student_visible_message: e.target.value || null,
                }))
              }
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This message will be shown to all applicants on their dashboard.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
