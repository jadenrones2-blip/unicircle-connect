import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles, Users, Calendar, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/unicircle-logo-new.png";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home", icon: Sparkles },
    { href: "/clubs", label: "Clubs", icon: Users },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/login", label: "Login", icon: LogIn },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? "bg-background/95 backdrop-blur-md border-b border-border py-2 shadow-sm" 
          : "bg-background/80 backdrop-blur-sm py-4"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6 h-14 md:h-16">
        {/* Logo - left-aligned */}
        <Link to="/" className="flex items-center flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            whileHover={{ scale: 1.02 }}
          >
            <img 
              src={logoImage} 
              alt="UniCircle" 
              className="h-10 md:h-14 w-auto object-contain"
            />
          </motion.div>
        </Link>

        {/* Navigation with animated underlines */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link 
                to={link.href} 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 relative group"
              >
                <link.icon className="w-3.5 h-3.5 inline-block mr-1.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                {link.label}
                <motion.span 
                  className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-gold to-gold-light rounded-full"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* CTA Button with glow */}
        <div className="hidden md:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button variant="gold" size="default" className="relative group overflow-hidden" asChild>
              <Link to="/#cta">
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Join Waitlist
                </span>
                {/* Shimmer effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                  animate={{ translateX: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
                />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Mobile menu button */}
        <motion.button
          className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-gold/20"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait">
            {isMobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5 text-foreground" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-5 h-5 text-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile Menu with slide animation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden"
          >
            <div className="bg-card/95 backdrop-blur-xl border-b border-gold/10 px-4 py-6 mt-2">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={link.href}
                      className="block text-base text-muted-foreground hover:text-foreground transition-colors py-3 px-4 rounded-lg hover:bg-gold/5 border border-transparent hover:border-gold/10"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <link.icon className="w-4 h-4 inline-block mr-2 opacity-70" />
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4"
                >
                  <Button variant="gold" size="lg" className="w-full" asChild>
                    <Link to="/#cta" onClick={() => setIsMobileMenuOpen(false)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Join Waitlist
                    </Link>
                  </Button>
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;