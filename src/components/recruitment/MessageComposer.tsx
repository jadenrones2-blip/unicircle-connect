import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface MessageComposerProps {
  clubId: string;
  clubName: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
}

type RecipientFilter =
  | { type: 'all' }
  | { type: 'stage'; stageId: string }
  | { type: 'decision'; decision: 'accepted' | 'rejected' };

function interpolatePreview(
  template: string,
  applicant: Applicant,
  clubName: string,
  stageName: string
): string {
  const vars: Record<string, string> = {
    first_name: applicant.first_name ?? '',
    last_name: applicant.last_name ?? '',
    club_name: clubName,
    stage: stageName,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

const VARIABLE_CHIPS = [
  { label: '{{first_name}}', display: 'First name' },
  { label: '{{last_name}}', display: 'Last name' },
  { label: '{{club_name}}', display: 'Club name' },
  { label: '{{stage}}', display: 'Stage' },
];

export function MessageComposer({ clubId, clubName, stages, applicants }: MessageComposerProps) {
  const [filter, setFilter] = useState<RecipientFilter>({ type: 'all' });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');

  const getRecipients = (): Applicant[] => {
    if (filter.type === 'all') return applicants;
    if (filter.type === 'stage') return applicants.filter((a) => a.stage_id === filter.stageId);
    return applicants.filter((a) => (a as any).final_decision === filter.decision);
  };

  const recipients = getRecipients();

  const previewApplicant = recipients[0] ?? null;
  const previewStageName = previewApplicant
    ? (stages.find((s) => s.id === previewApplicant.stage_id)?.label ?? '')
    : '';

  const insertChip = (chip: string) => {
    if (activeField === 'subject' && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + chip + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + chip.length, start + chip.length);
      });
    } else if (bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + chip + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + chip.length, start + chip.length);
      });
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      toast.error('Please log in');
      return;
    }

    setSending(true);
    setSent(0);

    let successCount = 0;
    for (const applicant of recipients) {
      try {
        const stageName = stages.find((s) => s.id === applicant.stage_id)?.label ?? '';
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-applicant-stage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              notificationType: 'custom',
              applicantEmail: applicant.email,
              applicantName: `${applicant.first_name} ${applicant.last_name}`,
              clubName,
              clubId,
              stageName,
              customSubject: subject,
              customBody: body,
            }),
          }
        );
        if (res.ok) successCount++;
      } catch {
        // continue sending to others
      }
      setSent((n) => n + 1);
      await new Promise((r) => setTimeout(r, 120));
    }

    setSending(false);
    setSent(0);
    if (successCount === recipients.length) {
      toast.success(`Sent to ${recipients.length} applicant${recipients.length !== 1 ? 's' : ''}`);
    } else {
      toast.error(`Sent ${successCount} / ${recipients.length} (some failed)`);
    }
  };

  const isFilterActive = (f: RecipientFilter): boolean => {
    if (f.type === 'all' && filter.type === 'all') return true;
    if (f.type === 'stage' && filter.type === 'stage' && f.stageId === filter.stageId) return true;
    if (f.type === 'decision' && filter.type === 'decision' && f.decision === filter.decision)
      return true;
    return false;
  };

  const pillBase =
    'px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer border';
  const pillActive = 'bg-[hsl(43_74%_56%)] text-zinc-900 border-[hsl(43_74%_56%)]';
  const pillInactive =
    'bg-transparent text-zinc-400 border-white/15 hover:text-white hover:border-white/30';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Recipient pills */}
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Recipients
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            className={`${pillBase} ${isFilterActive({ type: 'all' }) ? pillActive : pillInactive}`}
            onClick={() => setFilter({ type: 'all' })}
          >
            All · {applicants.length}
          </button>
          {stages.map((stage) => {
            const count = applicants.filter((a) => a.stage_id === stage.id).length;
            return (
              <button
                key={stage.id}
                className={`${pillBase} ${isFilterActive({ type: 'stage', stageId: stage.id }) ? pillActive : pillInactive}`}
                onClick={() => setFilter({ type: 'stage', stageId: stage.id })}
              >
                {stage.label} · {count}
              </button>
            );
          })}
          {(() => {
            const acceptedCount = applicants.filter(
              (a) => (a as any).final_decision === 'accepted'
            ).length;
            const rejectedCount = applicants.filter(
              (a) => (a as any).final_decision === 'rejected'
            ).length;
            return (
              <>
                {acceptedCount > 0 && (
                  <button
                    className={`${pillBase} ${isFilterActive({ type: 'decision', decision: 'accepted' }) ? pillActive : pillInactive}`}
                    onClick={() => setFilter({ type: 'decision', decision: 'accepted' })}
                  >
                    Accepted · {acceptedCount}
                  </button>
                )}
                {rejectedCount > 0 && (
                  <button
                    className={`${pillBase} ${isFilterActive({ type: 'decision', decision: 'rejected' }) ? pillActive : pillInactive}`}
                    onClick={() => setFilter({ type: 'decision', decision: 'rejected' })}
                  >
                    Rejected · {rejectedCount}
                  </button>
                )}
              </>
            );
          })()}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Variable chips */}
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Insert variable — click to add at cursor
        </p>
        <div className="flex gap-2 flex-wrap">
          {VARIABLE_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => insertChip(chip.label)}
              className="px-2.5 py-1 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Subject
          </label>
          <input
            ref={subjectRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setActiveField('subject')}
            placeholder="e.g. Next steps for your {{club_name}} application"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[hsl(43_74%_56%)] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Message
          </label>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setActiveField('body')}
            placeholder={'Hi {{first_name}},\n\nThank you for applying to {{club_name}}...'}
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[hsl(43_74%_56%)] transition-colors resize-none font-mono"
          />
        </div>
      </div>

      {/* Preview toggle */}
      <button
        onClick={() => setShowPreview((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {showPreview ? 'Hide preview' : 'Show preview'}
      </button>

      {showPreview && (
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="bg-white/5 px-4 py-2 text-xs text-zinc-500 border-b border-white/10">
            Preview — using{' '}
            {previewApplicant
              ? `${previewApplicant.first_name} ${previewApplicant.last_name}`
              : 'first recipient'}
          </div>
          {previewApplicant ? (
            <div className="p-4 space-y-2">
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-400">Subject:</span>{' '}
                {subject ? (
                  interpolatePreview(subject, previewApplicant, clubName, previewStageName)
                ) : (
                  <span className="italic text-zinc-600">no subject</span>
                )}
              </p>
              <div className="bg-[#111] rounded-lg p-4 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
                {body ? (
                  interpolatePreview(body, previewApplicant, clubName, previewStageName)
                ) : (
                  <span className="italic text-zinc-600">no message body</span>
                )}
              </div>
            </div>
          ) : (
            <p className="p-4 text-sm text-zinc-500 italic">No recipients match this filter.</p>
          )}
        </div>
      )}

      {/* Send */}
      <Button
        onClick={handleSend}
        disabled={sending || !subject.trim() || !body.trim() || recipients.length === 0}
        className="gap-2 bg-[hsl(43_74%_56%)] text-zinc-900 hover:bg-[hsl(43_74%_48%)] font-semibold disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {sending
          ? `Sending… ${sent} / ${recipients.length}`
          : `Send to ${recipients.length} applicant${recipients.length !== 1 ? 's' : ''}`}
      </Button>
    </div>
  );
}
