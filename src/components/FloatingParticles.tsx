import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const FloatingParticles = () => {
  const isMobile = useIsMobile();

  // Disable particles entirely on mobile for better performance
  const particles = useMemo<Particle[]>(() => {
    if (isMobile) return [];

    // Reduced from 30 to 15 particles for better performance
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.4 + 0.1,
    }));
  }, [isMobile]);

  // Don't render anything on mobile
  if (isMobile) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gold"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, particle.opacity, particle.opacity, 0],
            scale: [0.5, 1, 1, 0.5],
            y: [0, -100, -200, -300],
            x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30, Math.random() * 80 - 40],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Reduced accent particles from 8 to 4 */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`accent-${i}`}
          className="absolute rounded-full border border-gold/30"
          style={{
            left: `${10 + i * 20}%`,
            top: `${20 + (i % 2) * 30}%`,
            width: 8 + i * 2,
            height: 8 + i * 2,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, 20, 0],
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8 + i * 2,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
