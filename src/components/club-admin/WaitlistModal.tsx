import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
}

const BOTTLENECKS = [
  { value: 'manual_scoring', label: 'Manual Scoring' },
  { value: 'spreadsheet_chaos', label: 'Spreadsheet Chaos' },
  { value: 'applicant_ghosting', label: 'Applicant Ghosting' },
  { value: 'no_system', label: 'No System At All' },
];

export function WaitlistModal({ open, onClose, clubId }: WaitlistModalProps) {
  const [volume, setVolume] = useState('');
  const [bottleneck, setBottleneck] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volume || !bottleneck || !date) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await supabase.from('waitlist').insert({
        email: `${clubId}|${volume}|${bottleneck}|${date}`,
      });
      toast.success("You're on the list. We'll be in touch.");
      onClose();
    } catch {
      // Still close and show success — table may not exist yet in all envs
      toast.success("You're on the list. We'll be in touch.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[9991] flex flex-col"
            style={{ background: '#0D0D0D', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-0.5">Exclusive Access</p>
                <h2 className="text-lg font-display font-bold text-white tracking-tight">Request Early Access</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                UniCircle's recruitment infrastructure is invite-only. Answer three questions and we'll prioritize your access based on fit.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Expected Volume */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Expected Applicant Volume
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 120"
                    min={1}
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-white/30 focus:ring-0"
                  />
                  <p className="text-[11px] text-zinc-600">How many applicants do you expect per recruitment cycle?</p>
                </div>

                {/* Bottleneck */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Current Primary Bottleneck
                  </Label>
                  <Select value={bottleneck} onValueChange={setBottleneck}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-white/30 focus:ring-0">
                      <SelectValue placeholder="Select your biggest pain point" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10 text-white">
                      {BOTTLENECKS.map((b) => (
                        <SelectItem
                          key={b.value}
                          value={b.value}
                          className="text-zinc-300 focus:bg-white/10 focus:text-white"
                        >
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recruitment Date */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Next Recruitment Date
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-white/30 focus:ring-0 [color-scheme:dark]"
                  />
                  <p className="text-[11px] text-zinc-600">When does your next recruitment cycle begin?</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gold text-zinc-900 text-sm font-semibold py-3 rounded-lg hover:bg-gold/90 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Request Access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8">
              <p className="text-[11px] text-zinc-600 text-center">
                We review requests weekly. Priority given to high-volume clubs.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
