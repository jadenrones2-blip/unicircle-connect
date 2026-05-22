import { motion } from 'framer-motion';

const GoldMeshBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Grid pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="gold-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(43,76%,52%)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gold-grid)" />
      </svg>

      {/* Animated glow orbs */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(43 76% 52% / 0.06) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(43 76% 52% / 0.04) 0%, transparent 70%)',
        }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Racing stripe */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-gold/20 via-gold/5 to-transparent" />
    </div>
  );
};

export default GoldMeshBackground;
