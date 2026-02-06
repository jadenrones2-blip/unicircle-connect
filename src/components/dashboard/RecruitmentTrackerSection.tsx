import { motion } from 'framer-motion';
import { Briefcase, Loader2 } from 'lucide-react';
import { useStudentRecruitment } from '@/hooks/useStudentRecruitment';
import RecruitmentTrackerCard from './RecruitmentTrackerCard';

export default function RecruitmentTrackerSection() {
  const { applications, loading } = useStudentRecruitment();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (applications.length === 0) {
    return null; // Don't show section if no recruitment applications
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Briefcase className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Recruitment Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Track your progress in club recruitment processes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {applications.map((data, index) => (
          <RecruitmentTrackerCard
            key={data.application.id}
            data={data}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}
