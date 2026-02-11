import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import surveyQR from "@/assets/survey-qr-code.png";

const SurveySection = () => {
  return (
    <section className="py-10 md:py-14 bg-background relative overflow-hidden">
      {/* Match hero's subtle gradient blobs */}
      <div className="absolute top-0 left-1/3 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-gold/5 rounded-full blur-[80px] sm:blur-[100px] -z-10" />
      <div className="absolute bottom-0 right-1/3 w-[150px] sm:w-[250px] h-[150px] sm:h-[250px] bg-primary/5 rounded-full blur-[60px] sm:blur-[80px] -z-10" />

      <div className="container mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/20 bg-gold/5 text-sm text-gold mb-5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Quick survey
          </motion.div>

          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold mb-2 text-foreground tracking-tight">
            Help us build <span className="text-gold">your</span> platform
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-6 font-light">
            Shape the future of UniCircle in under 2 minutes.
          </p>

          <motion.a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdf9n4eVqXMz8WOwy_2svcmEH_0C-xCPngMnvAHq0z4dO0_eA/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block p-3 rounded-xl border border-border/50 bg-card hover:border-gold/30 hover:shadow-gold transition-all duration-300"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src={surveyQR}
              alt="Scan to take our survey"
              className="w-40 h-40 sm:w-44 sm:h-44 mx-auto rounded-lg"
            />
          </motion.a>

          <p className="text-xs text-muted-foreground mt-3">
            Scan the QR code or tap to open
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SurveySection;
