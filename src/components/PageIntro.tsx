import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImage from '@/assets/unicircle-logo-new.png';

export default function PageIntro() {
  const [visible, setVisible] = useState(() => {
    // only show once per session
    return !sessionStorage.getItem('intro_shown');
  });

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('intro_shown', '1');
    }, 1800);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{ background: '#0D0D0D' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* Logo reveal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={logoImage} alt="UniCircle" className="h-14 mx-auto" />
          </motion.div>

          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/60 to-transparent"
            initial={{ top: '0%', opacity: 0 }}
            animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.2, delay: 0.3, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
