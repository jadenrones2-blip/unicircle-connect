import { useState } from 'react';
import { motion } from 'framer-motion';

interface TextMarqueeProps {
  text?: string;
  speed?: number;
}

const TextMarquee = ({
  text = 'RECRUIT · EVALUATE · DECIDE · STRUCTURE · SCALE · ',
  speed = 20,
}: TextMarqueeProps) => {
  const repeated = `${text}${text}${text}${text}`;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative overflow-hidden py-6 border-y border-white/[0.07]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        className="whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: hovered ? speed * 0.35 : speed,
            ease: 'linear',
          },
        }}
      >
        <span
          className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[0.15em] uppercase text-gradient-gold select-none transition-all duration-500"
          style={{ opacity: hovered ? 0.45 : 0.15 }}
        >
          {repeated}
        </span>
      </motion.div>
    </div>
  );
};

export default TextMarquee;
