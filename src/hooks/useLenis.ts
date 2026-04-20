import { useEffect } from 'react';
import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;
const scrollSubscribers = new Set<(scroll: number) => void>();

export function onLenisScroll(cb: (scroll: number) => void) {
  scrollSubscribers.add(cb);
  return () => scrollSubscribers.delete(cb);
}

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    lenisInstance = lenis;

    lenis.on('scroll', ({ scroll }: { scroll: number }) => {
      scrollSubscribers.forEach((cb) => cb(scroll));
    });

    let raf: number;
    function animate(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);
}
