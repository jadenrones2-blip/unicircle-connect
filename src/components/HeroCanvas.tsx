import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Config ─────────────────────────────────────────────────────────────────
const ECHO_DEPTH = 7;
const DAMPING = 0.92;       // how fast spin decays after impulse
const DRAG_SENSITIVITY = 0.008;
const KEY_IMPULSE = 0.18;   // rotation kick per keypress

// ─── Echo tunnel: smaller rings receding into Z ──────────────────────────────
function EchoRings() {
  const echoes = useMemo(() => {
    const items = [];
    for (let i = 1; i <= ECHO_DEPTH; i++) {
      const scale = Math.pow(0.75, i);
      const z = -i * 2.8;
      const opacity = Math.max(0.03, 0.55 * Math.pow(0.6, i));
      items.push({ scale, z, opacity, key: i });
    }
    return items;
  }, []);

  return (
    <>
      {echoes.map(({ scale, z, opacity, key }) => (
        <group key={key} scale={scale} position={[0, 0, z]}>
          <mesh>
            <torusGeometry args={[2.4, 0.14, 64, 128]} />
            <meshStandardMaterial
              color="#b8b8b8"
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

// ─── Main scene with physics ─────────────────────────────────────────────────
function Scene() {
  const groupRef = useRef<THREE.Group>(null!);

  // Physics state
  const vel = useRef({ x: 0, y: 0 });

  // Drag state
  const drag = useRef({ active: false, lastX: 0, lastY: 0 });

  // ── keyboard impulse ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = () => {
      vel.current.x += (Math.random() - 0.5) * KEY_IMPULSE;
      vel.current.y += (Math.random() - 0.5) * KEY_IMPULSE;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── mouse / touch drag ────────────────────────────────────────────────────
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
      vel.current.y += dx * DRAG_SENSITIVITY;
      vel.current.x += dy * DRAG_SENSITIVITY;
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

    // idle slow drift
    vel.current.y += delta * 0.06;
    vel.current.x += Math.sin(Date.now() * 0.0003) * delta * 0.012;

    // apply velocity
    groupRef.current.rotation.y += vel.current.y * delta * 60 * 0.016;
    groupRef.current.rotation.x += vel.current.x * delta * 60 * 0.016;

    // dampen
    vel.current.x *= DAMPING;
    vel.current.y *= DAMPING;
  });

  return (
    <group ref={groupRef}>
      {/* Primary ring */}
      <mesh>
        <torusGeometry args={[2.4, 0.14, 64, 128]} />
        <meshStandardMaterial
          color="#d0d0d0"
          metalness={0.95}
          roughness={0.08}
        />
      </mesh>

      {/* Tunnel echoes */}
      <EchoRings />

      {/* Rim lighting */}
      <spotLight position={[6, 4, -3]} intensity={80} color="#ffffff" angle={0.3} penumbra={0.15} />
      <pointLight position={[-4, 3, 2]} intensity={12} color="#a8d8ff" />
      <pointLight position={[2, -4, 1]} intensity={6} color="#ffd580" />
      <ambientLight intensity={0.25} />
    </group>
  );
}

// ─── Canvas wrapper ──────────────────────────────────────────────────────────
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
