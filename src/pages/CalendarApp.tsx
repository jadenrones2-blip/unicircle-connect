import { motion } from 'framer-motion';
import { Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsCalendar from '@/components/calendar/ClubsCalendar';
import { RecommendedEvents } from '@/components/calendar/RecommendedEvents';
import { Button } from '@/components/ui/button';
import { useClubOwnership } from '@/hooks/useClubOwnership';

const CalendarApp = () => {
  const { ownedClubs } = useClubOwnership();
  const isClubOwner = ownedClubs.length > 0;
  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-6 md:pt-36 md:pb-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-gold" />
              <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground">
                Events <span className="text-gradient-gold">Calendar</span>
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Browse and discover upcoming events. Updates in real-time.
            </p>
            {isClubOwner ? (
              <Link to="/submit-event">
                <Button variant="gold" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit an Event
                </Button>
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground/70">
                Club admins can submit events through the{' '}
                <Link to="/clubs" className="text-gold hover:underline">
                  Club Admin Portal
                </Link>
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Recommended Events Section (for logged-in users) */}
      <section className="px-4">
        <div className="container mx-auto max-w-6xl">
          <RecommendedEvents />
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
