import { motion } from 'framer-motion';

interface AnimatedWordsProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  goldWords?: string[];
  delay?: number;
}

const AnimatedWords = ({
  text,
  className = '',
  as: Tag = 'h2',
  goldWords = [],
  delay = 0,
}: AnimatedWordsProps) => {
  const words = text.split(' ');

  return (
    <Tag className={className}>
      {words.map((word, i) => {
        const isGold = goldWords.some(
          (gw) => word.toLowerCase().replace(/[.,!?]/g, '') === gw.toLowerCase()
        );
        return (
          <motion.span
            key={`${word}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: delay + i * 0.05,
              duration: 0.4,
              ease: 'easeOut',
            }}
            className={`inline-block mr-[0.3em] ${isGold ? 'text-gold' : ''}`}
          >
            {word}
          </motion.span>
        );
      })}
    </Tag>
  );
};

export default AnimatedWords;
