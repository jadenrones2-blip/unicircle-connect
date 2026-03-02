import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollHeadlineProps {
  text: string;
  className?: string;
}

export default function ScrollHeadline({ text, className = '' }: ScrollHeadlineProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    const chars = containerRef.current?.querySelectorAll('.char');
    if (!chars?.length) return;

    gsap.fromTo(
      chars,
      {
        opacity: 0,
        y: 20,
        filter: 'blur(15px)',
      },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        stagger: 0.04,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
          end: 'top 30%',
          scrub: true,
        },
      }
    );
  }, { scope: containerRef });

  return (
    <h1
      ref={containerRef}
      className={`flex flex-wrap ${className}`}
      aria-label={text}
    >
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="char inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </h1>
  );
}
