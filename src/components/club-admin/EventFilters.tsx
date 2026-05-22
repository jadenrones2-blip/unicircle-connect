import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type StatusFilter = 'all' | 'published' | 'pending';

interface EventFiltersProps {
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function EventFilters({
  statusFilter,
  onStatusChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
  hasActiveFilters,
}: EventFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Status filter */}
      <Select value={statusFilter} onValueChange={(val) => onStatusChange(val as StatusFilter)}>
        <SelectTrigger className="w-[140px] bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border z-50">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      {/* Start date picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[150px] justify-start text-left font-normal bg-background',
              !startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, 'MMM d, yyyy') : 'From date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-background border border-border z-50"
          align="start"
        >
          <Calendar mode="single" selected={startDate} onSelect={onStartDateChange} initialFocus />
        </PopoverContent>
      </Popover>

      {/* End date picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[150px] justify-start text-left font-normal bg-background',
              !endDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, 'MMM d, yyyy') : 'To date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-background border border-border z-50"
          align="start"
        >
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={onEndDateChange}
            disabled={(date) => (startDate ? date < startDate : false)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
