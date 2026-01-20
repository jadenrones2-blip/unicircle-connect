import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MonthlyCalendar } from '@/components/calendar/MonthlyCalendar';
import { useExternalEvents } from '@/hooks/useExternalEvents';

const CalendarApp = () => {
  const { events, loading, error, refetch } = useExternalEvents();

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-8 md:pt-36 md:pb-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Calendar className="w-8 h-8 text-gold" />
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Events <span className="text-gradient-gold">Calendar</span>
              </h1>
            </div>
            <p className="text-muted-foreground">
              Browse and discover upcoming events. Updates in real-time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <MonthlyCalendar
            events={events}
            loading={loading}
            error={error}
            onRefetch={refetch}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default CalendarApp;
