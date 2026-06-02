import { useState, useEffect, useMemo } from 'react';
import { usePCBuilder, ComponentItem } from '../hooks/usePCBuilder';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ShoppingCart, AlertTriangle, Lightbulb, CheckCircle2, Settings, Cpu, Loader2, Sparkles, Mic, Bot } from 'lucide-react';
import { useCart } from '../store/useCart';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { askAI } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function SmartBuilder() {
  const {
    allComponents,
    compatibleMotherboards,
    compatibleCPUs,
    compatibleRAMs,
    selections,
    setters,
    totalPrice,
    totalWattage,
    psuWarning,
    smartUpsell
  } = usePCBuilder();

  const { addItem } = useCart();
  const navigate = useNavigate();

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [stockFilter, setStockFilter] = useState<'Todos' | 'stock' | 'encomenda'>('Todos');
  const { products } = useStore();

  const handleVoiceCommand = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("O teu browser não suporta reconhecimento de voz."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-PT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsAiThinking(true);
      try {
        const prompt = `O utilizador usou o comando de voz no Smart Builder: "${transcript}".
Analisa o catálogo disponível e monta a melhor máquina para este pedido.
Catálogo: ${allComponents.map(c => `${c.id}: ${c.name} (${c.priceMT} MT)`).join(', ')}
Retorna APENAS um objeto JSON válido com os IDs ideais:
{ "motherboard": "id", "cpu": "id", "ram": "id", "storage": "id", "cooler": "id", "gpu": "id", "psu": "id", "case": "id", "fans": "id" }`;
        const { text } = await askAI({ prompt, temperature: 0.1, mode: 'json' });
        const jsonStr = (text || '{}').replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.motherboard) setters.setSelectedMotherboard(allComponents.find(c => c.id === parsed.motherboard) || null);
        if (parsed.cpu) setters.setSelectedCPU(allComponents.find(c => c.id === parsed.cpu) || null);
        if (parsed.ram) setters.setSelectedRAM(allComponents.find(c => c.id === parsed.ram) || null);
        if (parsed.storage) setters.setSelectedStorage(allComponents.find(c => c.id === parsed.storage) || null);
        if (parsed.cooler) setters.setSelectedCooler(allComponents.find(c => c.id === parsed.cooler) || null);
        if (parsed.gpu) setters.setSelectedGPU(allComponents.find(c => c.id === parsed.gpu) || null);
        if (parsed.psu) setters.setSelectedPSU(allComponents.find(c => c.id === parsed.psu) || null);
        if (parsed.case) setters.setSelectedCase(allComponents.find(c => c.id === parsed.case) || null);
        if (parsed.fans) setters.setSelectedFans(allComponents.find(c => c.id === parsed.fans) || null);
        setAiFeedback("Voz processada: Build montada automaticamente de acordo com o teu pedido!");
      } catch (err) {
        console.error(err);
        setAiFeedback("Falha ao processar o comando de voz. Tente manualmente.");
      } finally { setIsAiThinking(false); }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Proposal B: Static Caching Vault for Instant Elite Evaluations
  const AMANI_STATIC_VAULT: Record<string, string> = {
    'rtx 4090|14900k': 'Combinação de elite absoluta! A RTX 4090 e o i9-14900K representam o topo do desempenho mundial. Perfeito para gaming 4K nativo com Ray Tracing e fluxos de Inteligência Artificial pesados. Certifique-se de manter refrigeração de alto nível (360mm+) para evitar thermal throttling.',
    'rtx 4090|7800x3d': 'O monstro supremo dos jogos! O Ryzen 7 7800X3D com sua 3D V-Cache elimina gargalos no processador em jogos competitivos, casando impecavelmente com os 24GB de VRAM da RTX 4090. Excelente eficiência energética e performance máxima.',
    'rtx 4070 ti|14700k': 'Sinergia premium para produtividade e gaming profissional. O i7-14700K lida brilhantemente com multitarefas complexas (Premiere/Blender) enquanto a RTX 4070 Ti domina resoluções 1440p competitivas com taxas de frames acima de 144Hz.',
    'rtx 4080|14900k': 'Poder extremo para criadores e gamers entusiastas. A RTX 4080 entrega estabilidade estonteante em 4K e excelente aceleração de Ray Tracing, enquanto o i9 garante fluidez cirúrgica em renderização 3D e simulações complexas.'
  };

  const selectedItems = [
    selections.selectedMotherboard, selections.selectedCPU, selections.selectedRAM,
    selections.selectedStorage, selections.selectedCooler, selections.selectedGPU,
    selections.selectedPSU, selections.selectedCase, selections.selectedFans,
  ].filter(Boolean).length;

  const [isBuildCardOpen, setIsBuildCardOpen] = useState(false);

  // Proposal C: Dynamic SEO and OpenGraph metatags for instant rich sharing previews
  useEffect(() => {
    if (selectedItems > 0) {
      const partsList = [
        selections.selectedCPU?.name,
        selections.selectedGPU?.name,
        selections.selectedRAM?.name
      ].filter(Boolean).join(' + ');
      
      document.title = `Smart Builder | Setup Personalizado (${totalPrice.toLocaleString()} MT) | Hardware Sale`;
      
      const updateMeta = (property: string, content: string) => {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('property', property);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };
      
      updateMeta('og:title', `🚀 A minha build - ${totalPrice.toLocaleString()} MT`);
      updateMeta('og:description', `Montei este setup no Smart Builder da Hardware Sale: ${partsList || 'Componentes top'}. Vê aqui!`);
      updateMeta('og:image', selections.selectedGPU?.image || selections.selectedCase?.image || 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c');
    } else {
      document.title = "Smart Builder | Monte seu PC Supremo | Hardware Sale";
    }
  }, [selections.selectedCPU, selections.selectedGPU, selections.selectedRAM, totalPrice, selectedItems]);

  // Feature 2: "Upgrades Inteligentes" de Um Clique (Amani Upsell)
  const activeUpsell = useMemo(() => {
    // Check GPU first (highest impact)
    if (selections.selectedGPU) {
      const betterGpu = allComponents.find(c => c.type === 'gpu' && c.priceMT > selections.selectedGPU!.priceMT);
      if (betterGpu) {
        const diff = betterGpu.priceMT - selections.selectedGPU!.priceMT;
        return {
          type: 'gpu',
          current: selections.selectedGPU,
          better: betterGpu,
          diff,
          text: `Suba o seu poder gráfico! Por apenas mais ${diff.toLocaleString()} MT, mude para a ${betterGpu.name} e atinja taxas de 4K nativo @ 144Hz.`
        };
      }
    }
    // Check RAM
    if (selections.selectedRAM) {
      const betterRam = allComponents.find(c => c.type === 'ram' && c.priceMT > selections.selectedRAM!.priceMT);
      if (betterRam) {
        const diff = betterRam.priceMT - selections.selectedRAM!.priceMT;
        return {
          type: 'ram',
          current: selections.selectedRAM,
          better: betterRam,
          diff,
          text: `Aumente a largura de banda! Por apenas mais ${diff.toLocaleString()} MT, mude para ${betterRam.name} para multitarefas e renderização ultra-fluida DDR5.`
        };
      }
    }
    return null;
  }, [selections.selectedGPU, selections.selectedRAM, allComponents]);

  const applyUpsell = () => {
    if (activeUpsell) {
      if (activeUpsell.type === 'gpu') setters.setSelectedGPU(activeUpsell.better);
      if (activeUpsell.type === 'ram') setters.setSelectedRAM(activeUpsell.better);
    }
  };

  useEffect(() => {
    const parts = [
      selections.selectedCPU?.name,
      selections.selectedGPU?.name,
      selections.selectedRAM?.name,
      selections.selectedMotherboard?.name,
      selections.selectedPSU?.name
    ].filter(Boolean);
    if (parts.length < 2) { setAiFeedback(null); return; }
    
    // Look for vault matches first
    const activeCPU = selections.selectedCPU?.name.toLowerCase() || '';
    const activeGPU = selections.selectedGPU?.name.toLowerCase() || '';
    let vaultMatch: string | null = null;
    for (const key of Object.keys(AMANI_STATIC_VAULT)) {
      const [vGpu, vCpu] = key.split('|');
      if (activeGPU.includes(vGpu) && activeCPU.includes(vCpu)) {
        vaultMatch = AMANI_STATIC_VAULT[key];
        break;
      }
    }

    if (vaultMatch) {
      setAiFeedback(vaultMatch);
      return;
    }

    const cacheKey = 'amani_build_cache_' + [...parts].sort().join('|');
    const cachedResponse = localStorage.getItem(cacheKey);

    if (cachedResponse) {
      setAiFeedback(cachedResponse);
      return;
    }

    const timer = setTimeout(async () => {
      setIsAiThinking(true);
      try {
        const prompt = `Actua como Amani, a assistente de hardware da Hardware Sale. O utilizador está a montar um PC com: ${parts.join(', ')}. Faz uma análise técnica concisa (máx 3 frases) sobre gargalos, compatibilidade ou se é uma boa combinação. Fala directamente com o utilizador, com clareza.`;
        const { text } = await askAI({ prompt, temperature: 0.6 });
        setAiFeedback(text || null);
        if (text) localStorage.setItem(cacheKey, text);
      } catch (err) { console.error(err); } finally { setIsAiThinking(false); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [selections.selectedCPU, selections.selectedGPU, selections.selectedRAM, selections.selectedMotherboard, selections.selectedPSU]);

  const handleAddToCart = () => {
    const parts = [
      selections.selectedMotherboard,
      selections.selectedCPU,
      selections.selectedRAM,
      selections.selectedStorage,
      selections.selectedCooler,
      selections.selectedGPU,
      selections.selectedPSU,
      selections.selectedCase,
      selections.selectedFans,
    ].filter(Boolean) as ComponentItem[];
    const allParts = [...parts, ...selections.selectedPeripherals];
    allParts.forEach(part => {
      addItem({ id: part.id, name: part.name, price: part.priceMT, discount: part.discount, image: part.image, category: part.type === 'peripheral' ? 'Acessório' : 'Componente' });
    });
    navigate('/checkout');
  };

  const renderComponentSelect = (
    title: string,
    items: ComponentItem[],
    selected: ComponentItem | null,
    setSelected: (item: ComponentItem | null) => void
  ) => (
    <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h4 className="flex items-center gap-3 text-sm font-semibold text-gray-300 uppercase tracking-widest mb-6">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selected ? 'bg-brand-neon/20 text-brand-neon shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 text-gray-500'}`}>
          {selected ? <CheckCircle2 size={16} /> : title.split('.')[0]}
        </span>
        {title.substring(title.indexOf('.') + 1).trim()}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(comp => {
          const isSelected = selected?.id === comp.id;
          return (
            <div key={comp.id} onClick={() => setSelected(isSelected ? null : comp)}
              className={`relative overflow-hidden p-5 rounded-[2rem] cursor-pointer border transition-all duration-300 group ${isSelected ? 'bg-brand-neon/10 border-brand-magenta shadow-[0_0_30px_rgba(168,85,247,0.15)] scale-[1.02]' : 'bg-black/40 border-white/5 hover:border-brand-neon/30 hover:bg-black/60 shadow-md'}`}
            >
              {isSelected && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-magenta/10 blur-[40px] rounded-full pointer-events-none"></div>}
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-[1.2rem] overflow-hidden shrink-0 opacity-90 group-hover:opacity-100 bg-transparent">
                        <img src={comp.image || 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80'} alt={comp.name}
                          onError={(e) => console.error(`Failed to load image: ${comp.image}`, e)}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 p-2" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                  <span className="font-semibold text-gray-100 block mb-1 text-base leading-tight">{comp.name}</span>
                  {(comp.discount ?? 0) > 0 ? (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 line-through leading-none">{comp.priceMT.toLocaleString()} MT</span>
                      <span className="text-brand-neon text-sm font-bold flex items-center gap-2">
                         {(comp.priceMT - (comp.priceMT * (comp.discount ?? 0) / 100)).toLocaleString()} MT
                         <span className="bg-brand-neon/20 text-brand-neon px-1 rounded-[2px] text-[8px] animate-pulse">-{comp.discount}%</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-brand-neon text-sm font-bold block">{comp.priceMT.toLocaleString()} MT</span>
                  )}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                {comp.specs.map(spec => (
                  <span key={spec} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">{spec}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const totalSteps = 9;
  const progressPercent = Math.round((selectedItems / totalSteps) * 100);

  const getGpuScore = (name: string) => {
    if (name.includes('4090')) return 100;
    if (name.includes('7900 XTX')) return 85;
    if (name.includes('4080')) return 80;
    if (name.includes('4070 Ti')) return 65;
    return 50;
  };
  const getCpuScore = (name: string) => {
    if (name.includes('7800X3D')) return 105;
    if (name.includes('14900K')) return 100;
    if (name.includes('7950X3D')) return 100;
    if (name.includes('14700K')) return 90;
    if (name.includes('13600K')) return 80;
    return 60;
  };
  const calculateFPS = (base: number) => {
    if (!selections.selectedGPU || !selections.selectedCPU) return 0;
    return Math.round(base * (getGpuScore(selections.selectedGPU.name) / 100) * (getCpuScore(selections.selectedCPU.name) / 100));
  };

  const getGamingTier = () => {
    const name = selections.selectedGPU?.name.toLowerCase() || '';
    if (name.includes('4090')) return { tier: 'S+ Extreme', color: 'text-brand-neon' };
    if (name.includes('4080')) return { tier: 'S Ultra', color: 'text-brand-magenta' };
    if (name.includes('4070') || name.includes('7900')) return { tier: 'A High', color: 'text-white' };
    return { tier: 'B Competitivo', color: 'text-gray-400' };
  };

  const getWorkstationTier = () => {
    const cpuName = selections.selectedCPU?.name.toLowerCase() || '';
    const ramName = selections.selectedRAM?.name.toLowerCase() || '';
    if ((cpuName.includes('i9') || cpuName.includes('7950')) && ramName.includes('64gb')) {
      return { tier: 'S+ Divino', color: 'text-brand-neon' };
    }
    if (cpuName.includes('i7') || cpuName.includes('7800') || ramName.includes('32gb')) {
      return { tier: 'S Avançado', color: 'text-brand-magenta' };
    }
    return { tier: 'A Estável', color: 'text-white' };
  };

  const getAiTier = () => {
    const gpuName = selections.selectedGPU?.name.toLowerCase() || '';
    if (gpuName.includes('4090')) return { tier: 'S+ Core (24GB)', color: 'text-brand-neon' };
    if (gpuName.includes('4080')) return { tier: 'S Core (16GB)', color: 'text-brand-magenta' };
    if (gpuName.includes('4070')) return { tier: 'A Accelerated', color: 'text-white' };
    return { tier: 'B Basic', color: 'text-gray-400' };
  };

  const fpsData = [
    { game: 'Cyberpunk 2077 (4K RT)', base: 85, color: 'bg-yellow-500' },
    { game: 'Warzone (1440p)', base: 220, color: 'bg-green-500' },
    { game: 'Valorant (1080p)', base: 700, color: 'bg-brand-neon' }
  ];

  return (
    <section className="px-6 max-w-7xl mx-auto relative z-10" id="smart-builder">
      <div className="text-center mb-16 relative">
        <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tighter drop-shadow-2xl"><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Smart</span> Builder</h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg font-medium tracking-wide leading-relaxed">Monta o teu setup peça a peça — manualmente ou por voz com a Amani. Avisamos-te se houver gargalo de performance ou térmico antes de comprares.</p>
        
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-500">
           {['Todos', 'Em Stock', 'Por Encomenda'].map((f, i) => {
              const val = i === 0 ? 'Todos' : i === 1 ? 'stock' : 'encomenda';
              return (
                 <button 
                    key={f}
                    onClick={() => setStockFilter(val as any)}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full transition-all border ${stockFilter === val ? 'bg-brand-neon text-black border-brand-neon' : 'bg-transparent text-gray-500 border-white/10 hover:text-white'}`}
                 >
                    {f}
                 </button>
              )
           })}
        </div>

        <div className="mt-8 flex justify-center animate-in fade-in zoom-in-95 duration-700">
          <button onClick={handleVoiceCommand}
            className={`group relative flex items-center gap-4 px-8 py-4 rounded-full font-bold text-sm transition-all duration-500 shadow-[0_0_40px_rgba(168,85,247,0.3)] ${isListening ? 'bg-red-500 text-white scale-105 shadow-[0_0_60px_rgba(239,68,68,0.5)]' : 'bg-[#110e1b] border border-brand-neon/30 hover:bg-brand-neon hover:text-black text-brand-neon'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isListening ? 'bg-white/20' : 'bg-brand-neon/20 group-hover:bg-black/20'}`}>
              <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
            </div>
            {isListening ? 'A escutar diretiva...' : 'Amani Voice-to-Build'}
            {!isListening && <span className="absolute -top-2 -right-2 bg-brand-magenta text-white text-[9px] uppercase tracking-widest px-2 py-1 rounded-full shadow-lg border border-brand-magenta/50">Novo</span>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 space-y-4">
          {renderComponentSelect('1. Motherboard (Placa-Mãe)', compatibleMotherboards.filter(c => (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedMotherboard, setters.setSelectedMotherboard)}
          {renderComponentSelect('2. CPU (Processador)', compatibleCPUs.filter(c => (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedCPU, setters.setSelectedCPU)}
          {renderComponentSelect('3. RAM (Memória)', compatibleRAMs.filter(c => (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedRAM, setters.setSelectedRAM)}
          {renderComponentSelect('4. Armazenamento', allComponents.filter(c => c.type === 'storage' && (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedStorage, setters.setSelectedStorage)}
          {renderComponentSelect('5. CPU Cooler', allComponents.filter(c => c.type === 'cooler' && (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedCooler, setters.setSelectedCooler)}
          {renderComponentSelect('6. GPU (Placa Gráfica)', allComponents.filter(c => c.type === 'gpu' && (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedGPU, setters.setSelectedGPU)}
          {renderComponentSelect('7. Fonte de Alimentação', allComponents.filter(c => c.type === 'psu' && (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedPSU, setters.setSelectedPSU)}
          {renderComponentSelect('8. Case (Gabinete)', allComponents.filter(c => c.type === 'case' && (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedCase, setters.setSelectedCase)}
          {renderComponentSelect('9. Fans (Ventoinhas)', allComponents.filter(c => c.type === 'fans' && (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)), selections.selectedFans, setters.setSelectedFans)}

          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h4 className="flex items-center gap-3 text-sm font-semibold text-gray-300 uppercase tracking-widest mb-6">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selections.selectedPeripherals.length > 0 ? 'bg-brand-magenta/20 text-brand-magenta shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-white/5 text-gray-500'}`}>
                {selections.selectedPeripherals.length > 0 ? <CheckCircle2 size={16} /> : '10'}
              </span>
              Periféricos Opcionais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allComponents.filter(c => c.type === 'peripheral' && (stockFilter === 'Todos' || (products.find((p: any) => p.id === c.id) as any)?.status === stockFilter)).map(comp => {
                const isSelected = selections.selectedPeripherals.some(p => p.id === comp.id);
                return (
                  <div key={comp.id}
                    onClick={() => {
                      if (isSelected) { setters.setSelectedPeripherals(selections.selectedPeripherals.filter(p => p.id !== comp.id)); }
                      else { setters.setSelectedPeripherals([...selections.selectedPeripherals, comp]); }
                    }}
                    className={`relative overflow-hidden p-5 rounded-[2rem] cursor-pointer border transition-all duration-300 group ${isSelected ? 'bg-brand-magenta/10 border-brand-magenta shadow-[0_0_30px_rgba(236,72,153,0.15)] scale-[1.02]' : 'bg-black/40 border-white/5 hover:border-brand-magenta/30 hover:bg-black/60 shadow-md'}`}
                  >
                    {isSelected && <div className="absolute top-0 right-0 w-32 max-w-[100vw] h-32 bg-brand-neon/10 blur-[40px] rounded-full pointer-events-none"></div>}
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-[1.2rem] overflow-hidden shrink-0 opacity-90 group-hover:opacity-100 bg-transparent">
                        <img src={comp.image} alt={comp.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 p-2" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="font-semibold text-gray-100 block mb-1 text-base leading-tight">{comp.name}</span>
                        {(comp.discount ?? 0) > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 line-through leading-none">{comp.priceMT.toLocaleString()} MT</span>
                            <span className="text-brand-magenta text-sm font-bold flex items-center gap-2">
                               {(comp.priceMT - (comp.priceMT * (comp.discount ?? 0) / 100)).toLocaleString()} MT
                               <span className="bg-brand-magenta/20 text-brand-magenta px-1 rounded-[2px] text-[8px] animate-pulse">-{comp.discount}%</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-brand-magenta text-sm font-bold block">{comp.priceMT.toLocaleString()} MT</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 relative">
          <Card className="border-white/5 sticky top-28 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_80px_rgba(168,85,247,0.1)] hover:border-brand-neon/30 transition-all duration-500 hover:shadow-[0_0_100px_rgba(168,85,247,0.15)]">
            <CardHeader className="border-b border-white/5 bg-white/5 rounded-t-[2.5rem] p-6">
              <CardTitle className="text-xl text-white font-semibold flex items-center gap-3 tracking-tight">
                <Settings className="w-6 h-6 text-brand-neon" /> Telemetria da Build
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-6 pb-8">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-400 mb-3 tracking-wide">
                  <span className="uppercase">Sincronização</span>
                  <span className="text-brand-neon">{progressPercent}%</span>
                </div>
                <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-brand-neon to-brand-magenta transition-all duration-700 ease-in-out shadow-[0_0_15px_rgba(168,85,247,0.6)]" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold mb-2 tracking-wider">Carga OCV</div>
                  <div className="text-2xl font-mono text-white tracking-tighter">{totalWattage}<span className="text-sm text-brand-neon ml-1">W</span></div>
                </div>
                <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold mb-2 tracking-wider">Custo Atual</div>
                  <div className="text-xl font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">{totalPrice.toLocaleString()} <span className="text-[10px] text-gray-500">MT</span></div>
                </div>
              </div>

              <div className="bg-black/50 border border-white/5 rounded-[1.5rem] p-5 shadow-inner">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-brand-neon" /> Simulador de FPS
                </h4>
                <div className="space-y-4">
                  {fpsData.map(game => {
                    const fps = calculateFPS(game.base);
                    const widthPercent = Math.min(100, (fps / game.base) * 100);
                    return (
                      <div key={game.game}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-300">{game.game}</span>
                          <span className="text-white">{fps > 0 ? `${fps} FPS` : '--'}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${game.color} transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]`} style={{ width: fps > 0 ? `${widthPercent}%` : '0%' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {psuWarning && (
                  <div className="bg-red-900/10 border border-red-500/20 p-5 rounded-[1.5rem] flex gap-4 text-red-200 text-sm shadow-md">
                    <AlertTriangle className="shrink-0 w-6 h-6 text-red-500" />
                    <p className="font-medium leading-relaxed">{psuWarning}</p>
                  </div>
                )}
                <div className={`bg-gradient-to-br border p-5 rounded-[1.5rem] flex flex-col gap-3 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden transition-colors duration-500 ${
                  aiFeedback && aiFeedback.toLowerCase().includes('incompatível') ? 'from-red-500/10 to-red-900/10 border-red-500/30' : 'from-brand-neon/10 to-brand-magenta/5 border-brand-neon/30'
                }`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-magenta/10 blur-[40px] rounded-full pointer-events-none"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      {aiFeedback && aiFeedback.toLowerCase().includes('incompatível') ? <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> : <Bot className="w-5 h-5 text-brand-neon" />}
                      <span className="font-bold text-white text-sm">Hardware Sale Validator</span>
                    </div>
                    {isAiThinking && <Loader2 className="w-4 h-4 text-brand-magenta animate-spin" />}
                  </div>
                  <div className="text-gray-300 text-sm font-medium leading-relaxed relative z-10 min-h-[40px] prose prose-invert max-w-none prose-p:my-1 prose-strong:text-white">
                    {isAiThinking ? (
                      <span className="text-brand-neon/70 animate-pulse">A validar compatibilidade e equilíbrio das peças...</span>
                    ) : aiFeedback ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiFeedback}</ReactMarkdown>
                    ) : (
                      <p>Adiciona pelo menos CPU, motherboard e RAM. Verificamos compatibilidade, gargalos e térmica em tempo real.</p>
                    )}
                  </div>
                </div>
                {smartUpsell && (
                  <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem] flex gap-4 text-gray-300 text-sm shadow-md">
                    <Lightbulb className="shrink-0 w-6 h-6 text-brand-magenta mt-0.5" />
                    <p className="font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: smartUpsell.replace('Hardware Sale Tips', '<b class="text-brand-magenta">Hardware Sale Tips</b>') }}></p>
                  </div>
                )}
                
                {/* Feature 2: Amani dynamic 1-click upsell card */}
                {activeUpsell && (
                  <div className="bg-gradient-to-r from-brand-magenta/15 to-brand-neon/5 border border-brand-magenta/40 p-5 rounded-[1.5rem] flex flex-col gap-4 text-gray-200 text-sm shadow-[0_0_20px_rgba(236,72,153,0.15)] relative overflow-hidden group/upsell animate-pulse duration-3000">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-neon/15 blur-[30px] rounded-full pointer-events-none" />
                    <div className="flex gap-3 items-start">
                      <Sparkles className="shrink-0 w-6 h-6 text-brand-magenta animate-spin duration-3000" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-magenta block mb-1">Amani Upsell Recomendado</span>
                        <p className="font-semibold leading-relaxed text-xs">{activeUpsell.text}</p>
                      </div>
                    </div>
                    <button 
                      onClick={applyUpsell}
                      className="w-full py-2.5 rounded-xl bg-brand-magenta hover:bg-brand-neon text-white hover:text-black font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Fazer Upgrade por +{activeUpsell.diff.toLocaleString()} MT
                    </button>
                  </div>
                )}
              </div>

              <Button
                className={`w-full h-16 text-base font-semibold border-0 transition-all duration-500 rounded-[1.5rem] mt-4 ${progressPercent < 100 ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200 hover:scale-[1.02] shadow-xl hover:shadow-white/20'}`}
                onClick={handleAddToCart}
                disabled={progressPercent < 100}
              >
                <ShoppingCart className={`mr-2 w-5 h-5 ${progressPercent === 100 ? 'text-black' : ''}`} /> {progressPercent < 100 ? 'Seleção Incompleta' : 'Finalizar e Encomendar'}
              </Button>

              {selectedItems > 0 && (
                <button
                  onClick={() => setIsBuildCardOpen(true)}
                  className="w-full h-12 mt-3 rounded-[1.5rem] border border-brand-neon/30 bg-transparent text-brand-neon hover:bg-brand-neon/10 font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" /> Gerar Ficha de Build (Partilhável)
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Matrix Build Card Modal */}
      {isBuildCardOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="relative bg-[#050508] border border-brand-neon/30 rounded-[3rem] w-full max-w-lg p-6 sm:p-8 shadow-[0_0_80px_rgba(20,241,149,0.25)] flex flex-col gap-6 overflow-hidden">
            {/* Ambient glows inside modal */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-neon/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-magenta/10 blur-[80px] rounded-full pointer-events-none" />
            
            {/* Header */}
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-neon">Ficha resumo da build</span>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase mt-1">Hardware Sale Build</h3>
              </div>
              <button 
                onClick={() => setIsBuildCardOpen(false)}
                className="w-10 h-10 rounded-full border border-white/10 hover:border-brand-neon/50 text-gray-400 hover:text-white flex items-center justify-center transition-all bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Spec RPG Sheet */}
            <div className="border border-white/5 bg-black/60 rounded-[2rem] p-5 sm:p-6 relative z-10 flex flex-col gap-4 shadow-inner">
              <div className="text-center pb-4 border-b border-white/5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500">Nome da Build</span>
                <h4 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta tracking-wide mt-0.5">HARDWARE SALE — CUSTOM BUILD</h4>
              </div>

              {/* Tiers Grid */}
              <div className="grid grid-cols-3 gap-3 text-center my-2">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Gaming</span>
                  <div className={`text-xs font-black uppercase mt-1 ${getGamingTier().color}`}>{getGamingTier().tier}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Workstation</span>
                  <div className={`text-xs font-black uppercase mt-1 ${getWorkstationTier().color}`}>{getWorkstationTier().tier}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">AI Engine</span>
                  <div className={`text-xs font-black uppercase mt-1 ${getAiTier().color}`}>{getAiTier().tier}</div>
                </div>
              </div>

              {/* Hardware checklist */}
              <div className="space-y-2.5 text-xs font-medium">
                {selections.selectedCPU && (
                  <div className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">PROCESSADOR</span>
                    <span className="text-white truncate max-w-[190px] font-semibold">{selections.selectedCPU.name}</span>
                  </div>
                )}
                {selections.selectedGPU && (
                  <div className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">PLACA GRÁFICA</span>
                    <span className="text-white truncate max-w-[190px] font-semibold">{selections.selectedGPU.name}</span>
                  </div>
                )}
                {selections.selectedRAM && (
                  <div className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">MEMÓRIA</span>
                    <span className="text-white truncate max-w-[190px] font-semibold">{selections.selectedRAM.name}</span>
                  </div>
                )}
                {selections.selectedMotherboard && (
                  <div className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">MOTHERBOARD</span>
                    <span className="text-white truncate max-w-[190px] font-semibold">{selections.selectedMotherboard.name}</span>
                  </div>
                )}
              </div>

              {/* Value and energy */}
              <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs font-semibold">
                <div>
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-black">Consumo Estimado</span>
                  <span className="text-white font-mono">{totalWattage} W</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-black">Investimento Total</span>
                  <span className="text-brand-neon font-mono font-black text-lg">{totalPrice.toLocaleString()} MT</span>
                </div>
              </div>
            </div>

            {/* Neon QR Code and copy link */}
            <div className="flex gap-4 items-center bg-white/5 p-4 rounded-[2rem] border border-white/10 relative z-10">
              <div className="w-20 h-20 bg-brand-neon/10 rounded-2xl border border-brand-neon/30 p-2 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(20,241,149,0.15)] relative overflow-hidden group/qr">
                {/* Glowing neon simulation for QR Code */}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-neon/20 via-transparent to-brand-magenta/20 animate-pulse duration-2000" />
                <svg viewBox="0 0 100 100" className="w-full h-full text-brand-neon relative z-10" fill="currentColor">
                  <path d="M5,5 h30 v30 h-30 z M12,12 h16 v16 h-16 z M5,65 h30 v30 h-30 z M12,72 h16 v16 h-16 z M65,5 h30 v30 h-30 z M72,12 h16 v16 h-16 z M45,45 h10 v10 h-10 z M55,55 h10 v10 h-10 z M45,65 h10 v10 h-10 z M75,45 h15 v15 h-15 z M65,75 h10 v10 h-10 z M85,85 h10 v10 h-10 z" />
                </svg>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Partilhar com a Comunidade</span>
                <p className="text-xs text-gray-300 mt-1 font-semibold leading-relaxed">Mostre o seu poder de escolha para amigos nas redes e ganhe prestígio com a sua build.</p>
              </div>
            </div>

            {/* Sharing Action CTA */}
            <div className="flex gap-3 relative z-10">
              <button 
                onClick={() => {
                  const parts = [
                    selections.selectedMotherboard?.id,
                    selections.selectedCPU?.id,
                    selections.selectedRAM?.id,
                    selections.selectedStorage?.id,
                    selections.selectedCooler?.id,
                    selections.selectedGPU?.id,
                    selections.selectedPSU?.id,
                    selections.selectedCase?.id,
                    selections.selectedFans?.id
                  ].filter(Boolean).join(',');
                  const link = `${window.location.origin}/builder?preset=${parts}`;
                  navigator.clipboard.writeText(link);
                  alert("Link da build copiado!");
                }}
                className="flex-1 py-4 bg-gradient-to-r from-brand-neon to-brand-magenta text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                Copiar Preset Link
              </button>
              <button 
                onClick={() => window.print()}
                className="px-5 py-4 border border-white/10 hover:border-brand-neon/50 text-white rounded-2xl text-xs font-bold transition-all bg-white/5 cursor-pointer"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
