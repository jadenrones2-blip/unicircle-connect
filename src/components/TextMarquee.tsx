import { motion } from "framer-motion";

interface TextMarqueeProps {
  text?: string;
  speed?: number;
}

const TextMarquee = ({
  text = "RECRUIT · EVALUATE · DECIDE · STRUCTURE · SCALE · ",
  speed = 20,
}: TextMarqueeProps) => {
  const repeated = `${text}${text}${text}${text}`;

  return (
    <div className="relative overflow-hidden py-6 bg-primary border-y border-border/20">
      <motion.div
        className="whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
      >
        <span className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[0.15em] uppercase text-gradient-gold opacity-15 select-none">
          {repeated}
        </span>
      </motion.div>
    </div>
  );
};

export default TextMarquee;
