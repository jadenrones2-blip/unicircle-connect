import { useEffect, useMemo, useState } from "react";import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClubAdminSidebar } from "@/components/club-admin/ClubAdminSidebar";
import { AdminBreadcrumb } from "@/components/club-admin/AdminBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubOwnership } from "@/hooks/useClubOwnership";
import { useRecruitment } from "@/hooks/useRecruitment";
import { Loader2 } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD = "hsl(43 74% 56%)";
const YEAR_ORDER = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];

const PIE_COLORS = [
  GOLD,
  "hsl(43 74% 72%)",
  "hsl(43 74% 44%)",
  "hsl(200 60% 55%)",
  "hsl(280 50% 60%)",
  "hsl(160 50% 50%)",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
}

function StatCard({ label, value, sub, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="premium-card p-5 flex flex-col gap-1"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="text-3xl font-display font-bold text-gold leading-none mt-1">
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-3">
      {children}
    </p>
  );
}

// Custom tooltip that matches the dark theme
function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#e4e4e7",
      }}
    >
      <p className="font-medium text-white">{label}</p>
      <p style={{ color: GOLD }}>{payload[0].value} applicants</p>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: "#0A0A0A" }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col">
          <header
            className="h-14 flex items-center px-4 gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <Skeleton className="h-4 w-48" />
          </header>
          <div className="flex-1 p-5 sm:p-7 space-y-8 max-w-6xl">
            {/* stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            {/* charts */}
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClubAdminAnalytics() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();
  const { stages, applicants, loading: recruitmentLoading, isEnabled } = useRecruitment(clubId);

  const [activeTab, setActiveTab] = useState<'recruitment' | 'demographics'>('recruitment');
  const [demographics, setDemographics] = useState<any[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);

  // Also count people from the OrgPeopleDashboard `people` table
  const [peopleCount, setPeopleCount] = useState(0);
  useEffect(() => {
    if (!clubId) return;
    (supabase as any)
      .from('people')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', clubId)
      .then(({ count }: { count: number | null }) => {
        if (count) setPeopleCount(count);
      });
  }, [clubId]);

  useEffect(() => {
    if (!clubId || activeTab !== 'demographics') return;
    setDemoLoading(true);
    (supabase as any)
      .from('people')
      .select('status, gender, major, grad_year')
      .eq('organization_id', clubId)
      .then(({ data }: { data: any[] | null }) => {
        setDemographics(data || []);
        setDemoLoading(false);
      });
  }, [clubId, activeTab]);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/club-admin/clubs/${clubId}/analytics`);
    }
  }, [authLoading, user, clubId, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId && !isOwnerOf(clubId)) {
      navigate("/club-admin");
    }
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, navigate]);

  // ── Derived analytics data ──────────────────────────────────────────────────
  const analytics = useMemo(() => {
    // Use kanban applicants if available, fall back to people table count
    const total = applicants.length > 0 ? applicants.length : peopleCount;

    // Avg GPA
    const gpas = applicants.map((a) => a.gpa).filter((g): g is number => g !== null);
    const avgGpa = gpas.length > 0 ? gpas.reduce((s, g) => s + g, 0) / gpas.length : null;

    // Top major
    const majorCounts: Record<string, number> = {};
    for (const a of applicants) {
      const m = a.major?.trim() || "Unknown";
      majorCounts[m] = (majorCounts[m] ?? 0) + 1;
    }
    const topMajor =
      Object.keys(majorCounts).length > 0
        ? Object.entries(majorCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // Applicants per stage (in stage order)
    const stageCountMap: Record<string, number> = {};
    for (const a of applicants) {
      if (a.stage_id) stageCountMap[a.stage_id] = (stageCountMap[a.stage_id] ?? 0) + 1;
    }
    const stageData = [...stages]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({ name: s.label, count: stageCountMap[s.id] ?? 0 }));

    // Major breakdown — top 8
    const majorData = Object.entries(majorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Year breakdown
    const yearCounts: Record<string, number> = {};
    for (const a of applicants) {
      const raw = a.year?.trim() ?? "";
      let bucket = "Other";
      if (/freshman/i.test(raw)) bucket = "Freshman";
      else if (/sophomore/i.test(raw)) bucket = "Sophomore";
      else if (/junior/i.test(raw)) bucket = "Junior";
      else if (/senior/i.test(raw)) bucket = "Senior";
      else if (/grad/i.test(raw) || /master/i.test(raw) || /phd/i.test(raw) || /doctor/i.test(raw))
        bucket = "Graduate";
      else if (raw) bucket = raw;
      yearCounts[bucket] = (yearCounts[bucket] ?? 0) + 1;
    }
    const yearData = YEAR_ORDER.filter((y) => yearCounts[y] > 0).map((y) => ({
      name: y,
      value: yearCounts[y],
    }));
    // Include any buckets not in the standard order (e.g. custom year strings)
    for (const [y, v] of Object.entries(yearCounts)) {
      if (!YEAR_ORDER.includes(y)) yearData.push({ name: y, value: v });
    }

    return { total, avgGpa, topMajor, stageData, majorData, yearData };
  }, [applicants, stages]);

  const demoStats = useMemo(() => {
    const total = demographics.length;
    if (total === 0) return null;

    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

    // Status
    const statusCounts = { applicant: 0, member: 0, alumni: 0 };
    for (const p of demographics) {
      const s = p.status as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    }

    // Gender
    const genderCounts: Record<string, number> = {};
    for (const p of demographics) {
      const g = p.gender || 'unspecified';
      genderCounts[g] = (genderCounts[g] ?? 0) + 1;
    }

    // Major top 5 + Other
    const majorMap: Record<string, number> = {};
    for (const p of demographics) {
      const m = p.major?.trim() || 'Unknown';
      majorMap[m] = (majorMap[m] ?? 0) + 1;
    }
    const majorEntries = Object.entries(majorMap).sort((a, b) => b[1] - a[1]);
    const topMajors = majorEntries.slice(0, 5);
    const otherCount = majorEntries.slice(5).reduce((s, [, n]) => s + n, 0);
    if (otherCount > 0) topMajors.push(['Other', otherCount]);

    // Grad year
    const yearMap: Record<string, number> = {};
    for (const p of demographics) {
      const y = p.grad_year ? String(p.grad_year) : 'Unknown';
      yearMap[y] = (yearMap[y] ?? 0) + 1;
    }
    const gradYears = Object.entries(yearMap).sort((a, b) => a[0].localeCompare(b[0]));

    return { total, pct, statusCounts, genderCounts, topMajors, gradYears };
  }, [demographics]);

  const clubName = ownedClubs.find((c) => c.clubId?.trim().toLowerCase() === clubId?.trim().toLowerCase())?.clubName ?? "Club";

  // ── Loading states ──────────────────────────────────────────────────────────
  if (authLoading || ownershipLoading || recruitmentLoading) {
    return <LoadingSkeleton />;
  }

  if (!user || !clubId) return null;

  // ── Recruitment not enabled ─────────────────────────────────────────────────
  if (!isEnabled) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full" style={{ background: "#0A0A0A" }}>
          <ClubAdminSidebar />
          <main className="flex-1 flex flex-col">
            <header
              className="h-14 flex items-center px-4 gap-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
              <AdminBreadcrumb
                items={[
                  { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
                  { label: "Analytics" },
                ]}
              />
            </header>
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-sm px-6"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={GOLD}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 16l4-4 4 4 4-6" />
                  </svg>
                </div>
                <h2 className="text-lg font-display font-semibold text-white mb-2">
                  Recruitment not enabled
                </h2>
                <p className="text-sm text-zinc-500">
                  Enable recruitment for this club to start tracking applicants and
                  viewing analytics.
                </p>
              </motion.div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const { total, avgGpa, topMajor, stageData, majorData, yearData } = analytics;
  const hasApplicants = total > 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: "#0A0A0A" }}>
        <ClubAdminSidebar />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header
            className="h-14 flex items-center px-4 gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb
              items={[
                { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
                { label: "Analytics" },
              ]}
            />
          </header>

          {/* Body */}
          <div className="flex-1 p-5 sm:p-7 max-w-6xl w-full space-y-8">
            {/* Page title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                Recruitment Analytics
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                A snapshot of your applicant pipeline.
              </p>
            </motion.div>

            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] w-fit">
              {(['recruitment', 'demographics'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-gold text-zinc-900'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'recruitment' && (
              <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Applicants"
                value={total}
                delay={0.05}
              />
              <StatCard
                label="Stages"
                value={stages.length}
                delay={0.1}
              />
              <StatCard
                label="Avg GPA"
                value={avgGpa !== null ? avgGpa.toFixed(2) : "—"}
                sub={avgGpa !== null ? `from ${analytics.yearData.length > 0 ? applicants.filter((a) => a.gpa !== null).length : 0} with GPA set` : "No GPA data yet"}
                delay={0.15}
              />
              <StatCard
                label="Top Major"
                value={topMajor ?? "—"}
                delay={0.2}
              />
            </div>

            {/* ── Empty state ── */}
            {!hasApplicants && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl p-10 flex flex-col items-center text-center"
                style={{
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={GOLD}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white mb-1">No applicants yet</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Charts and breakdowns will appear here once applicants are added to
                  your pipeline.
                </p>
              </motion.div>
            )}

            {hasApplicants && (
              <>
                {/* ── Applicants per Stage bar chart ── */}
                <motion.section
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <SectionHeader>Applicants per Stage</SectionHeader>
                  <div
                    className="rounded-2xl p-5"
                    style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={stageData}
                        layout="vertical"
                        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                      >
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: "#71717a", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fill: "#a1a1aa", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.section>

                {/* ── Stage Conversion Funnel ── */}
                <motion.section
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                >
                  <SectionHeader>Stage Conversion Funnel</SectionHeader>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {stageData.map((stage, i) => {
                      const pct =
                        total > 0 ? Math.round((stage.count / total) * 100) : 0;
                      const isLast = i === stageData.length - 1;
                      return (
                        <div
                          key={stage.name}
                          className="flex items-center gap-4 px-5 py-3.5"
                          style={{
                            background: i % 2 === 0 ? "#111" : "#0f0f0f",
                            borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {/* Step index */}
                          <span
                            className="text-[10px] font-bold tabular-nums w-5 text-center"
                            style={{ color: GOLD }}
                          >
                            {i + 1}
                          </span>

                          {/* Stage name */}
                          <span className="text-sm text-zinc-200 font-medium flex-1 min-w-0 truncate">
                            {stage.name}
                          </span>

                          {/* Count */}
                          <span className="text-sm font-semibold text-white tabular-nums w-16 text-right">
                            {stage.count} applicant{stage.count !== 1 ? "s" : ""}
                          </span>

                          {/* Percentage bar + label */}
                          <div className="flex items-center gap-2 w-32">
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.07)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: GOLD,
                                  transition: "width 0.6s ease",
                                }}
                              />
                            </div>
                            <span className="text-xs text-zinc-500 w-10 text-right tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.section>

                {/* ── Major Breakdown ── */}
                {majorData.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38 }}
                  >
                    <SectionHeader>Major Breakdown</SectionHeader>
                    <div
                      className="rounded-2xl p-5"
                      style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <ResponsiveContainer width="100%" height={majorData.length * 38 + 16}>
                        <BarChart
                          data={majorData}
                          layout="vertical"
                          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                        >
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: "#71717a", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={150}
                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                          <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.section>
                )}

                {/* ── Year Breakdown pie chart ── */}
                {yearData.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.44 }}
                  >
                    <SectionHeader>Year Breakdown</SectionHeader>
                    <div
                      className="rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6"
                      style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <ResponsiveContainer width="100%" height={220} className="max-w-xs">
                        <PieChart>
                          <Pie
                            data={yearData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {yearData.map((_, idx) => (
                              <Cell
                                key={`cell-${idx}`}
                                fill={PIE_COLORS[idx % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const item = payload[0];
                              const pct =
                                total > 0
                                  ? Math.round(((item.value as number) / total) * 100)
                                  : 0;
                              return (
                                <div
                                  className="px-3 py-2 rounded-lg text-xs"
                                  style={{
                                    background: "#1a1a1a",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                  }}
                                >
                                  <p className="font-medium text-white">{item.name}</p>
                                  <p style={{ color: GOLD }}>
                                    {item.value} ({pct}%)
                                  </p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <ul className="flex flex-col gap-2 text-sm min-w-0 flex-1">
                        {yearData.map((entry, idx) => {
                          const pct =
                            total > 0 ? Math.round((entry.value / total) * 100) : 0;
                          return (
                            <li key={entry.name} className="flex items-center gap-3">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                              />
                              <span className="text-zinc-300 flex-1 truncate">{entry.name}</span>
                              <span className="text-zinc-400 tabular-nums">
                                {entry.value}{" "}
                                <span className="text-zinc-600">({pct}%)</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </motion.section>
                )}
              </>
            )}
              </>
            )}

            {activeTab === 'demographics' && (
              <div className="space-y-8">
                {demoLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                  </div>
                ) : !demoStats ? (
                  <div className="rounded-2xl p-10 flex flex-col items-center text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm font-semibold text-white mb-1">No member data yet</p>
                    <p className="text-xs text-zinc-500 max-w-xs">Import a roster from the People tab to see demographic breakdowns.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard label="Total Members" value={demoStats.total} delay={0.05} />
                      <StatCard label="Applicants" value={demoStats.statusCounts.applicant} sub={`${demoStats.pct(demoStats.statusCounts.applicant)}% of total`} delay={0.1} />
                      <StatCard label="Members" value={demoStats.statusCounts.member} sub={`${demoStats.pct(demoStats.statusCounts.member)}% of total`} delay={0.15} />
                      <StatCard label="Alumni" value={demoStats.statusCounts.alumni} sub={`${demoStats.pct(demoStats.statusCounts.alumni)}% of total`} delay={0.2} />
                    </div>

                    {/* Gender breakdown */}
                    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                      <SectionHeader>Gender Breakdown</SectionHeader>
                      <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {Object.entries(demoStats.genderCounts).sort((a, b) => b[1] - a[1]).map(([g, n]) => (
                          <div key={g} className="flex items-center gap-3">
                            <span className="text-sm text-zinc-300 w-28 capitalize">{g}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.07]">
                              <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${demoStats.pct(n)}%` }} />
                            </div>
                            <span className="text-xs text-zinc-400 w-16 text-right tabular-nums">{n} <span className="text-zinc-600">({demoStats.pct(n)}%)</span></span>
                          </div>
                        ))}
                      </div>
                    </motion.section>

                    {/* Major breakdown */}
                    {demoStats.topMajors.length > 0 && (
                      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                        <SectionHeader>Top Majors</SectionHeader>
                        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                          {demoStats.topMajors.map(([m, n]) => (
                            <div key={m} className="flex items-center gap-3">
                              <span className="text-sm text-zinc-300 w-40 truncate">{m}</span>
                              <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.07]">
                                <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${demoStats.pct(n)}%` }} />
                              </div>
                              <span className="text-xs text-zinc-400 w-16 text-right tabular-nums">{n} <span className="text-zinc-600">({demoStats.pct(n)}%)</span></span>
                            </div>
                          ))}
                        </div>
                      </motion.section>
                    )}

                    {/* Grad year breakdown */}
                    {demoStats.gradYears.length > 0 && (
                      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                        <SectionHeader>Graduation Year</SectionHeader>
                        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                          {demoStats.gradYears.map(([y, n]) => (
                            <div key={y} className="flex items-center gap-3">
                              <span className="text-sm text-zinc-300 w-20">{y}</span>
                              <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.07]">
                                <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${demoStats.pct(n)}%` }} />
                              </div>
                              <span className="text-xs text-zinc-400 w-16 text-right tabular-nums">{n} <span className="text-zinc-600">({demoStats.pct(n)}%)</span></span>
                            </div>
                          ))}
                        </div>
                      </motion.section>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
