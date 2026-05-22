import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, Trash2, Loader2, Check, Link2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Slot {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  booked_by_name: string | null;
  booked_by_email: string | null;
  booked_at: string | null;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function generateTimes(startTime: string, endTime: string, durationMins: number): string[] {
  const times: string[] = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let totalMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (totalMins + durationMins <= endMins) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    totalMins += durationMins;
  }
  return times;
}

interface InterviewSchedulerProps {
  clubId: string;
  clubName: string;
}

export function InterviewScheduler({ clubId, clubName }: InterviewSchedulerProps) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState(30);

  const bookingUrl = `${window.location.origin}/interview/${clubId}`;

  const fetchSlots = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('interview_slots')
      .select('*')
      .eq('club_id', clubId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    setSlots(data ?? []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const previewCount =
    date && startTime && endTime ? generateTimes(startTime, endTime, duration).length : 0;

  const handleGenerate = async () => {
    if (!date || !startTime || !endTime) {
      toast.error('Fill in date, start time, and end time');
      return;
    }
    if (startTime >= endTime) {
      toast.error('Start time must be before end time');
      return;
    }
    const times = generateTimes(startTime, endTime, duration);
    if (times.length === 0) {
      toast.error('No slots fit in that time range');
      return;
    }

    setGenerating(true);
    const rows = times.map((t) => ({
      club_id: clubId,
      date,
      start_time: t,
      duration_minutes: duration,
      created_by: user?.id,
    }));

    const { error } = await (supabase as any).from('interview_slots').insert(rows);
    setGenerating(false);

    if (error) {
      toast.error('Failed to create slots');
      return;
    }
    toast.success(`Created ${times.length} interview slots`);
    setDate('');
    fetchSlots();
  };

  const handleDelete = async (slotId: string) => {
    setDeleting(slotId);
    const { error } = await (supabase as any).from('interview_slots').delete().eq('id', slotId);
    setDeleting(null);
    if (error) {
      toast.error('Failed to delete slot');
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  // Group slots by date
  const byDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const totalBooked = slots.filter((s) => s.booked_at).length;

  return (
    <div className="space-y-6">
      {/* Booking link */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/8">
        <Link2 className="w-4 h-4 text-zinc-400 shrink-0" />
        <span className="text-xs text-zinc-400 truncate flex-1">{bookingUrl}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(bookingUrl);
            toast.success('Link copied');
          }}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors shrink-0"
        >
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
      </div>

      {/* Slot generator */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Create slots</p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-zinc-500 mb-1 block">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="h-8 text-xs bg-zinc-800 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Start</label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-8 text-xs bg-zinc-800 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">End</label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-8 text-xs bg-zinc-800 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Slot length</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-8 w-full text-xs bg-zinc-800 border border-white/10 text-white rounded-md px-2"
            >
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating || previewCount === 0}
          className="bg-gold hover:bg-gold/90 text-zinc-900 font-semibold text-xs h-8 px-4"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating…
            </>
          ) : previewCount > 0 ? (
            <>
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Generate {previewCount} slot
              {previewCount !== 1 ? 's' : ''}
            </>
          ) : (
            'Generate slots'
          )}
        </Button>
      </div>

      {/* Slot list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Your slots</p>
          {slots.length > 0 && (
            <span className="text-xs text-zinc-500">
              {totalBooked} booked · {slots.length - totalBooked} open
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : Object.keys(byDate).length === 0 ? (
          <p className="text-xs text-zinc-600 py-4 text-center border border-dashed border-white/8 rounded-lg">
            No slots yet — create some above and share the booking link with applicants
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byDate).map(([d, daySlots]) => (
              <div key={d}>
                <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(d)}
                </p>
                <div className="space-y-1.5">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs ${
                        slot.booked_at
                          ? 'border-emerald-400/20 bg-emerald-400/5'
                          : 'border-white/8 bg-zinc-900/60'
                      }`}
                    >
                      <Clock
                        className={`w-3.5 h-3.5 shrink-0 ${slot.booked_at ? 'text-emerald-400' : 'text-zinc-500'}`}
                      />
                      <span
                        className={`font-medium shrink-0 ${slot.booked_at ? 'text-emerald-300' : 'text-zinc-200'}`}
                      >
                        {formatTime(slot.start_time)}
                      </span>
                      <span className="text-zinc-600 shrink-0">{slot.duration_minutes} min</span>

                      {slot.booked_at ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300 truncate font-medium">
                            {slot.booked_by_name}
                          </span>
                          <span className="text-zinc-500 truncate">{slot.booked_by_email}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-zinc-600 flex-1">Available</span>
                          <button
                            onClick={() => handleDelete(slot.id)}
                            disabled={deleting === slot.id}
                            className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                          >
                            {deleting === slot.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
