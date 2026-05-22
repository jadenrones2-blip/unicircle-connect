import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ExpressInterestForm from '@/components/ExpressInterestForm';
import { clubs } from '@/data/mockData';

const ExpressInterest = () => {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('club');
  const preselectedClub = clubId ? clubs.find((c) => c.id === clubId) : null;

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 text-gold mb-6">
              <span className="text-sm font-medium">Express Your Interest</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              {preselectedClub ? (
                <>
                  Join <span className="text-gradient-gold">{preselectedClub.name}</span>
                </>
              ) : (
                <>
                  Find Your <span className="text-gradient-gold">Community</span>
                </>
              )}
            </h1>
            <p className="text-lg text-muted-foreground">
              {preselectedClub
                ? 'Fill out the form below and the club will reach out to you with next steps.'
                : "Select a club and express your interest. We'll connect you with the right community."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card p-6 md:p-8"
          >
            {preselectedClub && (
              <div className="mb-6 pb-6 border-b border-border">
                <Link
                  to={`/clubs/${preselectedClub.id}`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to {preselectedClub.name}
                </Link>
              </div>
            )}

            <ExpressInterestForm
              preselectedClubId={preselectedClub?.id}
              showClubSelector={!preselectedClub}
            />
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            <p>
              By submitting, you agree to be contacted by the club regarding membership
              opportunities.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ExpressInterest;
