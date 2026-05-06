import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCart } from '../store/useCart';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, Eye, Zap, Star, ArrowRight, ShoppingCart, Sparkles, Cpu, Monitor, ChevronRight } from 'lucide-react';

export function BuildOfTheMonth() {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [viewers, setViewers] = useState(142);
  const [added, setAdded] = useState(false);

  // Countdown timer to end of month
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulated viewer count animation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(prev => prev + Math.floor(Math.random() * 3) + 1);
      if (viewers > 300) clearInterval(interval);
    }, 15000);
    return () => clearInterval(interval);
  }, [viewers]);

  const handleBuyNow = () => {
    // Add the full build to cart
    const buildItems = [
      { id: 'bom-cpu', name: 'Intel Core i9-14900K', price: 62000, image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&q=80', category: 'Componente', quantity: 1 },
      { id: 'bom-gpu', name: 'NVIDIA RTX 4090 ROG Strix', price: 280000, image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500&q=80', category: 'Componente', quantity: 1 },
      { id: 'bom-ram', name: 'Corsair Dominator 64GB DDR5', price: 38000, image: 'https://images.unsplash.com/photo-1562979314-bee7453e911c?w=500&q=80', category: 'Componente', quantity: 1 },
      { id: 'bom-board', name: 'ASUS ROG Maximus Z790', price: 45000, image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=500&q=80', category: 'Componente', quantity: 1 },
      { id: 'bom-storage', name: 'Samsung 990 Pro 4TB NVMe', price: 32000, image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&q=80', category: 'Componente', quantity: 1 },
      { id: 'bom-psu', name: 'Seasonic Prime TX-1300W', price: 28000, image: 'https://images.unsplash.com/photo-1587202372772-e229f172bb4a?w=500&q=80', category: 'Componente', quantity: 1 },
      { id: 'bom-case', name: 'HYTE Y70 Touch Infinite', price: 35000, image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&q=80', category: 'Componente', quantity: 1 }
    ];
    
    buildItems.forEach(item => addItem(item));
    setAdded(true);
    setTimeout(() => navigate('/checkout'), 1500);
  };

  const individualTotal = 520000;
  const bundlePrice = 350000;
  const savings = individualTotal - bundlePrice;

  const specs = [
    { icon: Cpu, label: 'CPU', value: 'Intel Core i9-14900K' },
    { icon: Zap, label: 'GPU', value: 'NVIDIA RTX 4090 24GB' },
    { icon: Zap, label: 'RAM', value: '64GB DDR5 6400MHz' },
    { icon: Zap, label: 'Storage', value: '4TB NVMe Gen4' },
    { icon: Monitor, label: 'PSU', value: '1300W Titanium' },
    { icon: Zap, label: 'Case', value: 'HYTE Y70 Touch' },
  ];

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto min-h-screen relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] max-w-[100vw] h-[500px] bg-brand-magenta/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-magenta/10 border border-brand-magenta/30 text-brand-magenta font-bold text-[10px] uppercase tracking-widest mb-6">
          <Award size={14} /> Edição Limitada
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter mb-4 drop-shadow-2xl">
          A Máquina <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Dominante</span>
        </h1>
        <p className="text-gray-400 text-lg font-medium max-w-2xl mx-auto mb-2">
          O setup definitivo para creators, developers e gamers que exigem o pico absoluto de performance computacional em Moçambique.
        </p>
        <div className="flex items-center justify-center gap-2 text-brand-neon text-xs font-bold mt-2">
          <Eye size={14} /> {viewers} clientes visualizaram esta oferta nas últimas horas
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left: Hero Image & Timer */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gradient-to-br from-[#0a0a14] to-[#110e1b] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-brand-magenta/20 to-transparent opacity-50 pointer-events-none"></div>
            <div className="w-full aspect-video bg-black/40 flex items-center justify-center p-10 relative">
              <div className="absolute top-6 left-6 bg-red-500 text-white text-[9px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg animate-pulse">
                Oferta Exclusiva
              </div>
              <img 
                src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=800&q=80"
                alt="Build of the Month"
                className="max-w-full max-h-full object-contain mix-blend-lighten drop-shadow-[0_0_60px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform duration-1000"
              />
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="bg-[#0a0a14]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 flex flex-col items-center gap-4 shadow-inner">
            <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <Clock size={14} className="text-brand-magenta" /> Oferta termina em
            </div>
            <div className="flex gap-3 md:gap-6">
              {Object.entries(timeLeft).map(([unit, value]) => (
                <div key={unit} className="flex flex-col items-center">
                  <div className="bg-brand-neon/10 border border-brand-neon/30 rounded-xl px-4 py-3 md:px-6 md:py-4 min-w-[60px] text-center">
                    <span className="text-2xl md:text-4xl font-extrabold text-white tracking-tighter tabular-nums">
                      {String(value).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-2">{unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Pricing & CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#050510]/95 backdrop-blur-3xl border border-brand-magenta/20 rounded-[2.5rem] p-6 md:p-8 shadow-[0_0_60px_rgba(168,85,247,0.15)] sticky top-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-magenta/20 border border-brand-magenta/40 flex items-center justify-center">
                <Award className="text-brand-magenta w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold">Build Premium</h3>
                <div className="text-[9px] uppercase tracking-widest text-brand-magenta font-bold">Desconto Exclusivo</div>
              </div>
            </div>

            {/* Price Comparison */}
            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                <span className="text-gray-400 text-sm">Preço individual das peças</span>
                <span className="text-gray-500 line-through text-sm">{individualTotal.toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                <span className="text-green-400 text-sm font-bold">Economia no Bundle</span>
                <span className="text-green-400 text-sm font-extrabold">-{savings.toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between items-center p-5 bg-gradient-to-r from-brand-neon/10 to-brand-magenta/10 border border-brand-magenta/30 rounded-2xl">
                <span className="text-white text-lg font-extrabold">Preço do Mês</span>
                <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-neon tracking-tighter">
                  {bundlePrice.toLocaleString()} <span className="text-lg text-brand-neon">MT</span>
                </div>
              </div>
            </div>

            {/* Specs Quick View */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {specs.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center gap-2">
                  <Icon size={14} className="text-brand-neon shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">{label}</div>
                    <div className="text-white text-[11px] font-bold truncate">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleBuyNow}
              className={`w-full h-16 rounded-full font-extrabold text-lg flex items-center justify-center gap-3 transition-all shadow-2xl border-0 ${
                added 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-white scale-105 shadow-[0_0_30px_rgba(34,197,94,0.4)]' 
                  : 'bg-gradient-to-r from-brand-neon to-brand-magenta text-white hover:scale-105 shadow-[0_0_40px_rgba(168,85,247,0.4)]'
              }`}
            >
              {added ? (
                <>A Redirecionar...</>
              ) : (
                <><ShoppingCart className="w-5 h-5" /> Reservar Este Setup</>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> 7 máquinas já montadas este mês
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
