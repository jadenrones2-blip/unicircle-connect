import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import ExpressInterestModal from "@/components/ExpressInterestModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { events, clubs } from "@/data/mockData";

const eventTypes = ["All", "Recruitment", "Event", "Workshop", "Social"];

const EventsCalendar = () => {
  const [selectedType, setSelectedType] = useState("All");
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 1, 1)); // February 2025
  const [modalData, setModalData] = useState<{ isOpen: boolean; clubName: string; clubId: string }>({
    isOpen: false,
    clubName: "",
    clubId: ""
  });

  const filteredEvents = events.filter((event) => {
    const matchesType = selectedType === "All" || 
      event.type.toLowerCase() === selectedType.toLowerCase();
    return matchesType;
  });

  // Group events by date
  const eventsByDate = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  const sortedDates = Object.keys(eventsByDate).sort();

  const handleExpressInterest = (clubId: string) => {
    const club = clubs.find(c => c.id === clubId);
    if (club) {
      setModalData({
        isOpen: true,
        clubName: club.name,
        clubId: club.id
      });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Events & <span className="text-gradient-gold">Recruitment</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Never miss an opportunity. Find club events, recruitment drives, and workshops.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Calendar Navigation */}
      <section className="pb-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Month Navigation */}
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-display font-semibold min-w-[180px] text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <Button variant="outline" size="icon">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                List View
              </Button>
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-2 mt-6">
            {eventTypes.map((type) => (
              <Badge
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedType === type 
                    ? "bg-gold text-primary-foreground hover:bg-gold/90" 
                    : "hover:border-gold/50"
                }`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {sortedDates.length > 0 ? (
            <div className="space-y-8">
              {sortedDates.map((date) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gold" />
                      <h3 className="font-display font-semibold text-foreground">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h3>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                    <Badge variant="secondary">
                      {eventsByDate[date].length} event{eventsByDate[date].length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Events for this date */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {eventsByDate[date].map((event, index) => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                No events found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or check back later
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Recruitment CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary to-primary/90">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Running a Club?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              List your events and recruitment drives to reach thousands of students
            </p>
            <Button variant="outline" size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              Add Your Event
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Express Interest Modal */}
      <ExpressInterestModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
        clubName={modalData.clubName}
        clubId={modalData.clubId}
      />
    </main>
  );
};

export default EventsCalendar;
