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
      "UniCircle is a discovery platform that helps students find clubs, events, and communities on campus. Unlike social feeds that show you what you already follow, we help you discover what you haven't found yet.",
  },
  {
    question: "Is UniCircle free?",
    answer:
      "Yes, completely free. Sign up with your campus email and start exploring.",
  },
  {
    question: "How is this different from other platforms?",
    answer:
      "Most platforms are built for content consumption — you scroll, you watch, you leave. UniCircle is built for action. We help you find clubs to join, events to attend, and people to meet in real life.",
  },
  {
    question: "How do I find clubs that match my interests?",
    answer:
      "After signing up, a quick onboarding quiz helps us understand what you're looking for. From there, we surface clubs and events tailored to you — no algorithm games, just relevance.",
  },
  {
    question: "I'm a club leader. How do I add my club?",
    answer:
      "Club leaders can claim their organization through our verification process. Once verified, you get a dashboard to manage your profile, post events, and track recruitment.",
  },
  {
    question: "Can I track my club applications?",
    answer:
      "Yes. If a club uses our recruitment tools, you'll see exactly where you stand in their process — no more wondering if they ever saw your application.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
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
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Questions? We've got answers.
            </h2>
            <p className="text-muted-foreground text-lg">
              Here's what students usually ask.
            </p>
          </motion.div>

          {/* Accordion */}
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
