import { motion } from "framer-motion";
import { useMemo } from "react";

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
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.4 + 0.1,
    }));
  }, []);

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
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Larger accent particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`accent-${i}`}
          className="absolute rounded-full border border-gold/30"
          style={{
            left: `${10 + i * 12}%`,
            top: `${20 + (i % 3) * 25}%`,
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
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;