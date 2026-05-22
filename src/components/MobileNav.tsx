import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, Compass, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/clubs', icon: Search, label: 'Clubs' },
  { href: '/discover', icon: Compass, label: 'Discover' },
  { href: '/events', icon: Calendar, label: 'Events' },
  { href: '/profile', icon: UserCircle, label: 'Profile' },
];

export default function MobileNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{
        background: 'rgba(10,10,10,0.92)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              to={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-gold"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className="w-5 h-5 transition-colors"
                style={{ color: active ? 'hsl(43 74% 56%)' : 'rgb(113 113 122)' }}
              />
              <span
                className="text-[10px] font-semibold tracking-wide transition-colors"
                style={{ color: active ? 'hsl(43 74% 56%)' : 'rgb(82 82 91)' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
