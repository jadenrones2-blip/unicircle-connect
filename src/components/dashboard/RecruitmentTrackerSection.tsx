import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudentRecruitment } from '@/hooks/useStudentRecruitment';
import RecruitmentTrackerCard from './RecruitmentTrackerCard';

export default function RecruitmentTrackerSection() {
  const { applications, loading } = useStudentRecruitment();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-8 sm:mb-10"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
            My Applications
          </h2>
          <p className="text-sm text-zinc-500">Track where you stand</p>
        </div>
        <Link
          to="/clubs"
          className="text-xs text-zinc-500 hover:text-gold transition-colors"
        >
          Browse clubs →
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading applications…</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
          <p className="text-sm text-zinc-500 mb-1">No applications yet.</p>
          <Link to="/clubs" className="text-xs text-gold hover:underline">
            Browse clubs to get started →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {applications.map((data) => (
            <RecruitmentTrackerCard key={data.application.id} data={data} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
