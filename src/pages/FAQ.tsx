import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const faqs = [
  {
    question: "What is UniCircle?",
    answer: "UniCircle is a platform built by UCSD students to help you discover clubs, events, and communities on campus. It's your one-stop destination for finding your people and staying connected with everything happening at UCSD.",
  },
  {
    question: "How is UniCircle different from other platforms?",
    answer: "Unlike scattered Instagram pages, Discord servers, and flyers, UniCircle brings everything together in one searchable, organized platform designed specifically for UCSD students. Find clubs, events, and like-minded peers all in one place.",
  },
  {
    question: "Can clubs and organizations use UniCircle?",
    answer: "Absolutely! We're building tools specifically for student organizations to reach more students, manage events, and grow their communities. Interested clubs can reach out to get early access.",
  },
];

const FAQ = () => {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <section className="pt-28 pb-16 md:pt-32 md:pb-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors text-sm mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
                FAQ
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-muted-foreground text-lg font-light">
                Everything you need to know about UniCircle.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="bg-card border border-border rounded-lg px-6 data-[state=open]:border-gold/30 transition-colors"
                  >
                    <AccordionTrigger className="text-left font-medium hover:text-gold transition-colors py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-muted-foreground text-sm mt-10"
            >
              Still have questions?{" "}
              <a href="mailto:jrones@unicircle.app" className="text-gold hover:underline">
                Reach out to us
              </a>
            </motion.p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default FAQ;
