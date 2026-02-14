import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is UniCircle?",
    answer:
      "UniCircle is recruitment infrastructure for student organizations. It provides a structured system for managing applicant intake, evaluation, and transparent status tracking — designed to scale with growing organizations.",
  },
  {
    question: "Is UniCircle free?",
    answer:
      "Yes. UniCircle is free for both organizations and students. Claim your club with a verified email and start managing recruitment immediately.",
  },
  {
    question: "Who is UniCircle for?",
    answer:
      "Primarily for student organizations that manage structured recruitment cycles — clubs, fraternities, sororities, professional organizations, and student-run teams. Students benefit from transparent application tracking and structured discovery.",
  },
  {
    question: "How do I add my organization?",
    answer:
      "Navigate to the clubs directory, find your organization, and claim it with a verified email. Once verified, you'll have access to your admin portal with recruitment tools, event management, and profile editing.",
  },
  {
    question: "Can applicants see their status?",
    answer:
      "Yes. When your organization uses UniCircle's recruitment pipeline, applicants can track their position in the process and receive automated updates when they advance or receive a decision.",
  },
  {
    question: "How does the evaluation system work?",
    answer:
      "Define custom recruitment stages and evaluation criteria. Import applicants via CSV or direct intake. Use structured scoring, AI-assisted screening, and drag-and-drop pipeline management to move applicants through your workflow.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              FAQ
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 tracking-tight">
              Common questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b border-border"
                >
                  <AccordionTrigger className="text-left font-display text-lg font-medium hover:text-gold transition-colors py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;