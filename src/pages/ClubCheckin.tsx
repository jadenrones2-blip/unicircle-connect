import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, QrCode } from 'lucide-react';

interface StageInfo {
  label: string;
  club_id: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ClubCheckin() {
  const { clubId, stageId } = useParams<{ clubId: string; stageId: string }>();

  const [stage, setStage] = useState<StageInfo | null>(null);
  const [loadingStage, setLoadingStage] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [checkedInName, setCheckedInName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!stageId) return;
    (supabase as any)
      .from('recruitment_stages')
      .select('label, club_id')
      .eq('id', stageId)
      .single()
      .then(({ data }: { data: StageInfo | null }) => {
        setStage(data);
        setLoadingStage(false);
      });
  }, [stageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setStatus('submitting');
    setErrorMsg('');

    const { data, error } = await (supabase as any).rpc('checkin_applicant', {
      p_club_id: clubId,
      p_stage_id: stageId,
      p_first_name: firstName.trim(),
      p_last_name: lastName.trim(),
      p_major: major.trim() || null,
      p_year: year || null,
    });

    if (error) {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
      return;
    }

    setCheckedInName(`${firstName.trim()} ${lastName.trim()}`);
    setStatus('success');
  };

  if (loadingStage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <p className="text-zinc-500 text-sm">Check-in link not found.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
        <div className="w-full max-w-sm text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white mb-1">You're checked in!</h2>
            <p className="text-sm text-zinc-400">
              <span className="text-white font-medium">{checkedInName}</span> has been moved to{' '}
              <span className="text-white font-medium">{stage.label}</span>.
            </p>
          </div>
          <button
            onClick={() => {
              setFirstName('');
              setLastName('');
              setMajor('');
              setYear('');
              setStatus('idle');
              setCheckedInName('');
            }}
            className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
          >
            Check in another person
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-6 h-6 text-gold" />
          </div>
          <h1 className="text-xl font-display font-bold text-white mb-1">Check in</h1>
          <p className="text-sm text-zinc-400">
            Checking in for <span className="text-zinc-200 font-medium">{stage.label}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Alex"
                className="h-10 px-3 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Johnson"
                className="h-10 px-3 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Major</label>
            <input
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="Computer Science"
              className="h-10 px-3 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-10 px-3 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:border-white/25 transition-colors appearance-none"
            >
              <option value="">Select year</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Grad">Graduate</option>
            </select>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 text-center">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || !firstName.trim() || !lastName.trim()}
            className="h-11 mt-1 flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 disabled:opacity-50 text-zinc-900 font-semibold text-sm rounded-xl transition-colors"
          >
            {status === 'submitting' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Checking in…</>
            ) : (
              'Check in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
