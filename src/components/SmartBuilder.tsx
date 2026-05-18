import { useState, useEffect } from 'react';
import { usePCBuilder, ComponentItem } from '../hooks/usePCBuilder';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ShoppingCart, AlertTriangle, Lightbulb, CheckCircle2, Settings, Cpu, Loader2, Sparkles, Mic, Bot } from 'lucide-react';
import { useCart } from '../store/useCart';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { logAetherLabsUsage } from '../lib/aiTracking';
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
    if (!SpeechRecognition) { alert("O seu navegador não suporta reconhecimento de voz neural."); return; }
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
        const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
        if (!apiKey) throw new Error("Missing API Key");
        const ai = new GoogleGenAI({ apiKey, vertexai: { project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware', location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1' } as any });
        const prompt = `O utilizador usou o comando de voz no Smart Builder: "${transcript}".
Analise o catálogo disponível e monte a melhor máquina para este pedido.
Catálogo: ${allComponents.map(c => `${c.id}: ${c.name} (${c.priceMT} MT)`).join(', ')}
Retorne APENAS um objeto JSON válido (sem \`\`\`json) com os IDs ideais:
{ "motherboard": "id", "cpu": "id", "ram": "id", "storage": "id", "cooler": "id", "gpu": "id", "psu": "id", "case": "id", "fans": "id" }`;
        const startTime = performance.now();
        const res = await ai.models.generateContent({ model: "gemini-3.1-pro-preview", contents: prompt, config: { temperature: 0.1 } });
        const endTime = performance.now();
        const text = res.text || "{}";
        logAetherLabsUsage(endTime - startTime, prompt, text, res.usageMetadata?.totalTokenCount || Math.ceil(text.length / 4));
        const jsonStr = text.replace(/```json\n/g, '').replace(/```/g, '').trim();
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

  useEffect(() => {
    const parts = [
      selections.selectedCPU?.name,
      selections.selectedGPU?.name,
      selections.selectedRAM?.name,
      selections.selectedMotherboard?.name,
      selections.selectedPSU?.name
    ].filter(Boolean);
    if (parts.length < 2) { setAiFeedback(null); return; }
    
    const cacheKey = 'amani_build_cache_' + [...parts].sort().join('|');
    const cachedResponse = localStorage.getItem(cacheKey);

    if (cachedResponse) {
      setAiFeedback(cachedResponse);
      return;
    }

    const timer = setTimeout(async () => {
      setIsAiThinking(true);
      try {
        const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
        if (!apiKey) throw new Error("Missing API Key");
        const ai = new GoogleGenAI({ apiKey, vertexai: { project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware', location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1' } as any });
        const prompt = `Atue como Amani, a IA consultora de hardware de luxo da Hardware Sale. O utilizador está montando um PC com: ${parts.join(', ')}. Faça uma análise técnica concisa (máx 3 frases) do gargalo, compatibilidade ou excelente combinação destas peças. Fale diretamente com o utilizador com entusiasmo e tom premium.`;
        const startTime = performance.now();
        const res = await ai.models.generateContent({ model: "gemini-3.1-pro-preview", contents: prompt, config: { temperature: 0.6 } });
        const endTime = performance.now();
        const text = res.text || null;
        setAiFeedback(text);
        if (text) localStorage.setItem(cacheKey, text);
        logAetherLabsUsage(endTime - startTime, prompt, text || "");
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
      addItem({ id: part.id, name: part.name, price: part.priceMT, image: part.image, category: part.type === 'peripheral' ? 'Acessório' : 'Componente' });
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
                  <span className="text-brand-neon text-sm font-bold block">{comp.priceMT.toLocaleString()} MT</span>
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

  const selectedItems = [
    selections.selectedMotherboard, selections.selectedCPU, selections.selectedRAM,
    selections.selectedStorage, selections.selectedCooler, selections.selectedGPU,
    selections.selectedPSU, selections.selectedCase, selections.selectedFans,
  ].filter(Boolean).length;

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
  const fpsData = [
    { game: 'Cyberpunk 2077 (4K RT)', base: 85, color: 'bg-yellow-500' },
    { game: 'Warzone (1440p)', base: 220, color: 'bg-green-500' },
    { game: 'Valorant (1080p)', base: 700, color: 'bg-brand-neon' }
  ];

  return (
    <section className="px-6 max-w-7xl mx-auto relative z-10" id="smart-builder">
      <div className="text-center mb-16 relative">
        <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tighter drop-shadow-2xl"><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Smart</span> Builder</h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg font-medium tracking-wide leading-relaxed">Monte o sistema de sonho manualmente ou use a Amani Voice. O nosso algoritmo neural previne gargalos físicos e térmicos em tempo real.</p>
        
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
                        <span className="text-brand-magenta text-sm font-bold block">{comp.priceMT.toLocaleString()} MT</span>
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
                      <span className="text-brand-neon/70 animate-pulse">Neural Engine a validar as especificações cruzadas...</span>
                    ) : aiFeedback ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiFeedback}</ReactMarkdown>
                    ) : (
                      <p>Adicione componentes (CPU, Board, RAM) e a Matriz fará a triagem de gargalos e compatibilidade em tempo real de forma indetetável.</p>
                    )}
                  </div>
                </div>
                {smartUpsell && (
                  <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem] flex gap-4 text-gray-300 text-sm shadow-md">
                    <Lightbulb className="shrink-0 w-6 h-6 text-brand-magenta mt-0.5" />
                    <p className="font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: smartUpsell.replace('Hardware Sale Tips', '<b class="text-brand-magenta">Hardware Sale Tips</b>') }}></p>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
