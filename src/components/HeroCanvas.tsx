import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Config ──────────────────────────────────────────────────────────────────
const ECHO_DEPTH = 7;
const DAMPING = 0.88;
const DRAG_SENSITIVITY = 0.007;
const KEY_IMPULSE = 0.22;

// ─── Echo tunnel ─────────────────────────────────────────────────────────────
function EchoRings() {
  const echoes = useMemo(() => {
    const items = [];
    for (let i = 1; i <= ECHO_DEPTH; i++) {
      const scale = Math.pow(0.75, i);
      const z = -i * 2.8;
      const opacity = Math.max(0.02, 0.5 * Math.pow(0.58, i));
      items.push({ scale, z, opacity, key: i });
    }
    return items;
  }, []);

  return (
    <>
      {echoes.map(({ scale, z, opacity, key }) => (
        <group key={key} scale={scale} position={[0, 0, z]}>
          <mesh>
            <torusGeometry args={[2.4, 0.13, 64, 128]} />
            <meshStandardMaterial
              color="#b0b0b0"
              metalness={0.95}
              roughness={0.08}
              transparent
              opacity={opacity}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ─── Main scene ───────────────────────────────────────────────────────────────
function Scene() {
  const groupRef = useRef<THREE.Group>(null!);

  // User-driven impulse (separate from autonomous motion)
  const impulse = useRef({ x: 0, y: 0 });
  const drag = useRef({ active: false, lastX: 0, lastY: 0 });
  const clock = useRef(0);

  // ── keyboard impulse ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = () => {
      impulse.current.x += (Math.random() - 0.5) * KEY_IMPULSE;
      impulse.current.y += (Math.random() - 0.5) * KEY_IMPULSE;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── drag ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      drag.current.active = true;
      drag.current.lastX = e.clientX;
      drag.current.lastY = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.lastX;
      const dy = e.clientY - drag.current.lastY;
      impulse.current.y += dx * DRAG_SENSITIVITY;
      impulse.current.x += dy * DRAG_SENSITIVITY;
      drag.current.lastX = e.clientX;
      drag.current.lastY = e.clientY;
    };
    const onUp = () => { drag.current.active = false; };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── animation loop ────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    clock.current += delta;
    const t = clock.current;

    // ── Autonomous organic motion (never perfectly repeating) ──
    // Main slow Y spin
    const autoY = t * 0.18;
    // Multi-frequency X wobble — looks like it's breathing
    const autoX =
      Math.sin(t * 0.31) * 0.55 +
      Math.sin(t * 0.77) * 0.22 +
      Math.sin(t * 0.13) * 0.18;
    // Subtle Z roll
    const autoZ =
      Math.sin(t * 0.19) * 0.14 +
      Math.sin(t * 0.53) * 0.08;

    // Gentle float on Y position
    const floatY = Math.sin(t * 0.42) * 0.12 + Math.sin(t * 0.27) * 0.06;

    groupRef.current.rotation.y = autoY + impulse.current.y;
    groupRef.current.rotation.x = autoX + impulse.current.x;
    groupRef.current.rotation.z = autoZ;
    groupRef.current.position.y = floatY;

    // Dampen user impulse — decays back to autonomous motion
    impulse.current.x *= DAMPING;
    impulse.current.y *= DAMPING;
  });

  return (
    <group ref={groupRef}>
      {/* Primary ring */}
      <mesh>
        <torusGeometry args={[2.4, 0.13, 64, 128]} />
        <meshStandardMaterial
          color="#d8d8d8"
          metalness={0.96}
          roughness={0.07}
        />
      </mesh>

      <EchoRings />

      {/* Rim lights */}
      <spotLight position={[7, 4, -3]} intensity={90} color="#ffffff" angle={0.28} penumbra={0.1} />
      <spotLight position={[-5, -2, 2]} intensity={20} color="#c8e0ff" angle={0.5} penumbra={0.5} />
      <pointLight position={[0, 5, 3]} intensity={8} color="#ffd580" />
      <ambientLight intensity={0.18} />
    </group>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────
export default function HeroCanvas() {
  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0, cursor: 'grab' }}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        style={{ background: '#0D0D0D' }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
