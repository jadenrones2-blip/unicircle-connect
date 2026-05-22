import { useEffect, useRef, useState, useCallback } from 'react';

// ── Count-up hook ────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  const start = useCallback(() => {
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quartic
      setValue(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [target, duration]);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setValue(0);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  return { value, start, reset };
}

// ── Number card (count-up) ───────────────────────────────────────
function NumberCard({
  target,
  label,
  delay = 0,
}: {
  target: number;
  label: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { value, start, reset } = useCountUp(target);
  const [visible, setVisible] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (!startedRef.current) {
            startedRef.current = true;
            setTimeout(start, delay * 1000);
          } else {
            start();
          }
        } else {
          setVisible(false);
          reset();
          startedRef.current = false;
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -30px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [start, reset, delay]);

  return (
    <div
      ref={ref}
      className="relative bg-black px-10 py-[52px]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.55s ${delay}s, transform 0.55s ${delay}s`,
      }}
    >
      <div
        className="absolute top-0 left-0 h-[2px] w-9"
        style={{ background: 'hsl(47 95% 58%)' }}
      />
      <div className="flex items-baseline gap-[3px] mb-3.5" style={{ lineHeight: 1 }}>
        <span
          className="font-display font-black text-white tabular-nums"
          style={{ fontSize: 'clamp(44px, 4.5vw, 66px)', letterSpacing: '-0.04em' }}
        >
          {value.toLocaleString()}
        </span>
        <span
          className="font-display font-bold"
          style={{ fontSize: '0.52em', color: 'hsl(47 95% 62%)' }}
        >
          +
        </span>
      </div>
      <div className="uppercase tracking-[0.08em] text-white/30" style={{ fontSize: 11 }}>
        {label}
      </div>
    </div>
  );
}

// ── Text card ────────────────────────────────────────────────────
function TextCard({ lines, label, delay = 0 }: { lines: string[]; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.25,
      rootMargin: '0px 0px -30px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative bg-black px-10 py-[52px]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.55s ${delay}s, transform 0.55s ${delay}s`,
      }}
    >
      <div
        className="absolute top-0 left-0 h-[2px] w-9"
        style={{ background: 'hsl(47 95% 58%)' }}
      />
      <div
        className="flex flex-col font-display font-black text-white mb-3.5"
        style={{ fontSize: 'clamp(28px, 3vw, 42px)', letterSpacing: '-0.02em', lineHeight: 1.2 }}
      >
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="uppercase tracking-[0.08em] text-white/30" style={{ fontSize: 11 }}>
        {label}
      </div>
    </div>
  );
}

// ── StatsSection ─────────────────────────────────────────────────
const StatsSection = () => (
  <section style={{ background: '#000', padding: '110px 48px 130px' }}>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Eyebrow */}
      <div
        className="flex items-center gap-3 mb-[52px] font-semibold uppercase tracking-[0.15em]"
        style={{ fontSize: 11, color: 'hsl(47 95% 62%)' }}
      >
        Platform Scale
        <span
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(to right, hsl(47 95% 58% / 0.25), transparent)' }}
        />
      </div>

      {/* Grid — 1px gap rendered via container bg */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ gap: 1, background: 'rgba(255,255,255,0.05)' }}
      >
        <NumberCard target={10000} label="Organizations Across California" delay={0} />
        <TextCard lines={['Multi-', 'Campus']} label="System-Wide Infrastructure" delay={0.1} />
        <NumberCard target={500000} label="Annual Projected Hours Recovered" delay={0.2} />
      </div>
    </div>
  </section>
);

export default StatsSection;
