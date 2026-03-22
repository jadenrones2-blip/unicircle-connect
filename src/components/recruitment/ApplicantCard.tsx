import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Mail, MoreVertical, Trash2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Applicant } from '@/hooks/useRecruitment';

interface ApplicantCardProps {
  applicant: Applicant;
  onDelete: (id: string) => void;
  onOpen?: (applicant: Applicant) => void;
}

export function ApplicantCard({ applicant, onDelete, onOpen }: ApplicantCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: applicant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getFitScoreBadge = () => {
    const score = applicant.fit_score;
    if (score === null || score === undefined) return null;

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    if (score >= 80) variant = 'default';
    else if (score >= 60) variant = 'secondary';
    else if (score < 40) variant = 'destructive';

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={variant} className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              {score}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{applicant.ai_summary || 'AI screening score'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={() => !isDragging && onOpen?.(applicant)}
      className={`p-3 bg-zinc-900 border-white/10 transition-shadow ${
        isDragging ? 'shadow-lg opacity-90 z-50' : 'hover:bg-zinc-800'
      } ${onOpen ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-0.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm text-zinc-100 truncate">
                {applicant.first_name} {applicant.last_name}
              </p>
              <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                <Mail className="w-3 h-3" />
                <span className="truncate">{applicant.email}</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(applicant.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {applicant.major && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">
                {applicant.major}
              </span>
            )}
            {applicant.year && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">
                {applicant.year}
              </span>
            )}
            {getFitScoreBadge()}
          </div>
        </div>
      </div>
    </Card>
  );
}
