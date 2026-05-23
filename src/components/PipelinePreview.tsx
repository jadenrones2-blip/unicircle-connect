import { motion } from 'framer-motion';
import { CheckCircle2, Clock, UserCheck, Send } from 'lucide-react';

interface Applicant {
  id: string;
  name: string;
  stage: number;
}

const stages = [
  { id: 'intake', label: 'Applied', icon: Clock },
  { id: 'review', label: 'Review', icon: UserCheck },
  { id: 'final', label: 'Final', icon: CheckCircle2 },
  { id: 'offer', label: 'Offer', icon: Send },
];

const applicants: Applicant[] = [
  { id: '1', name: 'Alex K.', stage: 0 },
  { id: '2', name: 'Jordan M.', stage: 1 },
  { id: '3', name: 'Casey L.', stage: 2 },
  { id: '4', name: 'Morgan P.', stage: 3 },
  { id: '5', name: 'Taylor R.', stage: 0 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const stageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const applicantVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

export function PipelinePreview() {
  return (
    <div className="mt-10 p-5 rounded-xl glass-card overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-gold/60" />
        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
          Live pipeline preview
        </span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {stages.map((stage) => {
          const StageIcon = stage.icon;
          const stageApplicants = applicants.filter((a) => a.stage === stages.indexOf(stage));

          return (
            <motion.div key={stage.id} variants={stageVariants} className="flex flex-col">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-5 h-5 rounded bg-gold/10 flex items-center justify-center">
                  <StageIcon className="w-3 h-3 text-gold" />
                </div>
                <span className="text-xs font-medium text-foreground">{stage.label}</span>
                <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {stageApplicants.length}
                </span>
              </div>

              <div className="flex-1 min-h-[140px] p-2 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                {stageApplicants.map((applicant) => (
                  <motion.div
                    key={applicant.id}
                    variants={applicantVariants}
                    initial="hidden"
                    whileInView="visible"
                    className="p-2 rounded bg-card border border-gold/20 shadow-sm"
                  >
                    <p className="text-xs font-medium text-foreground leading-tight">
                      {applicant.name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
