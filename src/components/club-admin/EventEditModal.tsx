import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { Loader2, Save, Calendar as CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { dataClient } from "@/integrations/supabase/dataClient";
import { ExternalEvent } from "@/hooks/useExternalEvents";

const eventEditSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  date: z.date({ required_error: "Date is required" }),
  startHour: z.string().min(1, "Start time is required"),
  startMinute: z.string(),
  endHour: z.string().optional(),
  endMinute: z.string().optional(),
  location: z.string().max(200).optional().or(z.literal("")),
});

type EventEditFormData = z.infer<typeof eventEditSchema>;

interface EventEditModalProps {
  event: ExternalEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  clubStages?: { id: string; label: string }[];
  isRecruitmentEnabled?: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => 
  i.toString().padStart(2, "0")
);
const minutes = ["00", "15", "30", "45"];

export function EventEditModal({ event, isOpen, onClose, onSaved, clubStages, isRecruitmentEnabled }: EventEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isRecruitmentEvent, setIsRecruitmentEvent] = useState(false);
  const [recruitmentStageId, setRecruitmentStageId] = useState('');

  const form = useForm<EventEditFormData>({
    resolver: zodResolver(eventEditSchema),
    defaultValues: {
      title: "",
      startHour: "12",
      startMinute: "00",
      endHour: "",
      endMinute: "00",
      location: "",
    },
  });

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      const startTime = event.corrected_start_time || event.start_time;
      const endTime = event.corrected_end_time || event.end_time;
      
      let startDate = new Date();
      let startHour = "12";
      let startMin = "00";
      let endHour = "";
      let endMin = "00";

      if (startTime) {
        try {
          const parsed = parseISO(startTime);
          startDate = parsed;
          startHour = format(parsed, "HH");
          startMin = format(parsed, "mm");
          // Round to nearest 15
          const minNum = parseInt(startMin);
          startMin = minutes[Math.round(minNum / 15) % 4];
        } catch (e) {
          console.error("Error parsing start time:", e);
        }
      }

      if (endTime) {
        try {
          const parsed = parseISO(endTime);
          endHour = format(parsed, "HH");
          endMin = format(parsed, "mm");
          const minNum = parseInt(endMin);
          endMin = minutes[Math.round(minNum / 15) % 4];
        } catch (e) {
          console.error("Error parsing end time:", e);
        }
      }

      form.reset({
        title: event.corrected_title || event.title || "",
        date: startDate,
        startHour,
        startMinute: startMin,
        endHour,
        endMinute: endMin,
        location: event.corrected_location || event.location || "",
      });
      setIsRecruitmentEvent(!!event.is_recruitment_event);
      setRecruitmentStageId(event.recruitment_stage_id ?? '');
    }
  }, [event, form]);

  const onSubmit = async (data: EventEditFormData) => {
    if (!event) return;

    setIsSaving(true);
    try {
      // Build the corrected timestamps
      const startDateTime = new Date(data.date);
      startDateTime.setHours(parseInt(data.startHour), parseInt(data.startMinute), 0, 0);

      let endDateTime: Date | null = null;
      if (data.endHour) {
        endDateTime = new Date(data.date);
        endDateTime.setHours(parseInt(data.endHour), parseInt(data.endMinute || "0"), 0, 0);
      }

      const { error: dbError } = await dataClient
        .from('events')
        .update({
          corrected_title: data.title,
          corrected_start_time: startDateTime.toISOString(),
          corrected_end_time: endDateTime ? endDateTime.toISOString() : null,
          corrected_location: data.location || null,
          is_recruitment_event: isRecruitmentEvent,
          recruitment_stage_id: isRecruitmentEvent && recruitmentStageId ? recruitmentStageId : null,
        })
        .eq('id', event.id);

      if (dbError) {
        throw new Error(dbError.message || "Failed to update event");
      }

      toast.success("Event updated successfully!");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error updating event:", err);
      toast.error(err.message || "Failed to update event");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the event details. Changes will use corrected fields.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Start Time</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="startHour"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {hours.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <span className="flex items-center">:</span>
                  <FormField
                    control={form.control}
                    name="startMinute"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {minutes.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>End Time (Optional)</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="endHour"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="">—</SelectItem>
                          {hours.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <span className="flex items-center">:</span>
                  <FormField
                    control={form.control}
                    name="endMinute"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || "00"}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {minutes.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Event location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isRecruitmentEnabled && clubStages && clubStages.length > 0 && (
              <div className="space-y-3 rounded-lg border border-white/10 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-recruitment-event"
                    checked={isRecruitmentEvent}
                    onCheckedChange={(v) => { setIsRecruitmentEvent(!!v); if (!v) setRecruitmentStageId(''); }}
                  />
                  <label htmlFor="is-recruitment-event" className="text-sm text-zinc-300 cursor-pointer">
                    This is a recruitment event
                  </label>
                </div>
                {isRecruitmentEvent && (
                  <Select value={recruitmentStageId} onValueChange={setRecruitmentStageId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select pipeline stage" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {clubStages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
