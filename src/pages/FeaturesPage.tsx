import { motion } from "framer-motion";
import { 
  Search, 
  Bookmark, 
  Calendar, 
  Clock, 
  Users, 
  Briefcase, 
  Heart,
  Code,
  MapPin,
  Sparkles,
  GraduationCap,
  Stethoscope,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Smart Matching Data
const recommendations = [
  {
    title: "Women in STEM",
    reason: "Suggested because you're taking CSE 8A and MATH 20C.",
    icon: GraduationCap,
  },
  {
    title: "Pre-Med Community",
    reason: "Matches your interest in Pre-Med and healthcare pathways.",
    icon: Stethoscope,
  },
  {
    title: "Business & Marketing Network",
    reason: "Recommended for Business Administration majors.",
    icon: TrendingUp,
  },
];

// Recruitment Tracker Data
const recruitmentClubs = [
  {
    name: "Women in Business",
    status: "open",
    description: "Professional development, recruiting prep, and networking for business-minded students.",
    timeline: "Info Session · Jan 30 • Applications · Feb 5",
  },
  {
    name: "Data Science Society",
    status: "upcoming",
    description: "Project teams, speaker events, and case competitions for data enthusiasts.",
    timeline: "Recruitment opens · Mar 1 • Apps due · Mar 10",
  },
  {
    name: "Pre-Med Student Association",
    status: "open",
    description: "Support for pre-med students: mentorship, MCAT prep, and physician panels.",
    timeline: "Applications · Feb 1–15 • Interviews · Feb 20–25",
  },
];

// Communities Data
const communities = [
  {
    name: "Pre-Med Circle",
    members: 342,
    description: "Connect with fellow pre-med students for study groups, MCAT prep, and shadowing opportunities.",
    icon: Heart,
  },
  {
    name: "CS & Tech",
    members: 518,
    description: "Developers, designers, and tech enthusiasts sharing projects and opportunities.",
    icon: Code,
  },
  {
    name: "Business & Finance",
    members: 287,
    description: "Future consultants, bankers, and entrepreneurs networking and prepping together.",
    icon: Briefcase,
  },
];

// Events Data
const events = [
  {
    title: "Winter Career Fair",
    date: "Feb 8",
    time: "10:00 AM",
    location: "Price Center Ballroom",
    category: "Career",
  },
  {
    title: "Startup Pitch Night",
    date: "Feb 12",
    time: "6:00 PM",
    location: "Rady School of Management",
    category: "Founders",
  },
  {
    title: "CS Research Symposium",
    date: "Feb 15",
    time: "2:00 PM",
    location: "CSE Building",
    category: "Academic",
  },
];

const statusColors: Record<string, string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-gold/20 text-gold border-gold/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-6">
    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">{title}</h2>
    <p className="text-muted-foreground">{subtitle}</p>
  </div>
);

const MockSearchBar = ({ placeholder }: { placeholder: string }) => (
  <div className="relative mb-6">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder={placeholder}
      className="pl-10 bg-secondary/50 border-border focus:border-gold"
      readOnly
    />
  </div>
);

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Features
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to find your people, discover opportunities, and build your network on campus.
            </p>
          </motion.div>

          {/* Section 1: Smart Matching */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <SectionHeader 
              title="Smart Matching" 
              subtitle="Personalized recommendations for clubs and communities based on your major, interests, and classes."
            />
            <MockSearchBar placeholder="Search recommended opportunities..." />
            
            <div className="grid md:grid-cols-3 gap-4">
              {recommendations.map((rec, index) => {
                const Icon = rec.icon;
                return (
                  <motion.div
                    key={rec.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="p-5 rounded-xl bg-secondary/30 border border-border hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-gold/10 w-fit">
                        <Icon className="h-5 w-5 text-gold" />
                      </div>
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gold/20 text-gold border border-gold/30 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Recommended
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-gold transition-colors mb-2">
                      {rec.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">{rec.reason}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-6 text-center"
            >
              <a 
                href="#" 
                className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold/80 transition-colors group"
              >
                See more recommendations
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </motion.div>
          </motion.section>

          {/* Section 2: Recruitment Tracker */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <SectionHeader 
              title="Recruitment Tracker" 
              subtitle="See who's recruiting, what stage they're in, and never miss a deadline."
            />
            <MockSearchBar placeholder="Search clubs or orgs..." />
            
            <div className="space-y-4">
              {recruitmentClubs.map((club, index) => (
                <motion.div
                  key={club.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="p-5 rounded-xl bg-secondary/30 border border-border hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-gold/10">
                          <Briefcase className="h-4 w-4 text-gold" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-gold transition-colors">
                          {club.name}
                        </h3>
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border capitalize ${statusColors[club.status]}`}>
                          {club.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">{club.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{club.timeline}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <Bookmark className="h-4 w-4 mr-1" />
                      Track
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Section 3: Communities */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <SectionHeader 
              title="Communities" 
              subtitle="Join interest-based circles to connect with students who share your passions."
            />
            <MockSearchBar placeholder="Search communities..." />
            
            <div className="grid md:grid-cols-3 gap-4">
              {communities.map((community, index) => {
                const Icon = community.icon;
                return (
                  <motion.div
                    key={community.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="p-5 rounded-xl bg-secondary/30 border border-border hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 group"
                  >
                    <div className="p-2.5 rounded-lg bg-gold/10 w-fit mb-3">
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-gold transition-colors mb-1">
                      {community.name}
                    </h3>
                    <p className="text-xs text-gold mb-2">{community.members} members</p>
                    <p className="text-muted-foreground text-sm">{community.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Section 4: Events */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <SectionHeader 
              title="Events" 
              subtitle="Discover campus-wide events, workshops, and networking opportunities."
            />
            <MockSearchBar placeholder="Search events..." />
            
            <div className="space-y-4">
              {events.map((event, index) => (
                <motion.div
                  key={event.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="p-5 rounded-xl bg-secondary/30 border border-border hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 group flex items-center gap-5"
                >
                  <div className="text-center min-w-[60px] p-3 rounded-lg bg-gold/10">
                    <span className="text-xs text-muted-foreground uppercase block">
                      {event.date.split(" ")[0]}
                    </span>
                    <span className="text-2xl font-bold text-gold">{event.date.split(" ")[1]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-gold transition-colors">
                        {event.title}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gold/20 text-gold border border-gold/30">
                        {event.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {event.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Calendar className="h-4 w-4 mr-1" />
                    RSVP
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FeaturesPage;