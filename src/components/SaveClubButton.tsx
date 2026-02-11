import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SaveClubButtonProps {
  clubId: string;
  clubName: string;
  isSaved: boolean;
  onSave: (userId: string, clubId: string, clubName: string) => Promise<{ success: boolean }>;
  onUnsave: (userId: string, clubId: string) => Promise<{ success: boolean }>;
  variant?: 'icon' | 'button';
  className?: string;
}

export default function SaveClubButton({
  clubId,
  clubName,
  isSaved,
  onSave,
  onUnsave,
  variant = 'icon',
  className = '',
}: SaveClubButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please log in to save clubs');
      navigate('/login');
      return;
    }

    setToggling(true);
    if (isSaved) {
      const result = await onUnsave(user.id, clubId);
      if (result.success) toast.success('Club unsaved');
    } else {
      const result = await onSave(user.id, clubId, clubName);
      if (result.success) toast.success('Club saved!');
    }
    setToggling(false);
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`p-1.5 rounded-full transition-colors hover:bg-muted ${className}`}
        title={isSaved ? 'Unsave' : 'Save'}
      >
        {toggling ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Heart
            className={`w-4 h-4 transition-colors ${
              isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-500'
            }`}
          />
        )}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="lg"
      className={`flex-1 ${className}`}
      onClick={handleToggle}
      disabled={toggling}
    >
      {toggling ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
      )}
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  );
}
