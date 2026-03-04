import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── Config ────────────────────────────────────────────────────────────────
const ECHO_DEPTH = 6;
const INERTIA = 0.04;

// ─── Primary ring definitions ───────────────────────────────────────────────
const PRIMARY_RINGS = [
  {
    radius: 2.2, tube: 0.16,
    rotation: [Math.PI / 2, 0, 0] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
  },
  {
    radius: 2.2, tube: 0.16,
    rotation: [0, Math.PI / 3, Math.PI / 6] as [number, number, number],
    position: [0.4, 0, 0] as [number, number, number],
  },
  {
    radius: 2.2, tube: 0.16,
    rotation: [Math.PI / 4, Math.PI / 2, 0] as [number, number, number],
    position: [-0.4, 0, 0] as [number, number, number],
  },
];

// ─── Single torus ring ──────────────────────────────────────────────────────
function Ring({
  radius, tube, rotation, position, opacity = 1,
}: {
  radius: number; tube: number;
  rotation: [number, number, number];
  position: [number, number, number];
  opacity?: number;
}) {
  return (
    <mesh rotation={rotation} position={position}>
      <torusGeometry args={[radius, tube, 64, 128]} />
      <MeshTransmissionMaterial
        transmission={0.92}
        roughness={0.05}
        thickness={0.5}
        ior={1.5}
        chromaticAberration={0.04}
        color="#d0d0d0"
        envMapIntensity={2.0}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

// ─── Recursive echo rings receding into Z ───────────────────────────────────
function EchoRings() {
  const echoes = useMemo(() => {
    const items = [];
    for (let i = 1; i <= ECHO_DEPTH; i++) {
      const scale = Math.pow(0.72, i);
      const z = -i * 3.2;
      const opacity = Math.max(0.04, 0.5 * Math.pow(0.58, i));
      items.push({ scale, z, opacity, key: i });
    }
    return items;
  }, []);

  return (
    <>
      {echoes.map(({ scale, z, opacity, key }) => (
        <group key={key} scale={scale} position={[0, 0, z]}>
          {PRIMARY_RINGS.map((r, i) => (
            <Ring key={i} {...r} opacity={opacity} />
          ))}
        </group>
      ))}
    </>
  );
}

// ─── Scene: rotation + mouse parallax ──────────────────────────────────────
function Scene() {
  const groupRef = useRef<THREE.Group>(null!);
  const mouse = useRef({ x: 0, y: 0 });
  const smoothed = useRef({ x: 0, y: 0 });
  const { gl } = useThree();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame((_, delta) => {
    // inertia-lag mouse
    smoothed.current.x += (mouse.current.x - smoothed.current.x) * INERTIA;
    smoothed.current.y += (mouse.current.y - smoothed.current.y) * INERTIA;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12 + smoothed.current.x * 0.008;
      groupRef.current.rotation.x += delta * 0.05 + smoothed.current.y * 0.005;
      groupRef.current.rotation.z += delta * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {PRIMARY_RINGS.map((r, i) => <Ring key={i} {...r} />)}
      <EchoRings />

      {/* Rim lights */}
      <spotLight position={[6, 5, -4]} intensity={60} color="#ffffff" angle={0.35} penumbra={0.2} />
      <pointLight position={[-5, 2, 2]} intensity={10} color="#9ecfff" />
      <pointLight position={[0, -4, 1]} intensity={5} color="#ffd580" />
      <ambientLight intensity={0.2} />

      <Environment preset="city" />
    </group>
  );
}

// ─── Exported canvas ────────────────────────────────────────────────────────
export default function HeroCanvas() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
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
