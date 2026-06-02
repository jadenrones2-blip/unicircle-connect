import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership, VerificationState } from '@/hooks/useClubOwnership';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import {
  Loader2,
  Plus,
  Calendar,
  Settings,
  AlertTriangle,
  XCircle,
  Users,
  BarChart2,
} from 'lucide-react';
import { OnboardingChecklist } from '@/components/club-admin/OnboardingChecklist';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Active tab — defaults to first club, updates if ownedClubs changes
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  useEffect(() => {
    if (ownedClubs.length > 0 && !activeClubId) {
      setActiveClubId(ownedClubs[0].clubId);
    }
  }, [ownedClubs, activeClubId]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/club-admin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && ownedClubs.length === 0) navigate('/clubs');
  }, [authLoading, ownershipLoading, user, ownedClubs.length, navigate]);

  useEffect(() => {
    if (
      !authLoading &&
      !ownershipLoading &&
      !profileLoading &&
      user &&
      ownedClubs.length > 0 &&
      !isProfileComplete
    )
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

  const activeClub = ownedClubs.find((c) => c.clubId === activeClubId) ?? ownedClubs[0];
  const multiClub = ownedClubs.length > 1;

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

          <div className="p-5 sm:p-7 w-full max-w-4xl">
            {/* Provisional warning */}
            {hasProvisionalClub && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-4 py-3 rounded-xl flex items-start gap-3"
                style={{
                  background: 'rgba(234,179,8,0.06)',
                  border: '1px solid rgba(234,179,8,0.15)',
                }}
              >
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Provisional account</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Some features are restricted until you verify with a .edu email or get confirmed
                    by a verified admin.
                  </p>
                  <ul className="mt-2 space-y-0.5">
                    {['Events saved as drafts', 'No mass messages', 'External links require review'].map(
                      (r) => (
                        <li key={r} className="flex items-center gap-2 text-xs text-zinc-600">
                          <XCircle className="w-3 h-3 text-red-500/70 shrink-0" />
                          {r}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Welcome */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6"
            >
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                Welcome back.
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                {multiClub
                  ? `You manage ${ownedClubs.length} clubs. Select one below.`
                  : "Here's what's happening with your club."}
              </p>
            </motion.div>

            {/* Club tabs — only shown when managing multiple clubs */}
            {multiClub && (
              <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {ownedClubs.map((club) => (
                  <button
                    key={club.clubId}
                    onClick={() => setActiveClubId(club.clubId)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeClubId === club.clubId
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {club.clubName}
                  </button>
                ))}
              </div>
            )}

            {/* Per-club content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeClub.clubId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {/* Club card */}
                <div
                  className="rounded-2xl p-5 mb-6"
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-display font-bold text-white tracking-tight">
                        {activeClub.clubName}
                      </h2>
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        {(() => {
                          const d = activeClub.verifiedAt ? new Date(activeClub.verifiedAt) : null;
                          const valid = d && !isNaN(d.getTime()) && d.getFullYear() >= 2000;
                          return valid
                            ? `Claimed ${d!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : 'Active';
                        })()}
                      </p>
                    </div>
                    <VerificationPip state={activeClub.verificationState} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/club-admin/clubs/${activeClub.clubId}/edit`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Settings className="w-3 h-3" />
                      Edit
                    </Link>
                    <Link
                      to={`/club-admin/clubs/${activeClub.clubId}/events`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Calendar className="w-3 h-3" />
                      Events
                    </Link>
                    <Link
                      to={`/club-admin/clubs/${activeClub.clubId}/people`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Users className="w-3 h-3" />
                      People
                    </Link>
                    <Link
                      to={`/club-admin/clubs/${activeClub.clubId}/analytics`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <BarChart2 className="w-3 h-3" />
                      Analytics
                    </Link>
                    <Link
                      to={`/submit-event?club=${activeClub.clubId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 transition-colors"
                      style={{ background: 'hsl(43 74% 56%)' }}
                    >
                      <Plus className="w-3 h-3" />
                      {activeClub.verificationState === 'provisional' ? 'Draft Event' : 'New Event'}
                    </Link>
                  </div>
                </div>

                {/* Setup checklist */}
                <div className="mb-6">
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-3">
                    Setup
                  </p>
                  <OnboardingChecklist club={activeClub} />
                </div>

                {/* Recruitment */}
                <div className="mb-6">
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-3">
                    Recruitment
                  </p>
                  <Link
                    to={`/club-admin/clubs/${activeClub.clubId}/recruitment`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Recruitment Pipeline</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Manage stages, review applicants, run AI screening
                      </p>
                    </div>
                    <span className="text-zinc-600 group-hover:text-gold transition-colors text-lg">
                      →
                    </span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
