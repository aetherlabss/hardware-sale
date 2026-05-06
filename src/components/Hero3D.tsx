import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

export function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create an ultra-premium subtle ambient movement
    const ctx = gsap.context(() => {
      gsap.to('.ambient-blob-1', {
        x: 'random(-100, 100)',
        y: 'random(-100, 100)',
        rotation: 'random(-45, 45)',
        duration: 'random(10, 15)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to('.ambient-blob-2', {
        x: 'random(-100, 100)',
        y: 'random(-100, 100)',
        rotation: 'random(-45, 45)',
        duration: 'random(12, 18)',
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
      });
      
      gsap.fromTo('.grid-line-h', 
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 0.1, duration: 2, stagger: 0.1, ease: 'power3.inOut' }
      );
      gsap.fromTo('.grid-line-v', 
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 0.1, duration: 2, stagger: 0.1, ease: 'power3.inOut' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#020204]">
      {/* Dynamic Grid */}
      <div className="absolute inset-0 perspective-[1000px] flex items-center justify-center opacity-30 mix-blend-screen">
        <div className="w-[200vw] h-[200vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-x-[60deg] translate-z-[-200px]">
          {/* Horizontal Lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={`h-${i}`} className="grid-line-h w-full h-[1px] bg-brand-neon origin-center" />
            ))}
          </div>
          {/* Vertical Lines */}
          <div className="absolute inset-0 flex justify-between">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={`v-${i}`} className="grid-line-v w-[1px] h-full bg-brand-magenta origin-center" />
            ))}
          </div>
        </div>
      </div>

      {/* Optical Flares & Gradients - AfterEffects Style */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen h-screen flex items-center justify-center mix-blend-screen">
        {/* Core Flare */}
        <div className="absolute w-[800px] h-[300px] bg-brand-neon/20 blur-[120px] rounded-full rotate-[35deg]"></div>
        {/* Intense Center */}
        <div className="absolute w-[400px] h-[100px] bg-white/40 blur-[60px] rounded-full"></div>
      </div>
      
      {/* Ambient Moving Blobs for volumetric feel */}
      <div className="ambient-blob-1 absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-brand-magenta/15 blur-[150px] rounded-full mix-blend-screen opacity-70"></div>
      <div className="ambient-blob-2 absolute bottom-[20%] right-[20%] w-[700px] h-[700px] bg-brand-neon/15 blur-[160px] rounded-full mix-blend-screen opacity-70"></div>
      
      {/* Vignette Overlay to focus center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020204_80%)]"></div>
      
      {/* Scanlines / Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
    </div>
  );
}
