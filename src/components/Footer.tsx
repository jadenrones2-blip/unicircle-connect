import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const Footer = () => {
  const { playHover } = useSoundEffects();

  const navLinks = [
    { label: "Home",   href: "/" },
    { label: "Clubs",  href: "/clubs" },
    { label: "Events", href: "/events" },
    { label: "Demo",   href: "/demo" },
  ];

  const legalLinks = [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy",   href: "/privacy" },
  ];

  return (
    <footer className="border-t border-border/20 bg-background">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-14 py-12 sm:py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link
              to="/"
              className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-gold transition-colors"
            >
              UniCircle
            </Link>
            <p className="text-xs text-muted-foreground/50 mt-1">Currently at UC San Diego.</p>
          </motion.div>

          <nav className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                onMouseEnter={playHover}
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <p className="text-sm text-muted-foreground/50">
            Made with <span className="text-gold">precision</span>
          </p>

        </div>

        <div className="mt-10 pt-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                onMouseEnter={playHover}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="text-xs text-muted-foreground/40 text-center sm:text-right">
            <p>© 2025 UniCircle. All rights reserved.</p>
            <p className="mt-0.5">Not affiliated with UC San Diego.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
