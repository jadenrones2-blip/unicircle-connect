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
      "UniCircle is a platform designed to help UCSD students discover clubs, events, and like-minded peers. We aggregate everything happening on campus into one easy-to-use platform.",
  },
  {
    question: "Is UniCircle free to use?",
    answer:
      "Yes! UniCircle is completely free for all UCSD students. Just sign up with your UCSD email to get started.",
  },
  {
    question: "How do I find clubs that match my interests?",
    answer:
      "After signing up, you'll go through a quick onboarding quiz that helps us understand your interests. We'll then recommend clubs and events tailored specifically to you.",
  },
  {
    question: "I'm a club leader. How do I add my club?",
    answer:
      "Club leaders can claim their organization through our verification process. Once verified, you'll have access to a dashboard where you can manage your club's profile and post events.",
  },
  {
    question: "How are events added to the calendar?",
    answer:
      "Events come from verified club owners who submit them through our platform. Each event is reviewed to ensure quality and relevance before appearing on the calendar.",
  },
  {
    question: "Can I get notifications for events I'm interested in?",
    answer:
      "Yes! You can save events and clubs to receive reminders and updates about upcoming activities that match your interests.",
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
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about UniCircle.
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
