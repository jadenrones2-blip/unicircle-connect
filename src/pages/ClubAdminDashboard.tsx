import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership, VerificationState } from '@/hooks/useClubOwnership';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { Loader2, Plus, Calendar, Settings, CheckCircle2, AlertTriangle, XCircle, Shield } from 'lucide-react';
import { OnboardingChecklist } from '@/components/club-admin/OnboardingChecklist';
import { motion } from 'framer-motion';

function VerificationPip({ state }: { state: VerificationState }) {
  const map = {
    verified: { color: '#22c55e', label: 'Verified' },
    provisional: { color: '#eab308', label: 'Provisional' },
    suspended: { color: '#ef4444', label: 'Suspended' },
    unverified: { color: '#71717a', label: 'Unverified' },
  };
  const { color, label } = map[state] ?? map.unverified;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function ClubAdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading, hasProvisionalClub } = useClubOwnership();
  const { loading: profileLoading, isProfileComplete } = useAdminProfile();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/club-admin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && ownedClubs.length === 0) navigate('/clubs');
  }, [authLoading, ownershipLoading, user, ownedClubs.length, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && !profileLoading && user && ownedClubs.length > 0 && !isProfileComplete)
      navigate('/admin-onboarding');
  }, [authLoading, ownershipLoading, profileLoading, user, ownedClubs, isProfileComplete, navigate]);

  if (authLoading || ownershipLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (!user || !isProfileComplete || ownedClubs.length === 0) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />

        <main className="flex-1 min-w-0">
          {/* Header */}
          <header
            className="h-14 flex items-center px-4 gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <span className="text-sm font-semibold text-white tracking-tight">Club Admin</span>
          </header>

          <div className="p-5 sm:p-7 w-full">

            {/* Provisional warning */}
            {hasProvisionalClub && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-4 py-3 rounded-xl flex items-start gap-3"
                style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}
              >
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Provisional account</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Some features are restricted until you verify with a .edu email or get confirmed by a verified admin.</p>
                  <ul className="mt-2 space-y-0.5">
                    {['Events saved as drafts', 'No mass messages', 'External links require review'].map(r => (
                      <li key={r} className="flex items-center gap-2 text-xs text-zinc-600">
                        <XCircle className="w-3 h-3 text-red-500/70 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Welcome */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                Welcome back.
              </h1>
              <p className="text-sm text-zinc-500 mt-1">Here's what's happening with your clubs.</p>
            </motion.div>

            {/* Onboarding checklists */}
            {ownedClubs.map((club) => (
              <div key={`checklist-${club.clubId}`} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600">Setup</p>
                  <span className="text-[10px] text-zinc-500">·</span>
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-gold truncate">{club.clubName}</p>
                </div>
                <OnboardingChecklist club={club} />
              </div>
            ))}

            {/* My Clubs */}
            <section className="mb-8">
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-3">
                My Clubs
              </p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ownedClubs.map((club, i) => (
                  <motion.div
                    key={club.clubId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-2xl p-5 group"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white leading-tight pr-2 tracking-tight">
                        {club.clubName}
                      </h3>
                      <VerificationPip state={club.verificationState} />
                    </div>
                    <p className="text-[11px] text-zinc-600 mb-4">
                      Claimed {new Date(club.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/club-admin/clubs/${club.clubId}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <Settings className="w-3 h-3" />
                        Edit
                      </Link>
                      <Link
                        to={`/club-admin/clubs/${club.clubId}/events`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <Calendar className="w-3 h-3" />
                        Events
                      </Link>
                      <Link
                        to={`/submit-event?club=${club.clubId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition-colors"
                        style={{ background: 'hsl(43 74% 56%)' }}
                      >
                        <Plus className="w-3 h-3" />
                        {club.verificationState === 'provisional' ? 'Draft' : 'New Event'}
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Recruitment */}
            <section className="mb-8">
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-3">
                Recruitment
              </p>
              <div className="flex flex-col gap-2">
                {ownedClubs.map((club) => (
                  <Link
                    key={club.clubId}
                    to={`/club-admin/clubs/${club.clubId}/recruitment`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{club.clubName}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Manage stages, review applicants, run AI screening</p>
                    </div>
                    <span className="text-zinc-600 group-hover:text-gold transition-colors text-lg">→</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
