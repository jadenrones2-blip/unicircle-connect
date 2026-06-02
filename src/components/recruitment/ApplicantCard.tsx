import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Mail, MoreVertical, Trash2, Star, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Applicant } from '@/hooks/useRecruitment';
import { Checkbox } from '@/components/ui/checkbox.tsx';

const MAJOR_ABBR: [string, string][] = [
  ['computer science and engineering', 'CS/E'],
  ['electrical and computer engineering', 'ECE'],
  ['mathematics-economics', 'Math-Econ'],
  ['management science', 'Mgmt Sci'],
  ['international studies', "Int'l Studies"],
  ['computer science', 'CS'],
  ['cognitive science', 'CogSci'],
  ['political science', 'PolSci'],
  ['electrical engineering', 'EE'],
  ['mechanical engineering', 'MechE'],
  ['aerospace engineering', 'AeroE'],
  ['structural engineering', 'StructE'],
  ['chemical engineering', 'ChemE'],
  ['bioengineering', 'BioE'],
  ['nano engineering', 'NanoE'],
  ['human development', 'Human Dev'],
  ['environmental studies', 'Enviro'],
  ['global health', 'Global Hlth'],
  ['public health', 'Pub Health'],
  ['visual arts', 'Visual Arts'],
  ['data science', 'Data Sci'],
  ['mathematics', 'Math'],
  ['biochemistry', 'BioChem'],
  ['psychology', 'Psych'],
  ['economics', 'Econ'],
  ['neuroscience', 'Neuro'],
  ['sociology', 'Sociol'],
  ['chemistry', 'Chem'],
  ['philosophy', 'Phil'],
  ['linguistics', 'Ling'],
  ['literature', 'Lit'],
  ['communication', 'Comm'],
  ['history', 'Hist'],
  ['physics', 'Phys'],
  ['biology', 'Bio'],
  ['business', 'Business'],
];

function abbreviateMajor(major: string | null | undefined): string {
  if (!major) return '';
  const lower = major.toLowerCase().trim();
  for (const [pattern, abbr] of MAJOR_ABBR) {
    if (lower.includes(pattern)) return abbr;
  }
  return major.length > 12 ? major.slice(0, 11) + '…' : major;
}

function abbreviateYear(year: string | null | undefined): string {
  if (!year) return '';
  const lower = year.toLowerCase().trim();
  if (lower === 'freshman' || lower.startsWith('1st') || lower.startsWith('first')) return '1st';
  if (lower === 'sophomore' || lower.startsWith('2nd') || lower.startsWith('second')) return '2nd';
  if (lower === 'junior' || lower.startsWith('3rd') || lower.startsWith('third')) return '3rd';
  if (lower === 'senior' || lower.startsWith('4th') || lower.startsWith('fourth')) return '4th';
  if (lower.includes('graduate') || lower.includes('grad')) return 'Grad';
  return year;
}

const AVATAR_COLORS = [
  'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-rose-500/20 text-rose-300',
  'bg-amber-500/20 text-amber-300',
  'bg-purple-500/20 text-purple-300',
  'bg-pink-500/20 text-pink-300',
  'bg-teal-500/20 text-teal-300',
  'bg-orange-500/20 text-orange-300',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ApplicantAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'sm',
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  const color = getAvatarColor(`${firstName}${lastName}`);
  const sizeClass =
    size === 'lg' ? 'w-10 h-10 text-sm' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-xs';
  if (avatarUrl) {
    return (
      <img src={avatarUrl} className={`${sizeClass} rounded-full object-cover shrink-0`} alt="" />
    );
  }
  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}
    >
      {initials || '?'}
    </div>
  );
}

interface ApplicantCardProps {
  applicant: Applicant;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen?: (applicant: Applicant) => void;
  /** Officer's own weighted rubric score 0–100, shown as secondary badge */
  officerScore?: number | null;
  /** All pipeline stages for the "Move to →" dropdown */
  stages?: { id: string; label: string }[];
  /** Current stage id — excluded from move options */
  currentStageId?: string;
  onMove?: (applicantId: string, stageId: string) => void;
}

export function ApplicantCard({
  applicant,
  onDelete,
  onOpen,
  officerScore,
  stages,
  currentStageId,
  onMove,
  isSelected = false,
  onSelect,
}: ApplicantCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: applicant.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
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

  // Derive standout: explicit AI flag, or fallback to high score + passes strict
  const isStandout =
    applicant.is_standout ??
    ((applicant.fit_score ?? 0) >= 85 && applicant.passes_strict_filters !== false);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={() => !isDragging && onOpen?.(applicant)}
      className={`p-3 bg-zinc-900 transition-shadow
       ${isStandout ? 'border-gold/40 ring-1 ring-gold/20' : 'border-white/10'}
       ${isDragging ? '' : 'hover:bg-zinc-800'}
       ${onOpen ? 'cursor-pointer' : ''} 
      ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col justify-between items-center self-stretch">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 p-0.5 rounded hover:bg-white/10 cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-4 h-4 text-zinc-600" />
          </button>
          <Checkbox
            onClick={(e) => e.stopPropagation()}
            checked={isSelected}
            onCheckedChange={() => onSelect?.(applicant.id)}
            className="border-zinc-500 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400 data-[state=checked]:text-white cursor-pointer"
          />
        </div>

        <ApplicantAvatar
          firstName={applicant.first_name}
          lastName={applicant.last_name}
          avatarUrl={applicant.avatar_url}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {isStandout && <Star className="w-3.5 h-3.5 text-gold fill-gold shrink-0" />}
                <p className="font-medium text-sm text-zinc-100 truncate">
                  {applicant.first_name} {applicant.last_name}
                </p>
              </div>
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
                {stages && stages.filter((s) => s.id !== currentStageId).length > 0 && (
                  <>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Move to
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {stages
                          .filter((s) => s.id !== currentStageId)
                          .map((s) => (
                            <DropdownMenuItem
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onMove?.(applicant.id, s.id);
                              }}
                            >
                              {s.label}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(applicant.id);
                  }}
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
                {abbreviateMajor(applicant.major)}
              </span>
            )}
            {applicant.year && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">
                {abbreviateYear(applicant.year)}
              </span>
            )}
            {getFitScoreBadge()}
            {officerScore != null && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs gap-1 border-gold/40 text-gold/80">
                      <Star className="w-3 h-3" />
                      {officerScore}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Your rubric score</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
