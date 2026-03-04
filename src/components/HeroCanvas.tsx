import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

// ─── Config ────────────────────────────────────────────────────────────────
const RING_COUNT = 3;          // primary interlocking rings
const ECHO_DEPTH = 6;          // recursive tunnel iterations
const INERTIA = 0.04;          // mouse lag (lower = more delay)

// Cubic-bezier easing: ease-in-out cubic
function cubicEase(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Glass material shared across all rings ─────────────────────────────────
function useGlassMaterial(opacity = 1.0) {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#c8c8c8'),
        transmission: 0.9,
        roughness: 0.05,
        metalness: 0.0,
        ior: 1.5,
        thickness: 0.4,
        envMapIntensity: 2.5,
        transparent: true,
        opacity,
        side: THREE.FrontSide,
      }),
    [opacity]
  );
}

// ─── Single torus ring ──────────────────────────────────────────────────────
function Ring({
  radius,
  tube,
  rotation,
  position,
  opacity = 1,
}: {
  radius: number;
  tube: number;
  rotation: [number, number, number];
  position: [number, number, number];
  opacity?: number;
}) {
  const mat = useGlassMaterial(opacity);
  return (
    <mesh rotation={rotation} position={position} material={mat}>
      <torusGeometry args={[radius, tube, 64, 128]} />
    </mesh>
  );
}

// ─── The three primary interlocking rings ───────────────────────────────────
const PRIMARY_RINGS = [
  {
    radius: 2.2,
    tube: 0.18,
    rotation: [Math.PI / 2, 0, 0] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
  },
  {
    radius: 2.2,
    tube: 0.18,
    rotation: [0, Math.PI / 3, Math.PI / 6] as [number, number, number],
    position: [0.4, 0, 0] as [number, number, number],
  },
  {
    radius: 2.2,
    tube: 0.18,
    rotation: [Math.PI / 4, Math.PI / 2, 0] as [number, number, number],
    position: [-0.4, 0, 0] as [number, number, number],
  },
];

// ─── Recursive echo rings receding into Z-axis ──────────────────────────────
function EchoRings() {
  const echoes = useMemo(() => {
    const items = [];
    for (let i = 1; i <= ECHO_DEPTH; i++) {
      const scale = Math.pow(0.72, i);
      const z = -i * 3.2;
      const opacity = Math.max(0.03, 0.45 * Math.pow(0.6, i));
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

// ─── Rim light that catches edges of glass ──────────────────────────────────
function RimLights() {
  return (
    <>
      {/* sharp back-right key */}
      <spotLight
        position={[6, 5, -4]}
        intensity={80}
        color="#ffffff"
        angle={0.35}
        penumbra={0.2}
        castShadow={false}
      />
      {/* cold fill from left */}
      <pointLight position={[-5, 2, 2]} intensity={12} color="#8ecaff" />
      {/* warm accent bottom */}
      <pointLight position={[0, -4, 1]} intensity={6} color="#ffd580" />
      {/* ambient base so glass isn't pitch black */}
      <ambientLight intensity={0.18} />
    </>
  );
}

// ─── Inner scene: handles rotation + mouse parallax ────────────────────────
function Scene() {
  const groupRef = useRef<THREE.Group>(null!);
  const mouse = useRef({ x: 0, y: 0 });
  const smoothed = useRef({ x: 0, y: 0 });
  const clock = useRef(0);

  // track raw mouse
  const { gl } = useThree();
  useMemo(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    gl.domElement.addEventListener('mousemove', onMove);
    return () => gl.domElement.removeEventListener('mousemove', onMove);
  }, [gl]);

  useFrame((_, delta) => {
    clock.current += delta;
    const t = (clock.current * 0.08) % 1; // full cycle every ~12s
    const eased = cubicEase(t < 0.5 ? t * 2 : (1 - t) * 2) * (t < 0.5 ? 1 : -1);

    // inertia-lag on mouse
    smoothed.current.x += (mouse.current.x - smoothed.current.x) * INERTIA;
    smoothed.current.y += (mouse.current.y - smoothed.current.y) * INERTIA;

    if (groupRef.current) {
      groupRef.current.rotation.y = clock.current * 0.06 + smoothed.current.x * 0.22;
      groupRef.current.rotation.x = Math.sin(clock.current * 0.04) * 0.18 + smoothed.current.y * 0.15;
      groupRef.current.rotation.z = eased * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Primary three rings */}
      {PRIMARY_RINGS.map((r, i) => (
        <Ring key={i} {...r} />
      ))}
      {/* Recursive depth echoes */}
      <EchoRings />
      {/* Lights */}
      <RimLights />
      {/* HDRI environment for glass reflections (no real-time RT) */}
      <Environment preset="city" />
    </group>
  );
}

// ─── Exported canvas component ──────────────────────────────────────────────
export default function HeroCanvas() {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ background: '#0D0D0D' }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
