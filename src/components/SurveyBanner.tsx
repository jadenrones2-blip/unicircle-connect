import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';

export default function SurveyBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('survey-banner-dismissed') === '1'
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem('survey-banner-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 py-2 text-xs font-medium"
      style={{ background: 'hsl(43 74% 56%)', color: '#111' }}
    >
      <span className="font-semibold tracking-wide">We're building this for you.</span>
      <Link
        to="/survey"
        className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:opacity-70 transition-opacity"
      >
        Take the 3-min survey <ArrowRight className="w-3 h-3" />
      </Link>
      <button
        onClick={dismiss}
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
