import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RefreshCcw, Cpu, Loader2, Award, ArrowRight, AlertOctagon, UploadCloud, Trash2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useCart } from '../store/useCart';
import { useStore } from '../store/useStore';
import { logAetherLabsUsage } from '../lib/aiTracking';
import { useNavigate } from 'react-router-dom';

export function Upgrade() {
  const [formData, setFormData] = useState({
    processor: '',
    gpu: '',
    ram: '',
    motherboard: '',
    coolerType: 'Air Cooler',
    coolerModel: '',
    condition: 'Novo',
    usageTime: '',
    problems: ''
  });

  const [images, setImages] = useState<{ url: string; file: File; base64: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [voucher, setVoucher] = useState<{ value: number; explanation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { applyVoucher } = useCart();
  const { products } = useStore();
  const navigate = useNavigate();

  const getUpgradePath = () => {
    if (!voucher || products.length === 0) return [];
    
    // Suggest items that cost MORE than the voucher, so the voucher feels like a massive discount
    // We try to recommend GPUs or CPUs as they are the primary upgrade items
    const upgrades = products.filter(p => 
      (p.category === 'Components' || p.category === "Desktop's") &&
      p.price > voucher.value
    )
    .sort((a, b) => a.price - b.price)
    .slice(0, 2);

    return upgrades;
  };
  
  const upgradePath = getUpgradePath();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 3) {
      setError("Máximo de 3 imagens permitidas.");
      return;
    }

    Array.from(files).forEach((file: File) => {
      if (file.size > 4 * 1024 * 1024) { // 4MB Limit
        setError("Cada imagem deve ter menos de 4MB.");
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        setImages(prev => [...prev, { url: URL.createObjectURL(file), file, base64 }]);
      };
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.processor || !formData.gpu || !formData.ram) {
       setError("Preencha as especificações principais (CPU, GPU e RAM).");
       return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
      if (!apiKey) throw new Error("AetherLabs API Key missing");

      const ai = new GoogleGenAI({ 
        apiKey,
        vertexai: { project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware', location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1' } as any
      });

      let promptText = `
Analise rigorosamente este hardware submetido para Trade-in (retoma) no mercado de Moçambique:
Processador: ${formData.processor}
Placa Gráfica: ${formData.gpu}
Memória RAM: ${formData.ram}
Placa-Mãe: ${formData.motherboard || 'Não especificada'}
Cooler: ${formData.coolerType} - ${formData.coolerModel || 'Genérico'}
Estado de Conservação: ${formData.condition}
`;

      if (formData.condition === 'Usado') {
        promptText += `\nTempo de Uso Estimado: ${formData.usageTime || 'Desconhecido'}
Problemas ou Defeitos Reportados: ${formData.problems || 'Nenhum reportado'}`;
      }

      promptText += `\n\nConsidere uma desvalorização realista de mercado (30% a 50% dependendo do tempo de uso e defeitos) para garantir margem de lucro à loja na revenda. Use como base a moeda Metical (MT) considerando câmbio atual.
Se as fotos anexadas revelarem danos estruturais, pó extremo ou oxidação, desvalorize fortemente.
Retorne APENAS um objeto JSON válido estritamente com este formato:
{
  "estimatedValue": número_inteiro_representando_meticais,
  "explanation": "Explicação técnica super concisa de 10-15 palavras justificando a desvalorização ou valorização."
}`;

      // Add images if present
      const contentsParts: any[] = [{ text: promptText }];
      
      images.forEach(img => {
         const mimeType = img.file.type;
         const data = img.base64.split(',')[1];
         contentsParts.push({ inlineData: { mimeType, data } });
      });

      const startTime = performance.now();
      const res = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: contentsParts,
        config: { temperature: 0.1 } // Factual
      });
      const endTime = performance.now();

      const text = res.text || "{}";
      const totalTokens = res.usageMetadata?.totalTokenCount || Math.ceil(text.length / 4);
      logAetherLabsUsage(endTime - startTime, promptText, text, totalTokens);
      
      const jsonStr = text.replace(/```json\n/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      if (parsed.estimatedValue !== undefined && parsed.explanation) {
        setVoucher({ value: Number(parsed.estimatedValue), explanation: parsed.explanation });
      } else {
        throw new Error("Invalid format from AI");
      }

    } catch (err) {
      console.error(err);
      setError("Falha na avaliação neural. Verifique os dados inseridos ou tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyVoucher = () => {
    if (voucher) {
      const code = `MTX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      applyVoucher({ code, value: voucher.value });
      navigate('/builder');
    }
  };

  return (
    <div className="py-32 px-6 max-w-5xl mx-auto min-h-screen relative flex flex-col items-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-neon/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-neon/10 border border-brand-neon/30 text-brand-neon font-bold text-[10px] uppercase tracking-widest mb-6">
          <RefreshCcw size={14} /> Sistema de Retomas Integrado
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter mb-4 drop-shadow-2xl">
          Hardware Sale <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">Upgrade</span>
        </h1>
        <p className="text-gray-400 text-lg font-medium max-w-3xl mx-auto">
          Submeta as especificações e fotos reais da sua máquina. A inteligência AetherLabs (Amani 3) analisará os componentes, desgaste e cruzará com valores de mercado em tempo real.
        </p>
      </div>

      {!voucher ? (
        <Card className="w-full bg-[#0a0a14]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          
          <CardContent className="p-8 md:p-12 relative z-10">
            <form onSubmit={handleEvaluate} className="flex flex-col gap-8">
              
              {/* Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Processador (CPU)</label>
                   <Input required value={formData.processor} onChange={e => handleInputChange('processor', e.target.value)} placeholder="Ex: Intel Core i7-10700K" className="bg-black/50 border-white/10 h-14 rounded-2xl text-white placeholder:text-gray-600 focus:border-brand-neon transition-colors" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Placa Gráfica (GPU)</label>
                   <Input required value={formData.gpu} onChange={e => handleInputChange('gpu', e.target.value)} placeholder="Ex: NVIDIA RTX 3070 8GB" className="bg-black/50 border-white/10 h-14 rounded-2xl text-white placeholder:text-gray-600 focus:border-brand-neon transition-colors" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Memória RAM</label>
                   <Input required value={formData.ram} onChange={e => handleInputChange('ram', e.target.value)} placeholder="Ex: 32GB (2x16) DDR4 3200MHz" className="bg-black/50 border-white/10 h-14 rounded-2xl text-white placeholder:text-gray-600 focus:border-brand-neon transition-colors" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Motherboard (Placa-Mãe)</label>
                   <Input value={formData.motherboard} onChange={e => handleInputChange('motherboard', e.target.value)} placeholder="Ex: ASUS ROG Strix Z490-E" className="bg-black/50 border-white/10 h-14 rounded-2xl text-white placeholder:text-gray-600 focus:border-brand-neon transition-colors" />
                 </div>
              </div>

              {/* Cooling & Condition */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                 <div>
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Tipo de Cooler</label>
                   <select value={formData.coolerType} onChange={e => handleInputChange('coolerType', e.target.value)} className="w-full bg-black/50 border border-white/10 h-14 rounded-2xl px-4 font-bold text-white focus:outline-none focus:border-brand-neon transition-colors">
                     <option value="Air Cooler">Air Cooler (A Ar)</option>
                     <option value="AIO Liquid Cooler">AIO Liquid Cooler</option>
                     <option value="Custom Loop">Custom Loop Watercooling</option>
                     <option value="Stock Cooler">Cooler de Origem (Stock)</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Modelo do Cooler</label>
                   <Input value={formData.coolerModel} onChange={e => handleInputChange('coolerModel', e.target.value)} placeholder="Ex: NZXT Kraken 240" className="bg-black/50 border-white/10 h-14 rounded-2xl text-white placeholder:text-gray-600 focus:border-brand-neon transition-colors" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Estado de Conservação</label>
                   <select value={formData.condition} onChange={e => handleInputChange('condition', e.target.value)} className="w-full bg-black/50 border border-white/10 h-14 rounded-2xl px-4 font-bold text-brand-neon focus:outline-none focus:border-brand-neon transition-colors">
                     <option value="Novo">Praticamente Novo (Sem Marcas)</option>
                     <option value="Usado">Usado (Marcas Normais)</option>
                     <option value="Usado com Defeitos">Com Problemas Físicos/Térmicos</option>
                   </select>
                 </div>
              </div>

              {/* Used Details */}
              {formData.condition !== 'Novo' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-brand-magenta/5 border border-brand-magenta/20 rounded-[2rem] animate-in fade-in slide-in-from-top-4">
                    <div>
                       <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Tempo de Uso</label>
                       <Input value={formData.usageTime} onChange={e => handleInputChange('usageTime', e.target.value)} placeholder="Ex: 2 anos e meio" className="bg-black/50 border-white/10 h-14 rounded-2xl text-white placeholder:text-gray-500 focus:border-brand-magenta transition-colors" />
                    </div>
                    <div>
                       <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Problemas a Declarar</label>
                       <Input value={formData.problems} onChange={e => handleInputChange('problems', e.target.value)} placeholder="Ex: Ventoinha do CPU faz barulho, pó..." className="bg-black/50 border-white/10 h-14 rounded-2xl text-white placeholder:text-gray-500 focus:border-brand-magenta transition-colors" />
                    </div>
                 </div>
              )}

              {/* Image Upload Area */}
              <div className="pt-4">
                 <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                   Evidências Fotográficas <span className="bg-white/10 px-2 py-0.5 rounded-full text-[9px] text-white">IA Vision Ready</span>
                 </label>
                 <div className="flex flex-wrap gap-4">
                    {images.map((img, i) => (
                      <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden border border-white/20 group">
                         <img src={img.url} className="w-full h-full object-cover" alt="Uploaded hardware" />
                         <button type="button" onClick={() => handleRemoveImage(i)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="text-white w-6 h-6" />
                         </button>
                      </div>
                    ))}
                    {images.length < 3 && (
                      <label className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/20 hover:border-brand-neon hover:bg-brand-neon/5 transition-colors cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-brand-neon">
                         <UploadCloud className="w-6 h-6 mb-2" />
                         <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                         <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                 </div>
                 <p className="text-[10px] text-gray-500 mt-3 ml-2 font-medium">Anexe até 3 fotos claras do interior e exterior do equipamento. A IA analisará oxidação, pó e integridade física.</p>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-sm font-bold text-center">
                  {error}
                </div>
              )}

              <Button 
                type="submit"
                disabled={loading || !formData.processor || !formData.gpu || !formData.ram}
                className="mt-4 h-16 rounded-full bg-gradient-to-r from-brand-neon to-brand-magenta text-white border-0 font-extrabold text-lg transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
              >
                {loading ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> A Analisar Telemetria & Visão...</>
                ) : (
                  <><Cpu className="w-6 h-6" /> Obter Avaliação Neural Amani 3</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full animate-in zoom-in-95 duration-700 flex flex-col items-center mt-10">
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-brand-neon to-brand-magenta p-1.5 rounded-[3rem] shadow-[0_0_100px_rgba(168,85,247,0.5)]">
            <div className="bg-[#050510] rounded-[2.8rem] p-10 md:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shine_3s_infinite_linear] pointer-events-none"></div>
              
              <div className="w-24 h-24 bg-gradient-to-tr from-brand-neon to-brand-magenta rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(168,85,247,0.6)] relative z-10">
                <Award className="w-12 h-12 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-300 uppercase tracking-widest mb-3 relative z-10">Voucher AetherLabs Oficial</h3>
              <div className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tighter mb-8 drop-shadow-2xl relative z-10">
                {voucher.value.toLocaleString()} <span className="text-3xl text-brand-neon">MT</span>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8 relative z-10 shadow-inner text-left">
                 <h4 className="text-[10px] font-extrabold text-brand-neon uppercase tracking-widest mb-2 flex items-center gap-2"><Cpu size={14}/> Amani 3 Verdict</h4>
                 <p className="text-gray-300 font-medium leading-relaxed text-sm">
                   {voucher.explanation}
                 </p>
              </div>

              {/* Upgrade Path Suggestions */}
              {upgradePath.length > 0 && (
                <div className="mb-10 text-left relative z-10 animate-in fade-in slide-in-from-bottom-4 delay-500 duration-700">
                   <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <ArrowRight size={14} className="text-brand-magenta" /> Upgrade Path Recomendado
                   </h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {upgradePath.map(product => {
                       const discountedPrice = Math.max(0, product.price - voucher.value);
                       return (
                         <div key={product.id} className="bg-black/60 border border-white/10 rounded-2xl p-4 flex gap-4 items-center group hover:border-brand-magenta/50 transition-all cursor-pointer" onClick={() => navigate('/products')}>
                            <img src={product.images?.[0] || product.image} alt={product.name} className="w-12 h-12 object-contain" />
                            <div className="flex-1 min-w-0">
                               <div className="text-white text-xs font-bold truncate">{product.name}</div>
                               <div className="text-gray-500 text-[10px] line-through">{product.price.toLocaleString()} MT</div>
                               <div className="text-brand-magenta text-sm font-extrabold">{discountedPrice.toLocaleString()} MT</div>
                            </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                <Button 
                  onClick={() => setVoucher(null)}
                  variant="outline"
                  className="h-14 px-8 rounded-full border-white/10 text-white hover:bg-white/5 transition-all font-bold"
                >
                  Submeter Novo
                </Button>
                <Button 
                  onClick={handleApplyVoucher}
                  className="h-14 px-8 rounded-full bg-white text-black hover:bg-gray-200 transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] font-extrabold flex items-center gap-2"
                >
                  Aplicar na Nova Build <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
