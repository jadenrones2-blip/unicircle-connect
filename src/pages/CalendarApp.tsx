import { motion } from 'framer-motion';
import { Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsCalendar from '@/components/calendar/ClubsCalendar';
import { Button } from '@/components/ui/button';

const CalendarApp = () => {
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
            <p className="text-muted-foreground mb-6">
              Browse and discover upcoming events. Updates in real-time.
            </p>
            <Link to="/submit-event">
              <Button variant="gold" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Submit an Event
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <ClubsCalendar />
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default CalendarApp;
