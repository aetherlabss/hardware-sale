import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Award, Zap, Monitor, Wrench, MessageCircle, Cpu, HardDrive, Layers, Fan, Power, Box, MemoryStick, Database } from 'lucide-react';
import gsap from 'gsap';

interface Benchmark {
  id: string;
  name: string;
  fps: number;
  details: string;
  color: string;       // e.g. 'from-amber-500 to-red-500'
  barPercent: number;  // 0-100
}

interface BomConfig {
  codename: string;
  badge: string;
  description: string;
  heroImage: string;
  heroLabel: string;
  heroTitle: string;
  heroDesc: string;
  statusLabel: string;
  specs: {
    cpu: string;
    gpu: string;
    motherboard: string;
    ram: string;
    cooler: string;
    case: string;
    psu: string;
    storage: string;
  };
  benchmarks: Benchmark[];
  startingPrice: number;
  whatsappNumber: string;
  enabled: boolean;
}

const DEFAULT_BOM: BomConfig = {
  codename: 'ARCHON',
  badge: 'A Máquina do Mês',
  description: 'Uma máquina pensada para quem quer tudo: 4K com folga, ray tracing sem compromissos e renderização em tempo real sem gargalos.',
  heroImage: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=80',
  heroLabel: 'Conceito Hardware Sale',
  heroTitle: 'Iluminação RGB & Refrigeração Líquida',
  heroDesc: 'Caixa Lian Li com painéis temperados e watercooling integrado de ponta a ponta.',
  statusLabel: 'Sistema Completo',
  specs: {
    cpu: 'Intel Core i9-14900KS',
    gpu: 'ASUS ROG Strix RTX 4090 24GB',
    motherboard: 'ASUS ROG Maximus Z790 Dark Hero',
    ram: 'Corsair Vengeance RGB 64GB DDR5 6000MHz',
    cooler: 'NZXT Kraken Elite 360 RGB LCD',
    case: 'Lian Li O11 Dynamic EVO RGB',
    psu: 'Seasonic Prime PX-1600W Platinum',
    storage: 'Samsung 990 Pro 2TB NVMe M.2',
  },
  benchmarks: [
    { id: 'cyberpunk', name: 'Cyberpunk 2077', fps: 135, details: '4K • DLSS Frame Generation • Ray Tracing Overdrive', color: 'from-amber-500 to-red-500', barPercent: 90 },
    { id: 'valorant',  name: 'Valorant',       fps: 690, details: '1080p • Configurações Competitivas (Low/Medium)',  color: 'from-rose-500 to-red-600', barPercent: 100 },
    { id: 'gta',       name: 'GTA V / FiveM',  fps: 195, details: '4K • Texturas Muito Altas • MSAA 4x',                color: 'from-green-400 to-emerald-600', barPercent: 82 },
    { id: 'warzone',   name: 'COD Warzone 3',  fps: 245, details: '1440p • Foco em Performance • DLSS Off',             color: 'from-cyan-400 to-blue-600', barPercent: 88 },
  ],
  startingPrice: 295000,
  whatsappNumber: '258840000000',
  enabled: true,
};

const SPEC_ICONS = {
  cpu:         { icon: Cpu,         label: 'Processador' },
  gpu:         { icon: Zap,         label: 'Placa Gráfica' },
  motherboard: { icon: Layers,      label: 'Motherboard' },
  ram:         { icon: MemoryStick, label: 'Memória RAM' },
  cooler:      { icon: Fan,         label: 'Refrigeração' },
  case:        { icon: Box,         label: 'Caixa' },
  psu:         { icon: Power,       label: 'Fonte' },
  storage:     { icon: Database,    label: 'Armazenamento' },
};

export function BuildOfTheMonth() {
  const navigate = useNavigate();
  const [bom, setBom] = useState<BomConfig>(DEFAULT_BOM);
  const [activeGameId, setActiveGameId] = useState<string>(DEFAULT_BOM.benchmarks[0].id);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'admin_settings', 'build_of_the_month'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBom(prev => ({
          ...prev,
          ...data,
          specs: { ...prev.specs, ...(data.specs || {}) },
          benchmarks: Array.isArray(data.benchmarks) && data.benchmarks.length > 0 ? data.benchmarks : prev.benchmarks,
        }));
      }
    });
    return () => unsub();
  }, []);

  // Animate on mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.bom-title', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
      gsap.fromTo('.bom-card',  { opacity: 0, y: 24 },  { opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: 'power3.out', stagger: 0.08 });
    });
    return () => ctx.revert();
  }, []);

  const activeGame = bom.benchmarks.find(b => b.id === activeGameId) || bom.benchmarks[0];

  const whatsappLink = `https://wa.me/${bom.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Olá! Tenho interesse na Build do Mês — ${bom.codename}. Pode confirmar disponibilidade e prazo de entrega?`
  )}`;

  if (!bom.enabled) {
    return (
      <div className="py-32 px-6 max-w-4xl mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center">
        <Award className="w-16 h-16 text-gray-700 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-3">A Build do Mês está a ser preparada</h1>
        <p className="text-gray-400 max-w-md">Estamos a finalizar a configuração da próxima máquina destacada. Volta em breve.</p>
      </div>
    );
  }

  return (
    <div className="py-24 sm:py-32 px-4 sm:px-6 max-w-7xl mx-auto min-h-screen relative flex flex-col items-center">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] bg-brand-neon/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/3 w-[50vw] h-[50vw] bg-brand-magenta/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center mb-12 sm:mb-16 bom-title">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 border border-brand-neon/30 text-brand-neon font-bold text-[10px] uppercase tracking-widest mb-6">
          <Award size={14} /> {bom.badge}
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter mb-4 drop-shadow-2xl">
          HARDWARE SALE <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">{bom.codename}</span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed">
          {bom.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full items-start">

        {/* LEFT: Visual + Benchmarks */}
        <div className="lg:col-span-7 space-y-6 bom-card">
          <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-neon/5 to-brand-magenta/5 pointer-events-none" />
            <div className="p-6 sm:p-8 relative z-10">

              {/* Hero image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] border border-white/5 bg-[#030307]">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
                <img
                  src={bom.heroImage}
                  alt={bom.codename}
                  className="w-full h-full object-cover opacity-80"
                  loading="lazy"
                />
                <div className="absolute bottom-5 left-5 right-5 z-20">
                  <div className="text-[10px] font-bold tracking-widest text-brand-neon uppercase mb-1">{bom.heroLabel}</div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{bom.heroTitle}</h3>
                  <p className="text-xs text-gray-300 mt-1 line-clamp-2">{bom.heroDesc}</p>
                </div>
                <span className="absolute top-4 right-4 bg-black/60 border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-white backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {bom.statusLabel}
                </span>
              </div>

              {/* Benchmarks */}
              <div className="mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <Zap className="text-brand-neon w-4 h-4" /> Desempenho real em jogos
                  </h4>
                  <div className="flex flex-wrap gap-1 bg-white/5 border border-white/10 p-1 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                    {bom.benchmarks.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setActiveGameId(b.id)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${activeGameId === b.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/80 border border-white/5 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">FPS médio estimado</div>
                      <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter flex items-baseline gap-1.5">
                        {activeGame.fps} <span className="text-base font-bold text-brand-neon">FPS</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                      <Monitor className="w-5 h-5 text-brand-neon" />
                    </div>
                  </div>

                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full bg-gradient-to-r ${activeGame.color} transition-all duration-700 ease-out shadow-[0_0_10px_currentColor]`}
                      style={{ width: `${Math.max(0, Math.min(100, activeGame.barPercent))}%` }}
                    />
                  </div>

                  <div className="pt-3 border-t border-white/5 flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                      <span>{activeGame.name}</span>
                      <span>Configurações</span>
                    </div>
                    <div className="text-xs font-semibold text-brand-magenta">{activeGame.details}</div>
                  </div>
                </div>

                <p className="mt-3 text-[10px] text-gray-600 leading-relaxed">
                  Valores estimados a partir de benchmarks reais com hardware equivalente. Resultados em produção podem variar com drivers e definições.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Specs sheet + CTA */}
        <div className="lg:col-span-5 space-y-6 bom-card">
          <div className="bg-[#0a0a14]/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8">
            <h3 className="font-bold text-white text-base mb-5 tracking-tight flex items-center gap-2">
              <HardDrive className="text-brand-magenta w-4 h-4" /> Ficha técnica
            </h3>

            <div className="space-y-2.5">
              {(Object.keys(SPEC_ICONS) as Array<keyof typeof SPEC_ICONS>).map((key) => {
                const Icon = SPEC_ICONS[key].icon;
                const value = bom.specs[key] || '—';
                return (
                  <div key={key} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl hover:border-white/15 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-brand-neon/10 flex items-center justify-center shrink-0 border border-brand-neon/15">
                      <Icon className="w-4 h-4 text-brand-neon" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">{SPEC_ICONS[key].label}</div>
                      <div className="text-white text-sm font-bold leading-tight truncate" title={value}>{value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price + CTA */}
            <div className="mt-7 pt-6 border-t border-white/5">
              <div className="flex justify-between items-baseline mb-5">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">A partir de</span>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta mt-1 tracking-tight">
                    {bom.startingPrice.toLocaleString()} MT
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  IVA incluído
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-13 bg-gradient-to-r from-brand-neon to-brand-magenta text-white font-extrabold rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 py-4 text-sm"
                >
                  <MessageCircle className="w-4 h-4" /> Quero esta máquina
                </a>
                <Button
                  onClick={() => navigate('/builder')}
                  variant="outline"
                  className="w-full h-13 border-white/10 hover:border-brand-neon/30 text-gray-300 hover:text-white rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 py-4 text-sm"
                >
                  <Wrench className="w-4 h-4 text-brand-neon" /> Montar variação no Smart Builder
                </Button>
              </div>

              <p className="mt-4 text-[10px] text-gray-600 leading-relaxed text-center">
                Configuração de referência. Podemos adaptar peças e orçamento de acordo com a tua utilização.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
