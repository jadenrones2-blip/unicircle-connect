import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { dataClient } from '@/integrations/supabase/dataClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, CheckCircle, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logoImage from '@/assets/unicircle-logo-new.png';

interface Slot {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  booked_by_applicant_id: string | null;
}

interface Applicant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

type Step = 'email' | 'slots' | 'confirmed';

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function formatDateShort(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function googleCalendarUrl(
  title: string, date: string, startTime: string, durationMins: number, description: string
): string {
  const startDt = `${date.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
  const endTime = addMinutesToTime(startTime, durationMins);
  const endDt = `${date.replace(/-/g, '')}T${endTime.replace(':', '')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDt}/${endDt}`,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function InterviewBooking() {
  const { clubId } = useParams<{ clubId: string }>();
  const [clubName, setClubName] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);

  // Fetch club name
  useEffect(() => {
    if (!clubId) return;
    dataClient.from('clubs').select('name').eq('id', clubId).maybeSingle()
      .then(({ data }) => { if (data) setClubName((data as any).name ?? ''); });
  }, [clubId]);

  const handleVerifyEmail = async () => {
    if (!email.trim() || !clubId) return;
    setVerifying(true);

    const { data, error } = await supabase
      .from('applicants')
      .select('id, first_name, last_name, email')
      .eq('email', email.trim().toLowerCase())
      .eq('club_id', clubId.trim().toLowerCase())
      .maybeSingle();

    setVerifying(false);

    if (error || !data) {
      toast.error("We couldn't find an application for that email.", {
        description: 'Make sure you use the same email you applied with.',
      });
      return;
    }

    setApplicant(data as Applicant);
    setSlotsLoading(true);

    // Fetch available slots
    const { data: slotData } = await (supabase as any)
      .from('interview_slots')
      .select('*')
      .eq('club_id', clubId)
      .is('booked_by_applicant_id', null)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    setSlots(slotData ?? []);
    setSlotsLoading(false);
    setStep('slots');
  };

  const handleBook = async () => {
    if (!selectedSlot || !applicant || !clubId) return;
    const slot = slots.find(s => s.id === selectedSlot);
    if (!slot) return;

    setBooking(true);
    const { error } = await (supabase as any)
      .from('interview_slots')
      .update({
        booked_by_applicant_id: applicant.id,
        booked_by_name: `${applicant.first_name} ${applicant.last_name}`,
        booked_by_email: applicant.email,
        booked_at: new Date().toISOString(),
      })
      .eq('id', selectedSlot)
      .is('booked_by_applicant_id', null); // Race condition guard

    setBooking(false);

    if (error) {
      toast.error('That slot was just taken. Please pick another.');
      // Refresh slots
      const { data: fresh } = await (supabase as any)
        .from('interview_slots')
        .select('*')
        .eq('club_id', clubId)
        .is('booked_by_applicant_id', null)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      setSlots(fresh ?? []);
      setSelectedSlot(null);
      return;
    }

    setBookedSlot(slot);
    setStep('confirmed');
  };

  // Group available slots by date
  const byDate = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoImage} alt="UniCircle" className="h-8 object-contain" />
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Email entry ── */}
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-white mb-1">
                  Book your interview
                </h1>
                {clubName && (
                  <p className="text-zinc-400 text-sm">with <span className="text-white font-medium">{clubName}</span></p>
                )}
              </div>

              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Email you applied with</label>
                  <Input
                    type="email"
                    placeholder="you@ucsd.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleVerifyEmail(); }}
                    className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 h-11"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleVerifyEmail}
                  disabled={verifying || !email.trim()}
                  className="w-full h-11 bg-gold hover:bg-gold/90 text-zinc-900 font-semibold"
                >
                  {verifying
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</>
                    : <>Find my slots <ArrowRight className="w-4 h-4 ml-2" /></>
                  }
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Slot selection ── */}
          {step === 'slots' && (
            <motion.div
              key="slots"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-white mb-1">
                  Hi {applicant?.first_name} 👋
                </h1>
                <p className="text-zinc-400 text-sm">
                  Pick a time that works for you
                </p>
              </div>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading available times…</span>
                </div>
              ) : Object.keys(byDate).length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
                  <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400 mb-1">No slots available yet</p>
                  <p className="text-xs text-zinc-600">The club will add times soon — check back shortly.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {Object.entries(byDate).map(([d, daySlots]) => (
                    <div key={d}>
                      <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(d)}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {daySlots.map(slot => {
                          const isSelected = selectedSlot === slot.id;
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(isSelected ? null : slot.id)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                isSelected
                                  ? 'border-gold bg-gold/15 text-gold'
                                  : 'border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/25 hover:text-white'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              {formatTime(slot.start_time)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSlot && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Button
                    onClick={handleBook}
                    disabled={booking}
                    className="w-full h-11 bg-gold hover:bg-gold/90 text-zinc-900 font-semibold"
                  >
                    {booking
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…</>
                      : 'Confirm booking →'
                    }
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Step 3: Confirmed ── */}
          {step === 'confirmed' && bookedSlot && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div>
                <div className="w-16 h-16 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-display font-bold text-white mb-1">You're booked!</h1>
                <p className="text-zinc-400 text-sm">See you soon, {applicant?.first_name}.</p>
              </div>

              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gold shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500">Date</p>
                    <p className="text-sm font-medium text-white">{formatDate(bookedSlot.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gold shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500">Time</p>
                    <p className="text-sm font-medium text-white">
                      {formatTime(bookedSlot.start_time)} · {bookedSlot.duration_minutes} min
                    </p>
                  </div>
                </div>
                {clubName && (
                  <div className="pt-2 border-t border-white/8">
                    <p className="text-xs text-zinc-500">Club</p>
                    <p className="text-sm font-medium text-white">{clubName}</p>
                  </div>
                )}
              </div>

              <a
                href={googleCalendarUrl(
                  `Interview with ${clubName}`,
                  bookedSlot.date,
                  bookedSlot.start_time,
                  bookedSlot.duration_minutes,
                  `Your interview with ${clubName}. Booked via UniCircle.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-white/10 text-sm font-medium text-zinc-300 hover:text-white hover:border-white/25 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Add to Google Calendar
              </a>
            </motion.div>
          )}

        </AnimatePresence>

        <p className="text-center text-xs text-zinc-700 mt-8">Powered by UniCircle</p>
      </div>
    </div>
  );
}
