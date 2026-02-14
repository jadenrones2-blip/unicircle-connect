import { motion } from "framer-motion";
import { CheckCircle2, Clock, UserCheck, Send } from "lucide-react";

interface Applicant {
  id: string;
  name: string;
  stage: number;
  delay: number;
}

const stages = [
  { id: "intake", label: "Applications", icon: Clock },
  { id: "review", label: "Review", icon: UserCheck },
  { id: "final", label: "Final Round", icon: CheckCircle2 },
  { id: "offer", label: "Offers", icon: Send },
];

const applicants: Applicant[] = [
  { id: "1", name: "Alex K.", stage: 0, delay: 0 },
  { id: "2", name: "Jordan M.", stage: 1, delay: 0.5 },
  { id: "3", name: "Casey L.", stage: 2, delay: 1 },
  { id: "4", name: "Morgan P.", stage: 3, delay: 1.5 },
  { id: "5", name: "Taylor R.", stage: 0, delay: 2 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const stageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const applicantVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
};

export function PipelinePreview() {
  return (
    <div className="mt-12 p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="mb-8">
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          Recruitment pipeline in action
        </h3>
        <p className="text-sm text-muted-foreground">
          Organize applicants into stages. Track progress. Communicate updates.
        </p>
      </div>

      {/* Pipeline Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {stages.map((stage) => {
          const StageIcon = stage.icon;
          const stageApplicants = applicants.filter(
            (a) => a.stage === stages.indexOf(stage)
          );

          return (
            <motion.div
              key={stage.id}
              variants={stageVariants}
              className="flex flex-col"
            >
              {/* Stage Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-5 h-5 rounded bg-gold/10 flex items-center justify-center">
                  <StageIcon className="w-3 h-3 text-gold" />
                </div>
                <span className="text-xs font-medium text-foreground">
                  {stage.label}
                </span>
              </div>

              {/* Stage Column */}
              <div className="flex-1 min-h-[180px] p-2 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                {stageApplicants.length > 0 ? (
                  stageApplicants.map((applicant) => (
                    <motion.div
                      key={applicant.id}
                      variants={applicantVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      className="p-2 rounded bg-card border border-gold/20 shadow-sm"
                    >
                      <p className="text-xs font-medium text-foreground leading-tight">
                        {applicant.name}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>

              {/* Count Badge */}
              <div className="mt-2 text-center">
                <span className="inline-block text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                  {stageApplicants.length}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="mt-6 pt-4 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground"
      >
        <div className="w-2 h-2 rounded-full bg-gold/60"></div>
        <span>Drag applicants between stages. Automated updates sent at each step.</span>
      </motion.div>
    </div>
  );
}
