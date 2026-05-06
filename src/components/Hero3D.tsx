import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

function ParticleSwarm({ count = 5000 }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate random positions and colors for particles
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    // Brand Colors
    const neon = new THREE.Color('#a855f7'); // Vivid Purple
    const magenta = new THREE.Color('#ec4899'); // Pink
    const white = new THREE.Color('#ffffff');
    
    for (let i = 0; i < count; i++) {
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);
      const r = THREE.MathUtils.randFloatSpread(20) + 5;
      
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const mixedColor = Math.random() > 0.8 ? white : (Math.random() > 0.5 ? neon : magenta);
      
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }
    return [positions, colors];
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime / 10) * 0.2;
      pointsRef.current.rotation.y = Math.cos(state.clock.elapsedTime / 15) * 0.2;
      pointsRef.current.rotation.z -= 0.001;
      
      // Subtle mouse tracking
      const mouseX = (state.pointer.x * Math.PI) / 10;
      const mouseY = (state.pointer.y * Math.PI) / 10;
      
      pointsRef.current.rotation.x += (mouseY - pointsRef.current.rotation.x) * 0.05;
      pointsRef.current.rotation.y += (mouseX - pointsRef.current.rotation.y) * 0.05;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} colors={colors} stride={3} frustumCulled={false}>
      <PointMaterial 
        transparent 
        vertexColors 
        size={0.08} 
        sizeAttenuation={true} 
        depthWrite={false} 
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none bg-[#020204] overflow-hidden">
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-10 opacity-80">
        <Canvas camera={{ position: [0, 0, 15], fov: 60 }} dpr={[1, 2]}>
          <ParticleSwarm count={8000} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.1} mipmapBlur luminanceSmoothing={0.4} intensity={2.0} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Optical Flares & Gradients - AfterEffects Style */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen h-screen flex items-center justify-center mix-blend-screen z-0">
        <div className="absolute w-[800px] max-w-[100vw] h-[300px] bg-brand-neon/20 blur-[120px] rounded-full rotate-[35deg] animate-pulse"></div>
        <div className="absolute w-[400px] max-w-[100vw] h-[100px] bg-white/10 blur-[60px] rounded-full"></div>
      </div>
      
      {/* Vignette Overlay to focus center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020204_90%)] z-20"></div>
      
      {/* Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay z-30" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}></div>
    </div>
  );
}
