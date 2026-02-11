import { motion } from "framer-motion";
import surveyQR from "@/assets/survey-qr-code.png";

const SurveySection = () => {
  return (
    <section className="py-12 md:py-16 bg-secondary/50">
      <div className="container mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto text-center"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3 text-foreground">
            Help us build <span className="text-gold">your</span> platform
          </h2>
          <p className="text-muted-foreground mb-6">
            Take our quick survey and shape the future of UniCircle.
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdf9n4eVqXMz8WOwy_2svcmEH_0C-xCPngMnvAHq0z4dO0_eA/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img
              src={surveyQR}
              alt="Scan to take our survey"
              className="w-48 h-48 mx-auto rounded-lg shadow-md hover:shadow-lg transition-shadow"
            />
          </a>
          <p className="text-sm text-muted-foreground mt-4">
            Scan the QR code or tap to open
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SurveySection;
