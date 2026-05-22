import { Link, useSearchParams } from 'react-router-dom';
import { Clock, ArrowLeft, Mail, Shield } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

export default function ApprovalPending() {
  const [params] = useSearchParams();
  const club = params.get('club') || 'your club';
  const type = params.get('type') === 'claim' ? 'claim' : 'apply';

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-lg text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-[hsl(43,74%,56%)]/10 border border-[hsl(43,74%,56%)]/20 flex items-center justify-center mx-auto mb-8">
          <Clock className="w-9 h-9 text-[hsl(43,74%,56%)]" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-display font-bold text-white mb-3">
          {type === 'claim' ? 'Claim Submitted' : 'Application Submitted'}
        </h1>
        <p className="text-zinc-400 mb-2">
          {type === 'claim' ? (
            <>
              We've received your ownership claim for <strong className="text-white">{club}</strong>
              .
            </>
          ) : (
            <>
              We've received your application to add <strong className="text-white">{club}</strong>{' '}
              to UniCircle.
            </>
          )}
        </p>
        <p className="text-zinc-500 text-sm mb-10">
          Every {type === 'claim' ? 'claim' : 'application'} is manually reviewed for security.
          We'll email you within <strong className="text-zinc-300">24–48 hours</strong> with a
          decision.
        </p>

        {/* Status steps */}
        <div className="text-left rounded-2xl border border-white/[0.07] bg-zinc-900/40 p-6 mb-8 space-y-4">
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-600 mb-4">
            What happens next
          </p>

          {[
            { icon: Mail, label: 'Submitted', detail: 'Your request is in our queue.', done: true },
            {
              icon: Shield,
              label: 'Manual Review',
              detail: 'The UniCircle team verifies your submission.',
              done: false,
            },
            {
              icon: Clock,
              label: 'Decision via Email',
              detail: "You'll hear back at the email you provided.",
              done: false,
            },
          ].map(({ icon: Icon, label, detail, done }, i) => (
            <div key={i} className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  done
                    ? 'bg-[hsl(43,74%,56%)]/10 border border-[hsl(43,74%,56%)]/25'
                    : 'bg-white/[0.03] border border-white/[0.07]'
                }`}
              >
                <Icon className={`w-4 h-4 ${done ? 'text-[hsl(43,74%,56%)]' : 'text-zinc-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${done ? 'text-zinc-100' : 'text-zinc-500'}`}>
                  {label}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            variant="outline"
            className="border-white/10 text-zinc-300 hover:bg-white/5"
          >
            <Link to="/clubs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Clubs
            </Link>
          </Button>
          <Button asChild className="bg-violet-600 hover:bg-violet-500">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>

      <Footer />
    </main>
  );
}
