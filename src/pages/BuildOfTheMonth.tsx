import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCart } from '../store/useCart';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Award, Zap, ShoppingCart, Sparkles, Cpu, Monitor, Play, Wrench, CheckCircle2, ChevronRight } from 'lucide-react';
import gsap from 'gsap';

export function BuildOfTheMonth() {
  const { products, initProducts } = useStore();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<'cyberpunk' | 'valorant' | 'gta' | 'warzone'>('cyberpunk');

  useEffect(() => {
    if (products.length === 0) {
      initProducts();
    }
  }, [products.length, initProducts]);

  // Animate elements on mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.animate-title', 
        { opacity: 0, y: -30 }, 
        { opacity: 1, y: 0, duration: 1, ease: 'power4.out' }
      );
      gsap.fromTo('.animate-card', 
        { opacity: 0, scale: 0.95, y: 30 }, 
        { opacity: 1, scale: 1, y: 0, duration: 1.2, delay: 0.2, ease: 'power3.out', stagger: 0.15 }
      );
    });
    return () => ctx.revert();
  }, [products]);

  // Dynamically extract high-end parts from store or fallback to mock high-end values if not present
  const buildParts = useMemo(() => {
    const getBestOf = (types: string[], fallbackName: string, fallbackPrice: number, fallbackImage: string) => {
      // Find eligible builder ready products matching search categories
      const match = products.find(p => 
        (p as any).isBuilderReady === true && 
        (types.includes((p as any).builderType?.toLowerCase() || '') || 
         types.includes(p.category?.toLowerCase() || '') ||
         types.includes(p.subCategory?.toLowerCase() || ''))
      );
      
      if (match) {
        return {
          id: match.id,
          name: match.name,
          price: Number(match.price),
          image: match.images?.[0] || 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=300&q=80',
          isMock: false
        };
      }
      return {
        id: 'mock-' + fallbackName.toLowerCase().replace(/\s+/g, '-'),
        name: fallbackName,
        price: fallbackPrice,
        image: fallbackImage,
        isMock: true
      };
    };

    return {
      cpu: getBestOf(['cpu'], 'Intel Core i9-14900KS Extreme', 48900, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=300&q=80'),
      gpu: getBestOf(['gpu'], 'ASUS ROG Strix RTX 4090 Gaming 24GB', 149500, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=300&q=80'),
      motherboard: getBestOf(['motherboard', 'placa-mãe'], 'ASUS ROG Maximus Z790 Dark Hero', 34200, 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=300&q=80'),
      ram: getBestOf(['ram', 'memória'], 'Corsair Vengeance RGB 64GB (2x32GB) DDR5 6000MHz', 14500, 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=300&q=80'),
      cooler: getBestOf(['cooler', 'watercooler'], 'NZXT Kraken Elite 360 RGB LCD', 18900, 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=300&q=80'),
      case: getBestOf(['case', 'gabinete'], 'Lian Li O11 Dynamic EVO RGB Black', 12500, 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=300&q=80'),
      psu: getBestOf(['psu', 'fonte'], 'Seasonic Prime PX-1600W Platinum', 24900, 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=300&q=80'),
      storage: getBestOf(['storage', 'armazenamento'], 'Samsung 990 Pro 2TB NVMe M.2 SSD', 11900, 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=300&q=80')
    };
  }, [products]);

  const totalPrice = useMemo(() => {
    return Object.values(buildParts).reduce((acc, current) => acc + current.price, 0);
  }, [buildParts]);

  const handleAddAllToCart = () => {
    Object.values(buildParts).forEach(part => {
      addItem({
        id: part.id,
        name: part.name,
        price: part.price,
        image: part.image,
        category: 'Components'
      });
    });
    navigate('/checkout');
  };

  const handleLoadInBuilder = () => {
    // Collect non-mock IDs
    const ids = Object.values(buildParts)
      .filter(p => !p.isMock)
      .map(p => p.id);
    
    if (ids.length > 0) {
      navigate(`/builder?preset=${ids.join(',')}`);
    } else {
      navigate('/builder');
    }
  };

  const gameBenchmarks = {
    cyberpunk: { name: 'Cyberpunk 2077', fps: 135, details: '4K • DLSS Frame Generation • Ray Tracing Overdrive', color: 'from-amber-500 to-red-500', barWidth: 'w-[90%]' },
    valorant: { name: 'Valorant', fps: 690, details: '1080p • Configurações Competitivas (Low/Medium)', color: 'from-rose-500 to-red-600', barWidth: 'w-[100%]' },
    gta: { name: 'GTA V / FiveM RP', fps: 195, details: '4K • Texturas Muito Altas • MSAA 4x', color: 'from-green-400 to-emerald-600', barWidth: 'w-[82%]' },
    warzone: { name: 'COD Warzone 3.0', fps: 245, details: '1440p • Foco em Performance • DLSS Off', color: 'from-cyan-400 to-blue-600', barWidth: 'w-[88%]' }
  };

  return (
    <div className="py-32 px-6 max-w-7xl mx-auto min-h-screen relative flex flex-col items-center">
      {/* Immersive glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] bg-brand-neon/10 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse duration-[6000ms]"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[50vw] h-[50vw] bg-brand-magenta/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      {/* Animated title header */}
      <div className="text-center mb-16 animate-title">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 border border-brand-neon/30 text-brand-neon font-bold text-[10px] uppercase tracking-widest mb-6">
          <Award size={14} className="animate-spin duration-3000" /> A Máquina Suprema do Mês
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter mb-4 drop-shadow-2xl">
          HARDWARE SALE <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">ARCHON</span>
        </h1>
        <p className="text-gray-400 text-lg font-medium max-w-3xl mx-auto">
          Uma sinergia de hardware implacável. Projetado para quem busca taxa de FPS extrema em 4K e renderização em tempo real sem gargalos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Visual specs and real game telemetry */}
        <div className="lg:col-span-7 space-y-8 animate-card">
          <Card className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-neon/5 to-brand-magenta/5 opacity-100 transition-opacity duration-700"></div>
            <CardContent className="p-8 relative z-10">
              
              {/* Product Visual Concept Banner */}
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] border border-white/5 bg-[#030307] flex items-center justify-center group/img">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                <img 
                  src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=80" 
                  alt="Archon Concept" 
                  className="w-full h-full object-cover opacity-70 group-hover/img:scale-105 transition-transform duration-1000"
                />
                <div className="absolute bottom-6 left-6 z-20 text-left">
                  <div className="text-[10px] font-bold tracking-widest text-brand-neon uppercase mb-1">Conceito Hardware Sale</div>
                  <h3 className="text-2xl font-black text-white leading-none">Matriz de Iluminação Cibernética</h3>
                  <p className="text-xs text-gray-400 mt-1">Lian Li RGB combinada com refrigeração líquida integrada.</p>
                </div>
                <span className="absolute top-4 right-4 bg-black/60 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Sistema Completo
                </span>
              </div>

              {/* Benchmarks Selector and Graphs */}
              <div className="mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h4 className="font-extrabold text-white text-lg flex items-center gap-2">
                    <Zap className="text-brand-neon w-5 h-5" /> Benchmarks em Tempo Real (FPS)
                  </h4>
                  
                  {/* Selectors */}
                  <div className="flex flex-wrap gap-1 bg-white/5 border border-white/10 p-1 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                    {Object.keys(gameBenchmarks).map(key => (
                      <button
                        key={key}
                        onClick={() => setActiveGame(key as any)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${activeGame === key ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {gameBenchmarks[key as keyof typeof gameBenchmarks].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Monitor Display */}
                <div className="bg-black/80 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-inner">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rotate-12 translate-x-10 -translate-y-10 rounded-full"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Média de Performance</div>
                      <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-1.5">
                        {gameBenchmarks[activeGame].fps} <span className="text-lg font-bold text-brand-neon tracking-normal">FPS</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 border border-white/10">
                      <Monitor className="w-5 h-5 text-brand-neon" />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                      <span>{gameBenchmarks[activeGame].name}</span>
                      <span>Configurações</span>
                    </div>
                    <div className="text-xs font-semibold text-brand-magenta truncate">
                      {gameBenchmarks[activeGame].details}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Interactive Parts Lists and CTA Actions */}
        <div className="lg:col-span-5 space-y-8 animate-card">
          <Card className="bg-[#0a0a14]/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl relative">
            <CardContent className="p-8">
              <h3 className="font-extrabold text-white text-xl mb-6 tracking-tight flex items-center gap-2">
                <Cpu className="text-brand-magenta w-5 h-5" /> Componentes da Máquina
              </h3>

              {/* Dynamic Parts List */}
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(buildParts).map(([key, part]) => (
                  <div key={key} className="flex gap-4 p-3 bg-black/40 border border-white/5 rounded-2xl items-center hover:border-white/15 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden shrink-0 border border-white/10 p-1 flex items-center justify-center">
                      <img src={part.image} alt={part.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{key}</div>
                      <div className="text-white text-xs font-bold truncate leading-tight mt-0.5" title={part.name}>{part.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${part.isMock ? 'bg-amber-400' : 'bg-brand-neon'}`}></span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{part.isMock ? 'Sob Encomenda' : 'Em Stock'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-white">{part.price.toLocaleString()} MT</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Price Widget */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex justify-between items-baseline mb-6">
                  <div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Valor do Projeto</span>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta mt-1 tracking-tight">
                      {totalPrice.toLocaleString()} MT
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    IVA Incluído
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={handleAddAllToCart}
                    className="w-full h-14 bg-gradient-to-r from-brand-neon to-brand-magenta text-white font-extrabold rounded-2xl border-0 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" /> Adicionar Build ao Carrinho
                  </Button>
                  
                  <Button 
                    onClick={handleLoadInBuilder}
                    variant="outline"
                    className="w-full h-14 border-white/10 hover:border-brand-neon/30 text-gray-300 hover:text-white rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-4 h-4 text-brand-neon" /> Customizar no Smart Builder
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
