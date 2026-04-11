import type { RecruitmentStage } from '@/hooks/useRecruitment';

const PALETTE = ['#3b82f6', '#f59e0b', '#a855f7', '#06b6d4', '#10b981'];

export function getStageColor(stage: RecruitmentStage, allStages: RecruitmentStage[]): string {
  const label = stage.label.toLowerCase();
  if (label.includes('accept')) return '#10b981';
  if (label.includes('reject') || label.includes('not select') || label.includes('denied')) return '#ef4444';
  const sorted = [...allStages].sort((a, b) => a.order_index - b.order_index);
  if (allStages.length > 1 && sorted[sorted.length - 1]?.id === stage.id) return '#ef4444';
  return PALETTE[stage.order_index % PALETTE.length] ?? '#3b82f6';
}
