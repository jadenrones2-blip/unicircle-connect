import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import AnimatedWords from './AnimatedWords';
import { useSoundEffects } from '@/hooks/useSoundEffects';

const faqs = [
  {
    question: 'What is UniCircle?',
    answer:
      'UniCircle is recruitment infrastructure for student organizations. It provides a structured system for managing applicant intake, evaluation, and transparent status tracking — designed to scale with growing organizations.',
  },
  {
    question: 'Is UniCircle free?',
    answer:
      'Yes. UniCircle is free for both organizations and students. Claim your club with a verified email and start managing recruitment immediately.',
  },
  {
    question: 'Who is UniCircle for?',
    answer:
      'Primarily for student organizations that manage structured recruitment cycles — clubs, fraternities, sororities, professional organizations, and student-run teams. Students benefit from transparent application tracking and structured discovery.',
  },
  {
    question: 'How do I add my organization?',
    answer:
      "Navigate to the clubs directory, find your organization, and claim it with a verified email. Once verified, you'll have access to your admin portal with recruitment tools, event management, and profile editing.",
  },
  {
    question: 'Can applicants see their status?',
    answer:
      "Yes. When your organization uses UniCircle's recruitment pipeline, applicants can track their position in the process and receive automated updates when they advance or receive a decision.",
  },
  {
    question: 'How does the evaluation system work?',
    answer:
      'Define custom recruitment stages and evaluation criteria. Import applicants via CSV or direct intake. Use structured scoring, AI-assisted screening, and drag-and-drop pipeline management to move applicants through your workflow.',
  },
];

const FAQSection = () => {
  const { playClick } = useSoundEffects();

  return (
    <section className="py-24 md:py-36 border-t border-border/20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[11px] font-semibold text-gold tracking-[0.25em] uppercase mb-8"
            >
              FAQ
            </motion.p>
            <AnimatedWords
              text="Common questions"
              as="h2"
              className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight text-foreground"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Accordion type="single" collapsible className="w-full divide-y divide-border/20">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-0">
                  <AccordionTrigger
                    className="text-left text-base font-semibold hover:text-gold transition-colors py-5 [&>svg]:text-foreground/30"
                    onClick={playClick}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground/40 text-sm leading-relaxed pb-5">
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
