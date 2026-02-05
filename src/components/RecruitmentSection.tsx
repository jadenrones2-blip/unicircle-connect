import { motion } from "framer-motion";
import { Kanban, Users, Eye, Bell, ArrowRight } from "lucide-react";

const RecruitmentSection = () => {
  const forClubs = [
    {
      icon: Kanban,
      title: "Visual Pipeline",
      description: "Track applicants through customizable stages with drag-and-drop simplicity.",
    },
    {
      icon: Users,
      title: "Centralized Data",
      description: "Import applicants via CSV, add custom fields, and keep everything organized.",
    },
  ];

  const forStudents = [
    {
      icon: Eye,
      title: "Track Your Status",
      description: "See exactly where you stand in the recruitment process for each club.",
    },
    {
      icon: Bell,
      title: "Stay Updated",
      description: "Get notified when you move to the next stage or receive a decision.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-card/50">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              Recruitment Tracking
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Recruitment made <span className="text-gold">transparent</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're running recruitment or applying to clubs, 
              our tracking system keeps everyone on the same page.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* For Club Leaders */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <Kanban className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-display text-xl font-semibold">For Club Leaders</h3>
              </div>
              
              <div className="space-y-4">
                {forClubs.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    className="flex gap-4 p-4 rounded-lg bg-background border border-border hover:border-gold/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <a 
                href="/express-interest" 
                className="inline-flex items-center gap-2 text-gold hover:text-gold/80 text-sm font-medium transition-colors group"
              >
                Claim your club
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            {/* For Students */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold">For Students</h3>
              </div>
              
              <div className="space-y-4">
                {forStudents.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.1, duration: 0.4 }}
                    className="flex gap-4 p-4 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <a 
                href="/signup" 
                className="inline-flex items-center gap-2 text-foreground hover:text-gold text-sm font-medium transition-colors group"
              >
                Create your account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecruitmentSection;
