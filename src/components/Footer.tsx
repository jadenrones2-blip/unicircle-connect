import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Footer = () => {
  const links = [
    { label: "Home", href: "/" },
    { label: "Clubs", href: "/clubs" },
    { label: "Events", href: "/events" },
  ];

  return (
    <footer className="py-8 sm:py-12 border-t border-border bg-background">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link to="/" className="font-display text-2xl font-bold tracking-tight text-primary hover:text-gold transition-colors">
              UniCircle
            </Link>
          </motion.div>

          <nav className="flex items-center gap-6 sm:gap-8">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <p className="text-sm text-muted-foreground">
            Made with <span className="text-gold">precision</span>
          </p>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground/60">
            © 2025 UniCircle. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/50">
            UniCircle is not affiliated with, endorsed by, or sponsored by UC San Diego.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;