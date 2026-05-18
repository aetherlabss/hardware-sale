import { useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Hero3D } from '../components/Hero3D';
import { BentoGrid } from '../components/BentoGrid';
import { ArrowDown, Package, Zap, Wrench, PackageCheck, Headphones, ChevronRight, Star, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MagneticButton } from '../components/ui/magnetic-button';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Home() {
  const container = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  const navigate = useNavigate();

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!testimonialsRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - testimonialsRef.current.offsetLeft);
    setScrollLeftStart(testimonialsRef.current.scrollLeft);
    testimonialsRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !testimonialsRef.current) return;
    e.preventDefault();
    const x = e.pageX - testimonialsRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    testimonialsRef.current.scrollLeft = scrollLeftStart - walk;
  }, [isDragging, startX, scrollLeftStart]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    if (testimonialsRef.current) testimonialsRef.current.style.cursor = 'grab';
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (testimonialsRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        testimonialsRef.current.scrollLeft += e.deltaY;
      }
    }
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Epic God-Level Intro Animation
    tl.fromTo('.hero-badge', 
      { y: -50, opacity: 0, scale: 0.5 },
      { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: 'elastic.out(1, 0.5)' }
    )
    .fromTo('.hero-title-word', 
      { y: 150, opacity: 0, rotateX: -90, z: -500 },
      { y: 0, opacity: 1, rotateX: 0, z: 0, duration: 1.5, stagger: 0.2, ease: 'expo.out', transformOrigin: "50% 50% -100px" },
      "-=0.8"
    )
    .fromTo('.hero-subtitle', 
      { y: 40, opacity: 0, filter: "blur(10px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 1, ease: 'power3.out' },
      "-=1"
    )
    .fromTo('.hero-actions button', 
      { y: 50, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: 'back.out(1.5)' },
      "-=0.6"
    )
    .fromTo('.scroll-indicator', 
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 1, ease: 'power2.out' },
      "-=0.4"
    );

    gsap.to('.scroll-indicator', {
      y: 10,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gsap.utils.toArray('.fade-in-section').forEach((section: any) => {
      gsap.fromTo(section, 
        { y: 80, opacity: 0, scale: 0.95 },
        {
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            end: 'top 50%',
            scrub: 1
          },
          y: 0,
          opacity: 1,
          scale: 1,
          ease: 'power1.out'
        }
      );
    });

    gsap.fromTo('.stats-grid div', 
      { y: 50, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.stats-section',
          start: 'top 75%'
        },
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.8,
        ease: 'back.out(1.2)'
      }
    );
  }, { scope: container });

  return (
    <div ref={container} className="pb-20 relative bg-transparent perspective-1000">
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden">
        <Hero3D />
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center mt-10" style={{ transformStyle: 'preserve-3d' }}>
          <div className="hero-badge mb-8 px-6 py-2 rounded-full border border-brand-neon/30 bg-brand-neon/10 backdrop-blur-md flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-neon opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-neon"></span>
            </span>
            <span className="text-xs font-bold text-white tracking-widest uppercase">Hardware de Luxo em Moçambique</span>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-extrabold tracking-tighter leading-[0.85] mb-8 text-center drop-shadow-2xl flex flex-col" style={{ perspective: '1000px' }}>
            <span className="hero-title-word block text-white">HARDWARE</span>
            <span className="hero-title-word block text-transparent bg-clip-text bg-gradient-to-r from-brand-neon via-brand-magenta to-brand-neon bg-[length:200%_auto] animate-gradient pb-2">SUPREMO</span>
          </h1>
          
          <p className="hero-subtitle text-lg md:text-2xl text-gray-400 max-w-2xl font-medium mb-12 flex-col leading-relaxed tracking-wide">
            Sistemas High-End forjados à mão.<br/>Redefinindo o padrão de performance e luxo tecnológico em <span className="text-white font-bold">Moçambique</span>.
          </p>
          
          <div className="hero-actions flex flex-col sm:flex-row gap-6">
            <MagneticButton>
              <button 
                onClick={() => navigate('/products')}
                className="group px-10 py-5 rounded-full flex items-center justify-center gap-3 bg-white text-black font-bold text-sm shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:bg-gray-100 relative overflow-hidden"
              >
                <Package className="w-4 h-4 transition-transform group-hover:rotate-12" />
                Explorar Catálogo
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></span>
              </button>
            </MagneticButton>
            <button 
              onClick={() => navigate('/builder')}
              className="group px-10 py-5 rounded-full flex items-center justify-center gap-3 text-white font-bold text-sm border border-brand-neon/40 bg-black/50 backdrop-blur-xl transition-all hover:bg-brand-neon/10 hover:border-brand-neon hover:scale-105 hover:shadow-[0_0_30px_rgba(20,241,149,0.3)] relative overflow-hidden"
            >
              Smart Builder AI 
              <Zap className="w-4 h-4 text-brand-neon group-hover:animate-pulse" />
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-neon/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 scroll-indicator text-brand-neon/50 flex flex-col items-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest mb-2 font-bold">Descobrir</span>
          <ArrowDown className="w-5 h-5" />
        </div>
      </section>

      {/* Marquee Section (Logos) */}
      <div className="w-full bg-[#020204] py-16 border-y border-white/5 overflow-hidden flex whitespace-nowrap relative z-10 fade-in-section" style={{ background: 'radial-gradient(circle at center, rgba(20,241,149,0.08) 0%, #020204 80%)' }}>
        <div className="absolute inset-0 bg-brand-neon/5 animate-pulse pointer-events-none opacity-30"></div>
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#020204] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#020204] to-transparent z-10 pointer-events-none"></div>
        
        {(() => {
          const brands = [
            { name: 'NVIDIA', customUrl: 'https://cdn.simpleicons.org/nvidia/76B900' },
            { name: 'AMD', customUrl: 'https://cdn.simpleicons.org/amd/ED1C24' },
            { name: 'Intel', customUrl: 'https://cdn.simpleicons.org/intel/0071C5' },
            { name: 'ASUS', customUrl: 'https://cdn.simpleicons.org/asus/FFFFFF' },
            { name: 'ROG', customUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Republic_Of_Gamers_Logo.svg' },
            { name: 'MSI', customUrl: 'https://cdn.simpleicons.org/msi/FF0000' },
            { name: 'AORUS', customUrl: 'https://upload.wikimedia.org/wikipedia/en/2/24/Aorus_logo.svg' },
            { name: 'Corsair', customUrl: 'https://cdn.simpleicons.org/corsair/FFFFFF' },
            { name: 'Razer', customUrl: 'https://cdn.simpleicons.org/razer/00FF00' },
            { name: 'Logitech G', customUrl: 'https://cdn.simpleicons.org/logitechg/00B8FC' },
            { name: 'SteelSeries', customUrl: 'https://cdn.simpleicons.org/steelseries/FFFFFF' },
            { name: 'Samsung', customUrl: 'https://cdn.simpleicons.org/samsung/1428A0' },
            { name: 'Kingston', customUrl: 'https://cdn.simpleicons.org/kingstontechnology/FF0000' },
            { name: 'NZXT', customUrl: 'https://cdn.simpleicons.org/nzxt/FFFFFF' },
            { name: 'Gigabyte', customUrl: 'https://cdn.simpleicons.org/gigabyte/FFFFFF' },
            { name: 'Fractal', customUrl: 'https://www.fractal-design.com/wp-content/themes/fractal/assets/img/logo.svg' },
            { name: 'Lian Li', customUrl: 'https://lian-li.com/wp-content/uploads/2021/01/logo.png' },
            { name: 'be quiet!', customUrl: 'https://cdn.simpleicons.org/bequiet/FFFFFF' },
            { name: 'DeepCool', customUrl: 'https://cdn.simpleicons.org/deepcool/FFFFFF' },
            { name: 'EVGA', customUrl: 'https://cdn.simpleicons.org/evga/FFFFFF' },
            { name: 'Seasonic', customUrl: 'https://seasonic.com/wp-content/themes/seasonic/assets/images/logo.svg' },
            { name: 'G.Skill', customUrl: 'https://cdn.simpleicons.org/gskill/FFFFFF' },
            { name: 'Cooler Master', customUrl: 'https://cdn.simpleicons.org/coolermaster/FFFFFF' },
            { name: 'WD', customUrl: 'https://cdn.simpleicons.org/westerndigital/FFFFFF' },
          ];

          const marqueeContent = brands.map((brand, i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-4 group px-12 shrink-0">
              <div className="relative h-12 flex items-center justify-center">
                <img 
                  src={brand.customUrl}
                  alt={brand.name}
                  className={`h-8 md:h-10 w-auto opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_20px_rgba(20,241,149,0.3)] ${brand.name === 'Lian Li' || brand.name === 'Fractal' || brand.name === 'Seasonic' ? 'brightness-0 invert' : ''}`}
                  onError={(e) => { 
                    const img = e.target as HTMLImageElement;
                    img.src = `https://logo.clearbit.com/${brand.name.toLowerCase().replace(' ', '')}.com`;
                  }}
                />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 group-hover:text-white transition-all duration-300">{brand.name}</span>
            </div>
          ));

          return (
            <div className="flex animate-marquee items-center flex-nowrap w-max">
               {marqueeContent}
               {marqueeContent}
               {marqueeContent}
            </div>
          );
        })()}
      </div>

      {/* Bento Grid Features - Reordered to be right after logos */}
      <section className="pt-32 pb-16 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 fade-in-section">
        <div className="text-center mb-16 px-4 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight text-white">A Diferença <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Matrix</span></h2>
          <p className="text-gray-400 text-xl font-medium">O que diferencia um computador genérico de um instrumento de precisão de alta potência computacional.</p>
        </div>
        
        <BentoGrid />
      </section>

      {/* Exclusividade e Maestria */}
      <section className="pt-16 pb-24 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 fade-in-section">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-[100vw] h-[800px] bg-brand-magenta/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="text-center mb-20 px-4 max-w-5xl mx-auto flex flex-col items-center relative z-10">
          <span className="text-brand-neon font-bold tracking-widest uppercase text-xs mb-6 px-5 py-2 rounded-full border border-brand-neon/30 bg-brand-neon/10 inline-block shadow-[0_0_20px_rgba(20,241,149,0.2)]">Alta Performance</span>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-8 text-white">O Ponto de Partida dos<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Entusiastas.</span></h2>
          <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed max-w-3xl">
            Esqueça o mercado tradicional de informática. A Hardware Sale dedica-se exclusivamente aos componentes de elite. Trazemos o que há de mais poderoso no mundo direto para o coração de Moçambique.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="bg-black/60 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/10 hover:border-brand-neon/50 hover:bg-black/80 transition-all duration-500 group shadow-2xl hover:shadow-[0_0_30px_rgba(20,241,149,0.15)] hover:-translate-y-2">
            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center mb-8 border border-white/20 group-hover:scale-110 transition-all duration-500 group-hover:border-brand-neon/50 group-hover:from-brand-neon/20 shadow-inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-white group-hover:text-brand-neon transition-colors" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-brand-neon transition-colors">Seleção Criteriosa</h3>
            <p className="text-gray-400 leading-relaxed font-medium">Cada processador e GPU comercializado passa por uma validação rigorosa focando em marcas de renome mundial, sem margem para falhas.</p>
          </div>
          
          <div className="bg-gradient-to-b from-[#1a1025] to-black/80 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-brand-magenta/30 hover:border-brand-magenta/60 transition-all duration-500 group relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.15)] -translate-y-4 hover:-translate-y-6 hover:shadow-[0_0_60px_rgba(168,85,247,0.3)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-neon/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-brand-neon/20 transition-colors duration-500"></div>
            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-brand-magenta/30 to-transparent flex items-center justify-center mb-8 border border-brand-magenta/40 group-hover:scale-110 transition-all duration-500 relative z-10 shadow-inner group-hover:from-brand-magenta/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-white group-hover:text-brand-magenta transition-colors drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 relative z-10 group-hover:text-brand-magenta transition-colors">Desempenho Extremo</h3>
            <p className="text-gray-300 font-medium leading-relaxed relative z-10">Componentes dimensionados para rodar AAA em 4K nativo @ 144Hz ou lidar com renderizações volumétricas complexas. Prontos para setups sem limite.</p>
          </div>
          
          <div className="bg-black/60 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/10 hover:border-brand-neon/50 hover:bg-black/80 transition-all duration-500 group shadow-2xl hover:shadow-[0_0_30px_rgba(20,241,149,0.15)] hover:-translate-y-2">
            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center mb-8 border border-white/20 group-hover:scale-110 transition-all duration-500 group-hover:border-brand-neon/50 group-hover:from-brand-neon/20 shadow-inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-white group-hover:text-brand-neon transition-colors" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-brand-neon transition-colors">Blindagem Premium</h3>
            <p className="text-gray-400 leading-relaxed font-medium">Garantia local imediata e assistência técnica especializada garantem que o seu workflow ou ranking nunca sejam interrompidos.</p>
          </div>
        </div>
      </section>

      {/* Diferencial do Serviço / Logistica */}
      <section className="py-24 relative z-10 w-full overflow-hidden bg-[#030308] border-y border-white/5 fade-in-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
            <div className="w-full lg:w-1/2 relative">
              <div className="absolute inset-0 bg-brand-magenta/10 blur-[150px] rounded-full pointer-events-none"></div>
              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div className="space-y-6 pt-12">
                  <div className="bg-[#0a0a14]/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl group hover:border-brand-neon/50 hover:bg-[#0a0a14] transition-all duration-500 hover:-translate-y-2">
                    <div className="w-12 h-12 rounded-[1rem] bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-brand-neon/20 group-hover:border-brand-neon/30 transition-colors">
                      <Wrench className="w-6 h-6 text-gray-300 group-hover:text-brand-neon transition-colors" />
                    </div>
                    <h4 className="font-bold text-white text-xl leading-tight">Montagem<br/>White-Glove</h4>
                    <p className="text-sm text-gray-400 mt-3 font-medium">Gestão de cabos cirúrgica e otimização térmica perfeita.</p>
                  </div>
                  <div className="bg-[#1a1025]/90 backdrop-blur-xl border border-brand-magenta/30 p-8 rounded-[2rem] shadow-[0_0_30px_rgba(168,85,247,0.1)] group hover:border-brand-magenta hover:-translate-y-2 transition-all duration-500">
                    <div className="w-12 h-12 rounded-[1rem] bg-brand-magenta/20 flex items-center justify-center mb-6 border border-brand-magenta/30">
                      <Zap className="w-6 h-6 text-brand-magenta" />
                    </div>
                    <h4 className="font-bold text-white text-xl leading-tight">Overclock<br/>Testado</h4>
                    <p className="text-sm text-gray-300 mt-3 font-medium">Stress tests de 48h pré-entrega garantem estabilidade extrema.</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-[#0a0a14]/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl group hover:border-brand-neon/50 hover:bg-[#0a0a14] transition-all duration-500 hover:-translate-y-2">
                    <div className="w-12 h-12 rounded-[1rem] bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-brand-neon/20 group-hover:border-brand-neon/30 transition-colors">
                      <PackageCheck className="w-6 h-6 text-gray-300 group-hover:text-brand-neon transition-colors" />
                    </div>
                    <h4 className="font-bold text-white text-xl leading-tight">Entrega VIP<br/>Maputo</h4>
                    <p className="text-sm text-gray-400 mt-3 font-medium">Equipe dedicada instala o setup na sua casa no mesmo dia.</p>
                  </div>
                  <div className="bg-[#0a0a14]/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl group hover:border-brand-neon/50 hover:bg-[#0a0a14] transition-all duration-500 hover:-translate-y-2">
                    <div className="w-12 h-12 rounded-[1rem] bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-brand-neon/20 group-hover:border-brand-neon/30 transition-colors">
                      <Headphones className="w-6 h-6 text-gray-300 group-hover:text-brand-neon transition-colors" />
                    </div>
                    <h4 className="font-bold text-white text-xl leading-tight">Suporte<br/>Dedicado</h4>
                    <p className="text-sm text-gray-400 mt-3 font-medium">Assistência humana especializada constante para os clientes VIP.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 text-left">
              <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight leading-[1.1]">Logística de Elite,<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Impecável</span></h2>
              <p className="text-gray-400 text-xl mb-10 leading-relaxed font-medium">
                Cada máquina encomendada no nosso portal entra num processo meticuloso de manufatura. Desde a seleção milimétrica da pasta térmica até o roteamento simétrico invisível no painel traseiro.
              </p>
              
              <ul className="space-y-4 mb-12">
                {[
                  "Certificação autêntica com as principais marcas de topo mundiais.",
                  "Diagnóstico térmico, cable management invisível e testes de stress.",
                  "Sistemas Workstation desenhados especificamente para workflows pesados.",
                  "Caixas seguradas e experiência de unboxing ao nível do hardware."
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-5 p-5 bg-gradient-to-r from-white/5 to-transparent rounded-2xl border border-white/10 hover:border-brand-neon/30 transition-all shadow-lg group">
                    <div className="w-10 h-10 rounded-full bg-brand-neon/10 border border-brand-neon/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform group-hover:bg-brand-neon group-hover:text-black">
                      <ChevronRight className="w-5 h-5 text-brand-neon group-hover:text-black" strokeWidth={3} />
                    </div>
                    <span className="text-gray-200 font-semibold group-hover:text-white transition-colors">{item}</span>
                  </li>
                ))}
              </ul>

              <button onClick={() => navigate('/products')} className="px-10 py-5 bg-white hover:bg-gray-200 text-black rounded-full flex items-center justify-center gap-3 font-bold transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 text-lg w-full sm:w-auto">
                Ver Coleções Prontas <ArrowDown className="w-5 h-5 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials — Drag to Scroll */}
      <section className="py-24 relative z-10 bg-[#020204] border-y border-white/5 fade-in-section">
        <div className="text-center mb-16 px-4 max-w-4xl mx-auto relative z-20">
          <span className="text-brand-magenta font-bold tracking-widest uppercase text-xs mb-6 px-5 py-2 rounded-full border border-brand-magenta/30 bg-brand-magenta/10 inline-block shadow-[0_0_20px_rgba(236,72,153,0.2)]">Comunidade de Elite</span>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4">Testemunhos da <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-magenta to-brand-neon">Matrix</span></h2>
          <p className="text-gray-500 text-sm font-medium">↔ Arraste para explorar</p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#020204] to-transparent z-20 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#020204] to-transparent z-20 pointer-events-none"></div>

          <div
            ref={testimonialsRef}
            className="flex gap-6 overflow-x-auto pb-4 px-12 select-none scroll-smooth"
            style={{ scrollbarWidth: 'none', cursor: 'grab' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          >
            {[
              { name: "João Pedro", role: "Arquiteto 3D", text: "A renderização que demorava 4 horas agora leva 20 minutos. A máquina entregue pela Hardware Sale é um monstro absoluto." },
              { name: "Marta Silva", role: "Gamer Competitiva", text: "Cable management perfeito, temperaturas sempre baixas mesmo em sessões de 12 horas. O serviço VIP ao cliente é real." },
              { name: "Carlos Eduardo", role: "Produtor de Vídeo", text: "Atenção ao detalhe incrível. A entrega em Maputo foi no mesmo dia e a instalação impecável. Vale cada metical investido." },
              { name: "Ana Lúcia", role: "Data Scientist", text: "Precisava de 128GB de RAM e uma 4090 para machine learning. A Hardware Sale não só entregou rápido como otimizou a BIOS para estabilidade." },
              { name: "Tiago M.", role: "Entusiasta Tech", text: "Experiência de unboxing de luxo. Sentes que estás a comprar hardware premium. O PC Builder deles ajudou-me a não cometer erros de gargalo." },
              { name: "Ricardo B.", role: "Streamer Pro", text: "Setup de streaming 4K60 montado em tempo recorde. A Amani AI recomendou-me a combinação perfeita de componentes." },
              { name: "Fátima N.", role: "Engenheira de Software", text: "Compilar código em segundos em vez de minutos. Investimento que se paga a cada deploy. Hardware Sale é nível diferente." },
            ].map((test, i) => (
              <div key={i} className="shrink-0 w-[85vw] max-w-[360px] md:w-[420px] md:max-w-none bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-brand-neon/40 transition-all duration-500 group relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-brand-neon"><path d="M14.017 21L16.41 14.174C16.666 13.435 16.8 12.639 16.8 11.804V3H24V11.804C24 15.652 22.846 18.739 20.538 21H14.017ZM1.25 21L3.642 14.174C3.898 13.435 4.027 12.639 4.027 11.804V3H11.227V11.804C11.227 15.652 10.073 18.739 7.765 21H1.25Z"/></svg>
                </div>
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-brand-neon fill-brand-neon" />)}
                </div>
                <p className="text-gray-300 font-medium mb-8 leading-relaxed text-base relative z-10 pointer-events-none">"{test.text}"</p>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-neon to-brand-magenta flex items-center justify-center text-white font-bold text-lg border-2 border-[#020204]">
                    {test.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{test.name}</h4>
                    <p className="text-xs text-brand-neon font-semibold uppercase tracking-widest">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats/Proof Section */}
      <section className="w-full bg-black py-24 border-t border-white/5 relative z-10 overflow-hidden stats-section">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-[100vw] h-[800px] bg-brand-neon/5 blur-[150px] rounded-full pointer-events-none"></div>
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center relative z-10 stats-grid">
            <div className="will-change-transform opacity-0">
              <div className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter">70+</div>
              <div className="text-brand-magenta font-bold uppercase tracking-widest text-[10px]">Setups Entregues</div>
            </div>
            <div className="will-change-transform opacity-0">
              <div className="text-5xl md:text-7xl font-bold text-brand-neon mb-2 tracking-tighter">0%</div>
              <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Taxa de RMA</div>
            </div>
            <div className="will-change-transform opacity-0">
              <div className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter hidden md:block">Tier 1</div>
               <div className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter md:hidden">T1</div>
              <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Fornecedores</div>
            </div>
            <div className="will-change-transform opacity-0">
              <div className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter flex items-center justify-center gap-2">
                4.9 <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Avaliação VIP</div>
            </div>
         </div>
      </section>
    </div>
  );
}
