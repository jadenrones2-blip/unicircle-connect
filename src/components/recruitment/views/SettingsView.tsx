import { useState } from 'react';
import { Link2, Copy, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequirementsBuilder } from '../RequirementsBuilder';
import { StudentVisibilitySettings } from '../StudentVisibilitySettings';
import { toast } from 'sonner';
import type { RecruitmentStage, RecruitmentSettings } from '@/hooks/useRecruitment';

interface SettingsViewProps {
  clubId: string;
  clubName: string;
  applyUrl: string;
  stages: RecruitmentStage[];
  settings: RecruitmentSettings | null;
  onUpdateStage: (stageId: string, label: string) => Promise<boolean>;
  onAddStage: (label: string) => Promise<boolean>;
  onDeleteStage: (stageId: string) => Promise<boolean>;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8 bg-zinc-900/40">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function SettingsView({
  clubId, clubName, applyUrl, stages, settings,
  onUpdateStage, onAddStage, onDeleteStage,
}: SettingsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const handleRename = async (stageId: string) => {
    if (!editLabel.trim()) return;
    setSaving(true);
    await onUpdateStage(stageId, editLabel.trim());
    setSaving(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    await onAddStage(newLabel.trim());
    setSaving(false);
    setNewLabel('');
    setAddingStage(false);
  };

  const handleDelete = async (stageId: string, label: string) => {
    if (!confirm(`Delete stage "${label}"? Applicants in this stage will be unassigned.`)) return;
    await onDeleteStage(stageId);
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* Apply Link */}
      <Section title="Apply Link" subtitle="Share this URL with students to collect applications">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-white/8">
          <Link2 className="w-4 h-4 text-gold shrink-0" />
          <span className="flex-1 text-sm text-zinc-300 font-mono truncate">{applyUrl}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(applyUrl); toast.success('Copied!'); }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors shrink-0"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Build your form in the <span className="text-zinc-400">Form</span> tab before sharing this link.
        </p>
      </Section>

      {/* Pipeline Stages */}
      <Section title="Pipeline Stages" subtitle="Manage the stages applicants move through during recruitment">
        <div className="space-y-2">
          {stages.map(stage => (
            <div key={stage.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-white/8 bg-zinc-900/50">
              {editingId === stage.id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(stage.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="h-7 text-sm bg-zinc-800 border-white/15 text-white flex-1"
                    autoFocus
                  />
                  <button onClick={() => handleRename(stage.id)} disabled={saving}
                    className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-zinc-500 hover:text-white rounded transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-zinc-300">{stage.label}</span>
                  {stage.is_intake && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">Intake</span>
                  )}
                  <button
                    onClick={() => { setEditingId(stage.id); setEditLabel(stage.label); }}
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {!stage.is_intake && (
                    <button
                      onClick={() => handleDelete(stage.id, stage.label)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Add stage */}
          {addingStage ? (
            <div className="flex items-center gap-2">
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingStage(false); }}
                placeholder="Stage name…"
                className="h-7 text-sm bg-zinc-800 border-white/15 text-white flex-1"
                autoFocus
              />
              <button onClick={handleAdd} disabled={saving || !newLabel.trim()}
                className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-40">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setAddingStage(false)} className="p-1.5 text-zinc-500 hover:text-white rounded transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingStage(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add stage
            </button>
          )}
        </div>
      </Section>

      {/* Screening Rubric */}
      <Section title="Screening Rubric" subtitle="Define what Claude evaluates when screening applicants">
        <RequirementsBuilder clubId={clubId} />
      </Section>

      {/* Visibility */}
      <Section title="Student Visibility" subtitle="Control what applicants can see about their status">
        <StudentVisibilitySettings clubId={clubId} settings={settings} />
      </Section>

    </div>
  );
}
