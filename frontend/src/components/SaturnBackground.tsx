import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
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

      <ambientLight intensity={0.4} />

      <directionalLight position={[10, 5, 10]} intensity={2} castShadow />

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshStandardMaterial color="#f4a261" roughness={0.8} metalness={0.1} />
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
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        visibility: hasHover && !hasReducedMotion ? "visible" : "hidden",
      }}
    >
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <Saturn />
      </Canvas>
    </div>
  );
};

export default SaturnBackground;
