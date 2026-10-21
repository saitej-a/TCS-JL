import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";

const Saturn = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <>
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      <ambientLight intensity={0.4} color="#ffffff" />

      <directionalLight
        position={[10, 5, 10]}
        intensity={2}
        color="#ffffff"
        castShadow
      />

      <spotLight
        position={[-5, 5, -5]}
        intensity={1}
        color="#d6d3d1"
        angle={0.5}
        penumbra={1}
      />

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshStandardMaterial
            color="#f4a261"
            roughness={0.8}
            metalness={0.1}
            envMapIntensity={0.5}
          />
        </mesh>

        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[4, 0.6, 16, 100]} />
          <meshStandardMaterial
            color="#e76f51"
            roughness={0.6}
            metalness={0.2}
            side={THREE.DoubleSide}
            transparent
            opacity={0.95}
          />
        </mesh>

        <mesh position={[0, 0.35, 0]}>
          <torusGeometry args={[3.2, 0.15, 16, 50]} />
          <meshStandardMaterial
            color="#e9c46a"
            roughness={0.4}
            metalness={0.3}
            side={THREE.DoubleSide}
            transparent
            opacity={0.75}
          />
        </mesh>

        <mesh position={[0, 0.25, 0]}>
          <torusGeometry args={[3.8, 0.25, 16, 80]} />
          <meshStandardMaterial
            color="#d4a373"
            roughness={0.5}
            metalness={0.2}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>
    </>
  );
};

const SaturnBackground = () => {
  const [hasHover, setHasHover] = useState(false);
  const [hasReducedMotion, setHasReducedMotion] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setHasHover(window.matchMedia("(pointer: fine)").matches);
      setHasReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{
        visibility: hasHover && !hasReducedMotion ? "visible" : "hidden",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[600px] h-[600px] md:w-[800px] md:h-[800px] lg:w-[1000px] lg:h-[1000px]">
          <Canvas
            camera={{
              position: [0, 0, 12],
              fov: 50,
            }}
            dpr={[1, 2]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
            }}
          >
            <Saturn />
          </Canvas>
        </div>
      </div>
    </div>
  );
};

export default SaturnBackground;
