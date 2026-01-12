import { motion } from "framer-motion";

const Footer = () => {
  const links = [
    { label: "About", href: "#" },
    { label: "FAQ", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <footer className="py-12 border-t border-border bg-background">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <span className="font-display text-2xl font-bold tracking-tight text-primary">
              UniCircle
            </span>
          </motion.div>

          <nav className="flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          <p className="text-sm text-muted-foreground">
            Made with precision at <span className="text-gold">UCSD</span>
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/60">
            © 2024 UniCircle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;