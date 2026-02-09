import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Check, AlertCircle, Calendar, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface EventbriteSyncCardProps {
  clubId: string;
  initialUrl?: string | null;
  initialStatus?: string | null;
  initialLastSynced?: string | null;
  initialError?: string | null;
  onUpdate?: () => void;
}

export function EventbriteSyncCard({
  clubId,
  initialUrl = null,
  initialStatus = "idle",
  initialLastSynced = null,
  initialError = null,
  onUpdate,
}: EventbriteSyncCardProps) {
  const [organizerUrl, setOrganizerUrl] = useState(initialUrl || "");
  const [syncStatus, setSyncStatus] = useState(initialStatus || "idle");
  const [lastSynced, setLastSynced] = useState(initialLastSynced);
  const [syncError, setSyncError] = useState(initialError);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOrganizerUrl(initialUrl || "");
    setSyncStatus(initialStatus || "idle");
    setLastSynced(initialLastSynced);
    setSyncError(initialError);
  }, [initialUrl, initialStatus, initialLastSynced, initialError]);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (clearing)
    
    const patterns = [
      /^https?:\/\/(www\.)?eventbrite\.com\/o\/.+/i,
    ];
    
    return patterns.some((p) => p.test(url.trim()));
  };

  const handleSaveUrl = async () => {
    const trimmedUrl = organizerUrl.trim();
    
    if (trimmedUrl && !validateUrl(trimmedUrl)) {
      toast.error("Invalid Eventbrite organizer URL. Expected format: https://www.eventbrite.com/o/ORGANIZER-NAME-123456");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke("external-db-proxy", {
        body: {
          table: "clubs",
          action: "update",
          id: clubId,
          record: {
            eventbrite_organizer_url: trimmedUrl || null,
            eventbrite_sync_status: trimmedUrl ? "idle" : null,
            eventbrite_sync_error: null,
          },
        },
      });

      if (error) throw error;

      setSyncStatus(trimmedUrl ? "idle" : null);
      setSyncError(null);
      toast.success(trimmedUrl ? "Eventbrite URL saved" : "Eventbrite URL cleared");
      onUpdate?.();
    } catch (err: any) {
      console.error("Error saving Eventbrite URL:", err);
      toast.error("Failed to save Eventbrite URL");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    const trimmedUrl = organizerUrl.trim();
    
    if (!trimmedUrl) {
      toast.error("Please enter an Eventbrite organizer URL first");
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      toast.error("Invalid Eventbrite organizer URL format");
      return;
    }

    setIsSyncing(true);
    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-club-eventbrite", {
        body: {
          club_id: clubId,
          organizer_url: trimmedUrl,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setSyncStatus("success");
        setLastSynced(new Date().toISOString());
        setSyncError(null);
        
        const message = data.eventsCreated > 0 || data.eventsUpdated > 0
          ? `Synced ${data.eventsCreated} new events, updated ${data.eventsUpdated}`
          : `Found ${data.eventsFound} events (no changes needed)`;
        
        toast.success(message);
      } else {
        setSyncStatus("error");
        setSyncError(data?.error || "Sync failed");
        toast.error(data?.error || "Sync failed");
      }

      onUpdate?.();
    } catch (err: any) {
      console.error("Eventbrite sync error:", err);
      setSyncStatus("error");
      setSyncError(err.message || "Sync failed");
      toast.error(err.message || "Failed to sync Eventbrite events");
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "success":
        return <Check className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case "syncing":
        return "Syncing...";
      case "success":
        return lastSynced
          ? `Last synced ${formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}`
          : "Sync successful";
      case "error":
        return "Sync failed";
      default:
        return organizerUrl ? "Ready to sync" : "Not configured";
    }
  };

  return (
    <div className="premium-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Eventbrite Events Sync</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Connect your Eventbrite organizer page to automatically import events.
        Events will sync every 6 hours and can be manually triggered.
      </p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="eventbrite-url" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Eventbrite Organizer URL
          </Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="eventbrite-url"
              type="url"
              value={organizerUrl}
              onChange={(e) => setOrganizerUrl(e.target.value)}
              placeholder="https://www.eventbrite.com/o/your-org-123456"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveUrl}
              disabled={isSaving || isSyncing}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Find this URL on your Eventbrite organizer profile page
          </p>
        </div>

        {/* Status and Sync Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm">
            {getStatusIcon()}
            <span className={syncStatus === "error" ? "text-destructive" : "text-muted-foreground"}>
              {getStatusText()}
            </span>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || !organizerUrl.trim()}
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>

        {/* Error message */}
        {syncError && syncStatus === "error" && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive-foreground">{syncError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
