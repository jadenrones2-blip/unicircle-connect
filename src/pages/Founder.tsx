import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Founder() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header />

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold mb-8"
          >
            Our Story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.0] tracking-tight mb-16"
          >
            I worked for years<br />
            <span className="text-[#C9A84C]">to get to the right room.</span><br />
            Then I walked into<br />
            <span className="text-[#C9A84C]">the wrong one.</span>
          </motion.h1>
        </div>
      </section>

      {/* Main story */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            {/* Photo — Jaden only */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:sticky lg:top-32"
            >
              <div className="relative">
                <img
                  src="/jaden.png"
                  alt="Jaden Rones, Founder of UniCircle"
                  className="w-full max-w-sm mx-auto lg:mx-0 rounded-2xl object-cover grayscale"
                  style={{ aspectRatio: '3/4' }}
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 max-w-sm mx-auto lg:mx-0" />
              </div>
              <div className="mt-6 max-w-sm mx-auto lg:mx-0">
                <div className="text-white font-semibold text-lg">Jaden Rones</div>
                <div className="text-[#C9A84C] text-sm mt-1">Founder & CEO · UCSD</div>
                <div className="text-zinc-500 text-sm mt-3 leading-relaxed">
                  Transfer student. Built UniCircle from scratch — design, frontend, backend, all of it.
                </div>
              </div>
            </motion.div>

            {/* Story text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8 text-base text-zinc-400 leading-relaxed"
            >
              <p className="text-zinc-200 text-xl leading-relaxed">
                It all started at a school I wasn't fit for. Leaving meant that I would have to work hard because I wanted more — more access, more opportunity, more people who were actually trying to go somewhere. Getting into UCSD felt like finally making it to the right room.
              </p>

              <p>
                I got there and did what basically every college student does: I fell into Greek life. It seemed like the obvious path to community, to connection, to the "real college experience." I went through it hoping to find the people I'd been looking for: driven, ambitious, constantly trying to better themselves.
              </p>

              <p>
                It wasn't that. I spent months in rooms that felt off, and the problem was that I didn't know what else to try. What would actually fit? What was worth the time? What wouldn't be so exclusive that I'd never get in?
              </p>

              <p className="text-zinc-200">
                I kept hearing "you are the average of the 5 people you surround yourself with." And I knew I wasn't where I needed to be.
              </p>

              <p>
                The clubs I actually wanted to be involved with were the ones full of people who made me feel like I was growing, and I barely knew they existed. UCSD has 600+ clubs. I found maybe 10. Figuring out who was even recruiting meant sifting through dead Instagram pages and Google Forms from two quarters ago.
              </p>

              <p>
                I wasted months with the wrong people in the wrong place. Not because the right community wasn't there, but because I had no way to find it.
              </p>

              <p>
                So I started talking to the people running those clubs. The recruitment chairs, the presidents. I asked how they managed everything. The answer was always the same: Google Form, spreadsheet, group chat. Deliberations running until 2 am. Matching hundreds of applicant names to Venmo transactions by hand, every quarter, starting from scratch.
              </p>

              <div className="border-l-2 border-[#C9A84C] pl-6 py-2">
                <p className="text-zinc-200 italic text-lg">
                  "The most important thing about college isn't the GPA. It's who you're surrounded by."
                </p>
              </div>

              <p>
                That's why I built UniCircle. One place for students to find every club, see who's recruiting right now, and actually apply. And a real pipeline for the clubs running those processes, so they can spend their time on the people, not the spreadsheet.
              </p>

              <p className="text-zinc-200">
                The plan is simple — campus by campus, until every student has a real shot at finding their people.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/clubs"
                  className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-zinc-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Explore clubs
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="mailto:jaden@unicircle.app?subject=I want to build this with you"
                  className="inline-flex items-center gap-2 border border-white/10 text-white/70 hover:text-white hover:border-white/20 font-medium px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Want to build this with me?
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Founders */}
      <section className="border-t border-white/[0.06] px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold mb-10">The team</p>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-8 max-w-lg">
            {[
              {
                name: 'Jaden Rones',
                title: 'Founder & CEO · UCSD',
                img: '/jaden.png',
                alt: 'Jaden Rones',
              },
              {
                name: 'Talia Rones',
                title: 'Co-Founder · UniCircle',
                img: '/talia.png',
                alt: 'Talia Rones',
              },
            ].map((person) => (
              <motion.div
                key={person.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative mb-4">
                  <img
                    src={person.img}
                    alt={person.alt}
                    className="w-full rounded-xl object-cover grayscale"
                    style={{ aspectRatio: '3/4' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
                </div>
                <div className="text-white font-semibold">{person.name}</div>
                <div className="text-[#C9A84C] text-sm mt-0.5">{person.title}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-t border-white/[0.06] px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-white/[0.06]">
          {[
            { value: 'UCSD + SDSU', label: 'Launching at' },
            { value: '800+',        label: 'Member org already in' },
            { value: '2026',        label: 'First pilots this year' },
          ].map((s) => (
            <div key={s.label} className="px-8 first:pl-0 last:pr-0 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
