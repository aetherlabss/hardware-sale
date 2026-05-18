import { Card, CardContent } from "./ui/card";
import { Cpu, Monitor, Zap, ShieldCheck, Gamepad2, Settings, Glasses, Infinity, ThermometerSnowflake, ServerCog } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function BentoGrid() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto px-4 md:px-0">
      {/* Mega Highlight Feature */}
      <Card onClick={() => navigate('/build-of-the-month')} className="md:col-span-2 md:row-span-2 relative overflow-hidden group cursor-pointer border-brand-magenta/20 shadow-2xl bg-brand-dark/40 backdrop-blur-2xl rounded-[2.5rem] transition-all duration-500 hover:border-brand-magenta/40 will-change-transform">
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=1974&auto=format&fit=crop" 
            alt="Elite Build"
            className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent z-[1]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-magenta/5 via-brand-neon/5 to-transparent z-[1] opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <CardContent className="p-10 h-full flex flex-col justify-end relative z-10 min-h-[400px]">
          <div className="w-20 h-20 rounded-3xl bg-brand-magenta/20 flex items-center justify-center mb-6 border border-brand-magenta/40 backdrop-blur-md transform group-hover:-translate-y-3 transition-all duration-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
             <Gamepad2 className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
          </div>
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">Olimpo <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Gaming</span></h3>
          <p className="text-gray-300 text-lg leading-relaxed max-w-md font-medium">Máquinas concebidas para empurrar os limites do 4K a 240Hz, impulsionadas pelas séries RTX 40 e RX 7000. Arquiteturas extremas montadas para imersão total.</p>
          
          <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
             <div className="flex gap-3 flex-wrap">
               <span className="px-5 py-2 rounded-full border border-brand-magenta/40 bg-brand-magenta/20 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_15px_rgba(236,72,153,0.2)]">Ray Tracing</span>
               <span className="px-5 py-2 rounded-full border border-brand-neon/40 bg-brand-neon/20 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_15px_rgba(20,241,149,0.2)]">Path Tracing</span>
             </div>
             <div className="text-right">
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">A partir de</span>
                <span className="text-2xl font-bold text-white">250.000 <span className="text-sm text-brand-magenta">MT</span></span>
             </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Side Featured 1 */}
      <Card onClick={() => navigate('/products?cat=Components&sub=CPU')} className="relative overflow-hidden group cursor-pointer border-white/5 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] transition-all duration-500 hover:border-brand-neon/30 hover:bg-black/60 shadow-lg will-change-transform">
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=2000&auto=format&fit=crop" 
            alt="CPU"
            className="w-full h-full object-cover scale-150 group-hover:scale-100 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-neon/5 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <CardContent className="p-8 flex flex-col justify-between h-full relative z-10 min-h-[220px]">
          <div className="flex justify-between items-start">
             <div className="w-14 h-14 rounded-2xl bg-brand-neon/10 flex items-center justify-center border border-brand-neon/30 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(20,241,149,0.2)]">
               <Cpu className="w-7 h-7 text-brand-neon" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-brand-neon bg-brand-neon/10 px-3 py-1 rounded-full border border-brand-neon/20">Multicore</span>
          </div>
          <div className="mt-6">
            <h4 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-neon transition-colors">Processos HEDT</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-4">Linhas Extreme Edition & Threadripper configuradas para compilação monstruosa.</p>
            <div className="text-brand-neon font-bold text-lg">Value <span className="text-white text-sm">Tier 1</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Side Featured 2 */}
      <Card onClick={() => navigate('/products?cat=Monitores')} className="relative overflow-hidden group cursor-pointer border-white/5 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] transition-all duration-500 hover:border-[#14F195]/30 hover:bg-black/60 shadow-lg will-change-transform">
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1547119957-637f8679db1e?q=80&w=1964&auto=format&fit=crop" 
            alt="UI Design"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#14F195]/5 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <CardContent className="p-8 flex flex-col justify-between h-full relative z-10 min-h-[220px]">
          <div className="flex justify-between items-start">
             <div className="w-14 h-14 rounded-2xl bg-[#14F195]/10 flex items-center justify-center border border-[#14F195]/30 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(20,241,149,0.2)]">
               <Glasses className="w-7 h-7 text-[#14F195]" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-[#14F195] bg-[#14F195]/10 px-3 py-1 rounded-full border border-[#14F195]/20">Monitores</span>
          </div>
          <div className="mt-6">
            <h4 className="text-2xl font-bold text-white mb-2 group-hover:text-[#14F195] transition-colors">Precisão Retina</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-4">Displays OLED & Micro-LED calibrados por hardware para color grading perfeito.</p>
            <div className="text-white font-bold text-lg">A partir <span className="text-[#14F195] text-sm">25.000 MT</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Side Featured 3 (New) */}
      <Card onClick={() => navigate('/products?cat=Components&sub=Cooling')} className="relative overflow-hidden group cursor-pointer border-white/5 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] transition-all duration-500 hover:border-blue-400/30 hover:bg-black/60 shadow-lg xl:mt-0 will-change-transform">
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=2070&auto=format&fit=crop" 
            alt="GPU Cooling"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-blue-400/5 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <CardContent className="p-8 flex flex-col justify-between h-full relative z-10 min-h-[220px]">
          <div className="flex justify-between items-start">
             <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
               <ThermometerSnowflake className="w-7 h-7 text-blue-400" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Cooling</span>
          </div>
          <div className="mt-6">
            <h4 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Sub-Zero Cooling</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-4">Custom Loops e AIOs dimensionados para climas tropicais de 40ºC.</p>
            <div className="text-blue-400 font-bold text-lg">Garantia <span className="text-white text-sm">Vitalícia</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Side Featured 4 (New) */}
      <Card className="relative overflow-hidden group cursor-pointer border-white/5 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] transition-all duration-500 hover:border-orange-400/30 hover:bg-black/60 shadow-lg xl:mt-0 will-change-transform">
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1555616635-640b71bdb185?q=80&w=2070&auto=format&fit=crop" 
            alt="Server Storage"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-orange-400/5 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <CardContent className="p-8 flex flex-col justify-between h-full relative z-10 min-h-[220px]">
          <div className="flex justify-between items-start">
             <ServerCog className="w-10 h-10 text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.3)]" />
             <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400/80 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">Datacenter</span>
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">Workstation AI</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">Nodes com multi-GPUs projetadas para treino profundo de LLMs locais.</p>
          </div>
        </CardContent>
      </Card>

      {/* Wide Bottom 1 */}
      <Card className="md:col-span-2 relative overflow-hidden group cursor-pointer border-white/5 bg-brand-dark/20 backdrop-blur-2xl rounded-[2.5rem] transition-all duration-500 hover:bg-brand-dark/40 shadow-xl will-change-transform">
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1591489378430-ef2f4c626635?q=80&w=2070&auto=format&fit=crop" 
            alt="Power Supply"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute left-0 bottom-0 w-32 h-32 bg-brand-neon/10 blur-[80px] rounded-full mix-blend-screen group-hover:scale-[2] transition-transform duration-700 pointer-events-none"></div>
        <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-8 h-full relative z-10">
          <div className="bg-black/50 p-6 rounded-[1.5rem] border border-white/5 group-hover:border-brand-neon/50 transition-all duration-500 shadow-inner shrink-0">
            <Zap className="w-10 h-10 text-brand-neon animate-pulse" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="text-xl md:text-2xl font-semibold text-white mb-3 tracking-tight">Capacidade Voltagem Absoluta</h4>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed font-medium">Instalamos exclusivamente fontes de classe Titanium/Platinum (1000W+). Ondulações mitigadas no limite do analítico, fornecimento de corrente purificado.</p>
          </div>
        </CardContent>
      </Card>

      {/* Wide Bottom 2 */}
      <Card className="md:col-span-2 relative overflow-hidden group cursor-pointer border-brand-magenta/20 bg-brand-magenta/5 backdrop-blur-2xl rounded-[2.5rem] transition-all duration-500 hover:bg-brand-magenta/10 shadow-xl will-change-transform">
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none text-brand-magenta">
           <Infinity className="w-full h-full opacity-5" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-magenta/5 via-transparent to-transparent z-0 opacity-60 pointer-events-none"></div>
        <CardContent className="p-8 flex flex-col justify-center h-full relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-brand-magenta/10 rounded-[1.5rem] border border-brand-magenta/20 shadow-inner">
               <Settings className="text-brand-magenta w-6 h-6 animate-[spin_4s_linear_infinite]" />
            </div>
            <h4 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Suporte <span className="text-brand-magenta">Infinity</span></h4>
          </div>
          <p className="text-gray-300 leading-relaxed text-sm md:text-base font-medium">
            O hardware não pode falhar, e se falhar, nós estamos lá. A garantia varia de produto, cheque nossas políticas de garantia. Suporte de excelência no conforto da sua localização em Maputo-Cidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
