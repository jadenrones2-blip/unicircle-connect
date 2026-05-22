import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calendar, MapPin, AlignLeft, Link } from 'lucide-react';
import { dataClient } from '@/integrations/supabase/dataClient';
import { toast } from 'sonner';

interface PostEventModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  onPosted: () => void;
}

export function PostEventModal({ open, onClose, clubId, clubName, onPosted }: PostEventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setDescription('');
    setImageUrl('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !date || !startTime) {
      toast.error('Title, date, and start time are required');
      return;
    }

    setSaving(true);
    try {
      const startISO = `${date}T${startTime}:00`;
      const endISO = endTime ? `${date}T${endTime}:00` : null;

      const record: Record<string, any> = {
        title: title.trim(),
        club_id: clubId.trim().toLowerCase(),
        club_handle: clubId.trim().toLowerCase(),
        start_time: startISO,
        end_time: endISO,
        location: location.trim() || null,
        description: description.trim() || null,
        source: 'native',
        verified: true,
        corrected_title: title.trim(),
        corrected_start_time: startISO,
        corrected_end_time: endISO,
        corrected_location: location.trim() || null,
      };

      if (imageUrl.trim()) record.image_url = imageUrl.trim();

      const { error } = await (dataClient as any).from('events').insert(record);
      if (error) throw error;

      toast.success('Event posted — students will see it in their feed');
      reset();
      onPosted();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post event');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = title.trim() && date && startTime;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            Post an Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">
              Event title <span className="text-red-400">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring General Meeting"
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
              autoFocus
            />
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-zinc-300 text-sm">
                Date <span className="text-red-400">*</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">
                Start <span className="text-red-400">*</span>
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Price Center Room 123 / Zoom"
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening? Who should come? What to bring?"
              rows={3}
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none"
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" /> Flyer or image URL{' '}
              <span className="text-zinc-600 font-normal">(optional)</span>
            </Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>

          <p className="text-[11px] text-zinc-600">
            This event will show up on your club page and in the feeds of students who match{' '}
            {clubName}'s interests.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/8">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting…
              </>
            ) : (
              'Post Event'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
