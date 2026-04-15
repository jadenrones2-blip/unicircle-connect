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
            Built because<br />
            <span className="text-[#C9A84C]">the problem was real.</span>
          </motion.h1>
        </div>
      </section>

      {/* Main story */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            {/* Photo */}
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
                I transferred to UCSD not knowing anyone. The one thing I wanted was to find smart, driven people — people who were building things, going places. Real community.
              </p>

              <p>
                So I did what every new student does. I Googled "UCSD clubs." I got a messy university website, scattered Instagram pages, some that hadn't been updated since 2022. That's how we help students find their people in 2026.
              </p>

              <p>
                I started going to club recruitments. And what I noticed first was how impressive they looked from the outside — polished pitch nights, competitive processes, hundreds of applicants.
              </p>

              <p>
                Then I started talking to the people actually running them. The presidents, the recruitment chairs. I asked: how do you manage all of this?
              </p>

              <p className="text-zinc-200">
                The answer was always the same. Google Forms feeding into a spreadsheet. A shared doc for officer feedback. A group chat where decisions got buried under messages.
              </p>

              <p>
                These organizations run 200 to 300 person recruitment processes — and they're doing it with tools that weren't built for them. Every single semester, they start from scratch.
              </p>

              <p>
                That's when the idea clicked. What if there was one platform — built specifically for this — that handled everything? Discovery for students, and a real recruitment backend for clubs. Not a workaround. An actual tool.
              </p>

              <div className="border-l-2 border-[#C9A84C] pl-6 py-2 space-y-4">
                <p className="text-zinc-200 italic text-lg">
                  "Student organizations are how millions of people find community, build skills, and launch careers."
                </p>
                <p className="text-zinc-500 text-sm">
                  That stuck with me. And it's why I'm building this — with people who feel the same way. If you do, come find me.
                </p>
              </div>

              <p>
                UniCircle started at UCSD. We have pilots lined up here and at SDSU. The plan is simple — land pilots, prove the product works, then expand campus by campus until every student organization in the country has the tools they actually need.
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
