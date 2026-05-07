import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useCart } from '../store/useCart';
import { useStore } from '../store/useStore';
import { ShoppingCart, CheckCircle2, X, ChevronLeft, ChevronRight, Zap, Settings, Star, Sparkles, Filter, Scale } from 'lucide-react';
import { getAssetUrl } from '../lib/assets';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { logAetherLabsUsage } from '../lib/aiTracking';

gsap.registerPlugin(useGSAP);

import '@google/model-viewer';

export const mockProducts = [
  // Desktop's (PCs)
  { 
    id: 'pc1', 
    name: 'Workstation Zenith 9', 
    price: 350000, 
    category: "Desktop's", 
    image: getAssetUrl('/hyte-y70-touch.jpg'),
    images: [
      getAssetUrl('/hyte-y70-touch.jpg')
    ],
    glbModel: 'https://modelviewer.dev/shared-assets/models/glTF-Sample-Models/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb', // Holographic Helmet placeholder for AR
    desc: 'Montagem de PC Extrema. Custom Loop Watercooling, RTX 4090, i9-14900K.', 
    tags: ['Watercooled', '4K 240Hz', 'Workstation'],
    specs: {
      Cpu: 'Intel Core i9-14900K (24 Cores / 32 Threads)',
      Gpu: 'NVIDIA GeForce RTX 4090 24GB GDDR6X',
      Ram: '64GB (2x32GB) DDR5 6400MHz',
      Storage: '4TB NVMe PCIe 4.0 (Aprox 7400MB/s)',
      Motherboard: 'Z790 E-ATX Premium',
      Psu: '1200W 80+ Platinum ATX 3.0',
      Servicos: 'Montagem de PC, Teste de Stress, Diagnóstico'
    }
  },
  { 
    id: 'm1', 
    name: 'OLED Master 49"', 
    price: 125000, 
    category: 'Displays', 
    image: getAssetUrl('/oled49.webp'),
    images: [
      getAssetUrl('/oled49.webp')
    ],
    desc: 'Ultrawide OLED, 0.03ms, 240Hz. Imersão absurda para Gamers e Workstation.', 
    tags: ['OLED', 'Ultrawide'],
    specs: {
      Diagonal: '49 polegadas (Super Ultrawide)',
      Resolucao: '5120 x 1440 (DQHD)',
      Tecnologia: 'QD-OLED',
      Taxa: '240Hz',
      Resposta: '0.03ms (GtG)',
      Curvatura: '1800R'
    }
  },
  { 
    id: 'c1', 
    name: 'ROG Matrix RTX 4090', 
    price: 280000, 
    category: 'Components', 
    image: getAssetUrl('/rog4090.jpg'),
    images: [
      getAssetUrl('/rog4090.jpg')
    ],
    desc: 'Venda de Hardware: A placa gráfica mais potente já construída.', 
    tags: ['Venda Hardware', 'Enthusiast', 'Liquid Metal'],
    specs: {
      VRAM: '24GB GDDR6X',
      Interface: 'PCIe 4.0 x16',
      Cooling: 'Built-in 360mm AIO Custom Loop',
      Boost_Clock: '2700 MHz+',
      Warranty: 'Diagnóstico e Assistência Local'
    }
  },
  { 
    id: 'c2', 
    name: 'Intel Core i9-14900KS', 
    price: 62000, 
    category: 'Components', 
    image: getAssetUrl('/i9.jpg'),
    images: [
      getAssetUrl('/i9.jpg')
    ],
    desc: 'Venda de Hardware: Processador de 24 Núcleos chegando até 6.2GHz.', 
    tags: ['6.2GHz', '24 Cores'],
    specs: {
      Cores: '24 (8P + 16E)',
      Threads: '32',
      Clock_Base: '3.2 GHz',
      Clock_Turbo: '6.2 GHz',
      TDP: '253W Base'
    }
  },
  { 
    id: 'm2', 
    name: 'Alienware 34" QD-OLED', 
    price: 85000, 
    category: 'Monitores', 
    image: getAssetUrl('/alien34.jpg'),
    images: [
      getAssetUrl('/alien34.jpg')
    ],
    desc: 'Cores vibrantes e pretos verdadeiros para os exigentes.', 
    tags: ['QD-OLED', '175Hz', 'Curved', 'Monitores'],
    specs: {
      Diagonal: '34 polegadas (Ultrawide)',
      Resolucao: '3440 x 1440 (UWQHD)',
      Tecnologia: 'QD-OLED',
      Taxa: '175Hz',
      Resposta: '0.1ms (GtG)'
    }
  },
  {
    id: 'g1',
    name: 'Keycaps Artisan Neon',
    price: 3500,
    category: 'Gadgets',
    image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=500',
    images: [ 'https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=500' ],
    desc: 'Keycaps premium para teclados mecânicos, com brilho neon reativo.',
    tags: ['Keycaps', 'Modding'],
    specs: {
      Material: 'PBT Double-shot',
      Perfil: 'Cherry Profile',
      Compatibilidade: 'Switches Cherry MX'
    }
  }
];

import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Product Modal Component
function ProductModal({ 
  product, 
  onClose,
  onNext,
  onPrev
}: { 
  product: any, 
  onClose: () => void,
  onNext?: () => void,
  onPrev?: () => void,
  key?: React.Key
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    setImgIndex(0);
    setAiTip(null);

    const getTip = async () => {
       setIsAiLoading(true);
       try {
          const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
          if (!apiKey) return;
          const ai = new GoogleGenAI({ 
            apiKey,
            vertexai: { project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware', location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1' }
          });
          const prompt = `Atue como Amani, a assistente IA da loja Hardware Sale. O utilizador está a visualizar o produto "${product.name}" (Categoria: ${product.category}). Faça uma recomendação "God Level" extremamente concisa (1 ou 2 frases curtas) sobre que outro acessório ou peça ele deveria comprar junto, ou elogie a escolha de forma premium.`;
          
          const startTime = performance.now();
          const res = await ai.models.generateContent({
              model: "gemini-3.1-pro-preview",
              contents: prompt,
              config: { temperature: 0.7 }
          });
          const endTime = performance.now();
          setAiTip(res.text);
          logAetherLabsUsage(endTime - startTime, prompt, res.text || "");
       } catch (err) {
          console.error(err);
          setAiTip("Recomendamos emparelhar este item com os nossos cabos premium para a melhor performance.");
       } finally {
          setIsAiLoading(false);
       }
    };
    
    // debounce slightly
    const t = setTimeout(getTip, 800);
    return () => clearTimeout(t);
  }, [product.id, product.name, product.category]);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-3xl transition-all duration-500 animate-in fade-in zoom-in-95">
      {/* Global Navigation Arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-12 z-[60] pointer-events-none">
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className="p-5 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-2xl border border-white/10 transition-all duration-300 pointer-events-auto group hover:scale-110 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          <ChevronLeft className="w-8 h-8 group-active:scale-90 transition-transform" strokeWidth={1.5} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className="p-5 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-2xl border border-white/10 transition-all duration-300 pointer-events-auto group hover:scale-110 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          <ChevronRight className="w-8 h-8 group-active:scale-90 transition-transform" strokeWidth={1.5} />
        </button>
      </div>

      <div className="absolute inset-0 max-w-6xl w-full bg-[#0a0a14] border border-white/10 rounded-[3rem] mx-auto my-auto max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-[0_0_120px_rgba(168,85,247,0.15)] relative z-[55]">
        <button onClick={onClose} className="absolute top-8 right-8 z-50 w-12 h-12 flex items-center justify-center bg-black/50 backdrop-blur-xl hover:bg-white/10 text-white border border-white/10 transition-colors rounded-full shadow-2xl">
          <X size={24} strokeWidth={1.5} />
        </button>

        {/* Gallery Section */}
        <div className="w-full md:w-1/2 relative flex flex-col p-8 bg-gradient-to-br from-black/80 to-[#110e1b]">
          <div className="absolute inset-0 bg-brand-neon/5 blur-[100px] pointer-events-none rounded-full"></div>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden group rounded-[2rem] bg-transparent">
            {product.glbModel ? (
              <model-viewer
                src={product.glbModel}
                alt={product.name}
                auto-rotate
                camera-controls
                ar
                ar-modes="webxr scene-viewer quick-look"
                environment-image="neutral"
                shadow-intensity="1"
                camera-orbit="45deg 55deg 2.5m"
                class="w-full h-full outline-none"
                style={{ width: '100%', height: '100%', outline: 'none' }}
              >
                <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                   <div className="w-12 h-12 rounded-full border-4 border-brand-neon border-t-transparent animate-spin"></div>
                </div>
                <button slot="ar-button" className="absolute bottom-4 right-4 bg-brand-neon text-black font-bold px-6 py-3 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] z-30 transition-transform hover:scale-105">
                  Visualizar no Espaço (AR)
                </button>
              </model-viewer>
            ) : (
              <img 
                src={product.images && product.images.length > 0 ? product.images[imgIndex] || product.images[0] : 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80'} 
                alt={product.name} 
                className="max-h-[90%] max-w-[90%] object-contain mix-blend-lighten transition-transform duration-700 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] group-hover:scale-110 group-hover:drop-shadow-[0_0_60px_rgba(168,85,247,0.3)] relative z-10"
              />
            )}
            
            {product.images && product.images.length > 1 && !product.glbModel && (
              <>
                <button 
                  className="absolute left-4 p-3 bg-black/50 backdrop-blur-xl hover:bg-brand-neon hover:text-black border border-white/10 text-white rounded-full transition-all shadow-xl z-20"
                  onClick={(e) => { e.stopPropagation(); setImgIndex(i => i === 0 ? product.images.length - 1 : i - 1); }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  className="absolute right-4 p-3 bg-black/50 backdrop-blur-xl hover:bg-brand-neon hover:text-black border border-white/10 text-white rounded-full transition-all shadow-xl z-20"
                  onClick={(e) => { e.stopPropagation(); setImgIndex(i => i === product.images.length - 1 ? 0 : i + 1); }}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          {/* Thumbnails (iOS dots) */}
          {product.images && product.images.length > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {product.images.map((_: any, i: number) => (
                <button 
                  key={i} 
                  onClick={() => setImgIndex(i)}
                  className={`h-2.5 rounded-full transition-all duration-500 ${i === imgIndex ? 'w-10 bg-gradient-to-r from-brand-neon to-brand-magenta shadow-[0_0_15px_rgba(168,85,247,0.8)]' : 'w-2.5 bg-white/20 hover:bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col relative z-10">
          <div className="mb-4">
             <span className="px-4 py-1.5 inline-flex items-center justify-center rounded-full bg-brand-neon/10 border border-brand-neon/30 text-xs font-bold tracking-widest text-brand-neon uppercase shadow-[0_0_20px_rgba(168,85,247,0.15)]">
               {product.category}
             </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
            {product.name}
          </h2>
          <div className="flex items-center gap-4 mb-8">
             <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
               {product.price.toLocaleString()} <span className="text-lg font-medium">MT</span>
             </div>
             <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-yellow-500 font-bold text-xs">5.0</span>
             </div>
          </div>
          
          <p className="text-gray-400 mb-10 leading-relaxed text-base font-medium">
            {product.desc}
          </p>

          <div className="bg-[#110e1b]/80 backdrop-blur-xl rounded-[2rem] p-6 mb-8 border border-white/5 shadow-inner">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2 uppercase tracking-widest">
              <Settings className="w-4 h-4 text-brand-neon" /> Especificações Técnicas
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Product Status forced into specs per requirement - SHOWN FIRST */}
              {(product as any).status && (
                <div className="flex justify-between items-center py-2 border-b border-white/5 group">
                  <span className="text-gray-500 font-bold text-xs tracking-wide uppercase group-hover:text-brand-neon transition-colors">Disponibilidade</span>
                  <span className={`text-sm font-bold text-right ml-4 ${
                    (product as any).status === 'stock' ? 'text-green-400' :
                    (product as any).status === 'encomenda' ? 'text-blue-400' :
                    (product as any).status === 'na_box' ? 'text-brand-magenta' :
                    'text-orange-400'
                  }`}>
                    {((product as any).status as string).replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              )}
              {(() => {
                // Determine the correct rendering order for specs
                const order = ['Motherboard', 'CPU', 'RAM', 'Disk', 'Armazenamento', 'Nvme', 'Cooling', 'Wc', 'Air Cooler', 'Liquid Cooling', 'GPU', 'Gráfica', 'Fonte', 'PSU', 'Case', 'Fans'];
                
                const entries = Object.entries(product.specs);
                entries.sort(([keyA], [keyB]) => {
                  let indexA = order.findIndex(k => keyA.toLowerCase().includes(k.toLowerCase()));
                  let indexB = order.findIndex(k => keyB.toLowerCase().includes(k.toLowerCase()));
                  
                  // If not in the priority list, push to the end
                  if (indexA === -1) indexA = 999;
                  if (indexB === -1) indexB = 999;
                  
                  return indexA - indexB;
                });

                return entries.map(([key, value]) => {
                  // Skip internal hidden attributes
                  if (key === 'isBuilderReady' || key === 'builderType' || key === 'builderWattage' || key === 'builderSocket') return null;
                  
                  return (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 group">
                      <span className="text-gray-500 font-bold text-xs tracking-wide uppercase group-hover:text-brand-neon transition-colors">{key.replace(/_/g, ' ')}</span>
                      <span className="text-gray-200 text-sm font-medium text-right ml-4">{value as string}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>


          <div className="flex flex-wrap gap-2 mb-10">
            {product.tags.map((t: string) => (
              <span key={t} className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-gray-300 hover:border-brand-neon/50 hover:text-white transition-colors cursor-default">
                #{t}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-white/10">
            <Button 
               onClick={handleAdd}
               className={`w-full h-16 text-base font-bold transition-all duration-500 rounded-full shadow-2xl border-0 ${added ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-white shadow-[0_0_30px_rgba(34,197,94,0.4)] scale-105' : 'bg-white text-black hover:bg-gray-200 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]'}`}
            >
               {added ? <><CheckCircle2 className="mr-2 w-6 h-6" /> Confirmado no Setup</> : 'Adicionar ao Setup'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Products() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { addItem } = useCart();
  
  // iOS 26 Segment Controls
  const [subCategory, setSubCategory] = useState<string | null>(null);

  // Comparator State
  const [compareItems, setCompareItems] = useState<any[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const handleToggleCompare = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    if (compareItems.some(p => p.id === product.id)) {
      setCompareItems(prev => prev.filter(p => p.id !== product.id));
    } else {
      if (compareItems.length < 2) setCompareItems(prev => [...prev, product]);
    }
  };

  const handleRunComparison = async () => {
    if (compareItems.length !== 2) return;
    setShowCompareModal(true);
    setIsComparing(true);
    setCompareResult(null);

    try {
      const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
      if (!apiKey) throw new Error("Missing API Key");
      
      const ai = new GoogleGenAI({ 
        apiKey,
        vertexai: { project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware', location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1' } as any
      });

      const p1 = compareItems[0];
      const p2 = compareItems[1];

      const prompt = `Atue como Amani 3, Consultora Técnica de Luxo. O cliente está em dúvida entre comprar "${p1.name}" (${p1.price} MT) e "${p2.name}" (${p2.price} MT).
Faça um duelo e dê um veredito final em 3 frases curtas e poderosas. Diga em que situação o Produto 1 ganha e em que situação o Produto 2 ganha.`;

      const startTime = performance.now();
      const res = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: { temperature: 0.6 }
      });
      const endTime = performance.now();
      const text = res.text || "{}";
      const totalTokens = res.usageMetadata?.totalTokenCount || Math.ceil((prompt.length + text.length) / 4);
      logAetherLabsUsage(endTime - startTime, prompt, text, totalTokens);

      setCompareResult(text);
    } catch(err) {
      console.error(err);
      setCompareResult("Falha na Matriz Neural ao analisar os componentes.");
    } finally {
      setIsComparing(false);
    }
  };
  
    // Advanced Filters
  const [laptopCondition, setLaptopCondition] = useState<string>('Todos');
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos');
  const [caseType, setCaseType] = useState<string>('Todos');
  const [innerSubCategory, setInnerSubCategory] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<string>('asc');

  const categories = ['Todos', "Desktop's", 'Monitores', 'Components', 'Consolas', 'Laptops', 'Celulares', 'Gadgets'];
  const { products, initProducts, loadingProducts } = useStore();

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo('.products-header', 
      { y: -30, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
    )
    .fromTo('.products-category-bubble',
      { y: 20, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, ease: 'back.out(1.5)' },
      "-=0.6"
    )
    .fromTo('.product-card-anim',
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' },
      "-=0.4"
    );
  }, { scope: containerRef });

  const [fomoNotification, setFomoNotification] = useState<{name: string, product: string, time: number} | null>(null);

  useEffect(() => {
    initProducts();
  }, [initProducts]);

  useEffect(() => {
    // FOMO Simulator
    const names = ["Nelson M.", "Thiago R.", "Rui P.", "Afonso S.", "Neymar J.", "Edson M.", "Gabriel V.", "Leonel M.", "Cristiano R.", "Cândido D."];
    const items = ["Workstation Zenith 9", "NVIDIA RTX 4090", "Monitor QD-OLED", "Kit Watercooling Custom", "Intel Core i9-14900K", "Setup Custom Watercooled", "Alienware 34 QD-OLED"];
    
    const triggerFomo = () => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const randomTime = Math.floor(Math.random() * 5) + 1;
      
      setFomoNotification({ name: randomName, product: randomItem, time: randomTime });
      
      setTimeout(() => {
        setFomoNotification(null);
      }, 5000); // hide after 5s
    };

    // First trigger after 15s, then every 30s
    const firstTimeout = setTimeout(() => {
      triggerFomo();
      setInterval(triggerFomo, 30000);
    }, 15000);

    return () => clearTimeout(firstTimeout);
  }, []);

   useEffect(() => {
    if (activeCategory === 'Monitores') setSubCategory('Monitores');
    else if (activeCategory === 'Consolas') setSubCategory('Consolas');
    else if (activeCategory === 'Laptops') setSubCategory('Laptops');
    else if (activeCategory === 'Celulares') setSubCategory('Celulares');
    else setSubCategory(null);
    setInnerSubCategory(null);
    setLaptopCondition('Todos');
    setSelectedBrand('Todos');
    setCaseType('Todos');
    setPriceSort('normal');
  }, [activeCategory]);

  const displayList = products.length > 0 ? products : mockProducts;
  
  let filteredProducts = activeCategory === 'Todos' 
    ? displayList.filter((p: any) => !p.isBuilderReady) // Hide specific builder-only parts from default view
    : displayList.filter(p => p.category === activeCategory || (activeCategory === 'Monitores' && p.category === 'Displays'));

  if (subCategory && subCategory !== activeCategory) {
     if (subCategory === 'Memória & Disco') {
       filteredProducts = filteredProducts.filter(p => p.tags?.includes('RAM') || p.tags?.includes('Armazenamento'));
     } else if (subCategory === 'Cooling') {
       filteredProducts = filteredProducts.filter(p => p.tags?.includes('Air Cooler') || p.tags?.includes('Liquid Cooling') || p.tags?.includes('Fans'));
     } else {
       filteredProducts = filteredProducts.filter(p => p.tags?.includes(subCategory) || p.category === subCategory);
     }
  } else if (subCategory === activeCategory) {
     filteredProducts = filteredProducts.filter(p => !p.tags?.includes('Acessórios') && !p.tags?.includes('Suportes'));
  }
  
  // If activeCategory is explicitly 'Components', we can show everything including builder components
  if (activeCategory !== 'Components' && activeCategory !== 'Todos') {
    filteredProducts = filteredProducts.filter((p: any) => !p.isBuilderReady);
  }

  if (innerSubCategory) {
    filteredProducts = filteredProducts.filter(p => p.tags?.includes(innerSubCategory) || p.name.toLowerCase().includes(innerSubCategory.toLowerCase()));
  }

  if (laptopCondition !== 'Todos') {
    filteredProducts = filteredProducts.filter(p => {
      const state = p.specs?.['Estado'] || 'Novo';
      const cond = laptopCondition.toLowerCase();
      return state.toLowerCase().includes(cond) || (p as any).status?.replace('_', ' ') === cond;
    });
  }

  if (selectedBrand !== 'Todos') {
    filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(selectedBrand.toLowerCase()) || p.tags?.includes(selectedBrand));
  }

  if (caseType !== 'Todos' && subCategory === 'Case') {
    filteredProducts = filteredProducts.filter(p => p.specs?.['Formato']?.includes(caseType) || p.tags?.includes(caseType) || p.name.includes(caseType));
  }

  if (priceSort === 'asc') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (priceSort === 'desc') {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % filteredProducts.length);
  };

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + filteredProducts.length) % filteredProducts.length);
  };

  return (
    <div ref={containerRef} className="pt-32 pb-24 px-6 max-w-7xl mx-auto min-h-screen relative">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] max-w-[100vw] h-[500px] bg-brand-neon/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="flex flex-col items-center justify-center mb-16 gap-10 products-header text-center">
        <div>
          <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tracking-tighter mb-4 drop-shadow-2xl">
            A MONTRA
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">Onde a perfeição técnica encontra o luxo. Selecione a sua próxima arma de computação.</p>
        </div>

        {/* Epic Main Categories */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-black/60 p-3 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => { setActiveCategory(cat); setSelectedIndex(null); }}
              className={`products-category-bubble px-8 py-3.5 text-sm font-bold rounded-[1.5rem] transition-all duration-500 ${
                activeCategory === cat 
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* iOS 26 Style Sub-Bubbles & Filters */}
      <div className="flex flex-col gap-8 mb-16 items-center justify-center animate-in fade-in zoom-in-95 duration-500 pb-6">
        
        {/* Bubble Segment Control (iOS 26 Concept) */}
        <div className={`flex p-1.5 md:p-2 bg-[#110e1b]/80 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative w-full lg:max-w-4xl ${!['Monitores', 'Consolas', 'Laptops', 'Components', 'Celulares'].includes(activeCategory) ? 'hidden' : ''}`}>
          {['Monitores', 'Consolas', 'Laptops', 'Components', 'Celulares'].includes(activeCategory) && (
            <div className="flex flex-wrap items-center justify-center gap-1 w-full">
              {activeCategory === 'Monitores' && ['Monitores', 'Suportes'].map(sub => (
                <button 
                  key={sub} onClick={() => setSubCategory(sub === subCategory ? null : sub)}
                  className={`relative px-6 md:px-10 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-[1.5rem] transition-all duration-500 z-10 ${subCategory === sub ? 'text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {subCategory === sub && <div className="absolute inset-0 bg-gradient-to-r from-brand-neon to-brand-magenta rounded-[1.5rem] shadow-[0_0_20px_rgba(168,85,247,0.5)] -z-10 animate-in zoom-in-90 duration-300"></div>}
                  {sub}
                </button>
              ))}
              {activeCategory === 'Consolas' && ['Consolas', 'Acessórios'].map(sub => (
                <button 
                  key={sub} onClick={() => setSubCategory(sub === subCategory ? null : sub)}
                  className={`relative px-6 md:px-10 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-[1.5rem] transition-all duration-500 z-10 ${subCategory === sub ? 'text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {subCategory === sub && <div className="absolute inset-0 bg-gradient-to-r from-brand-neon to-brand-magenta rounded-[1.5rem] shadow-[0_0_20px_rgba(168,85,247,0.5)] -z-10 animate-in zoom-in-90 duration-300"></div>}
                  {sub}
                </button>
              ))}
              {activeCategory === 'Laptops' && ['Laptops', 'Acessórios'].map(sub => (
                <button 
                  key={sub} onClick={() => setSubCategory(sub === subCategory ? null : sub)}
                  className={`relative px-6 md:px-10 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-[1.5rem] transition-all duration-500 z-10 ${subCategory === sub ? 'text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {subCategory === sub && <div className="absolute inset-0 bg-gradient-to-r from-brand-neon to-brand-magenta rounded-[1.5rem] shadow-[0_0_20px_rgba(168,85,247,0.5)] -z-10 animate-in zoom-in-90 duration-300"></div>}
                  {sub}
                </button>
              ))}
               {activeCategory === 'Components' && ['Motherboard', 'CPU', 'Memória & Disco', 'Cooling', 'GPU', 'Fonte', 'Case', 'Periféricos'].map(sub => (
                 <button 
                  key={sub} onClick={() => { setSubCategory(sub === subCategory ? null : sub); setInnerSubCategory(null); }}
                  className={`relative px-3 md:px-5 py-2 text-[10px] md:text-xs font-bold rounded-[1.5rem] transition-all duration-500 z-10 whitespace-nowrap ${subCategory === sub ? 'text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {subCategory === sub && <div className="absolute inset-0 bg-gradient-to-r from-brand-neon to-brand-magenta rounded-[1.5rem] shadow-[0_0_20px_rgba(168,85,247,0.5)] -z-10 animate-in zoom-in-90 duration-300"></div>}
                  {sub}
                </button>
              ))}
              {activeCategory === 'Celulares' && ['Android', 'iOS'].map(sub => (
                <button
                  key={sub} onClick={() => setSubCategory(sub === subCategory ? null : sub)}
                  className={`relative px-4 md:px-6 py-2 md:py-2.5 text-[11px] md:text-xs font-bold rounded-[1.5rem] transition-all duration-500 z-10 whitespace-nowrap ${subCategory === sub ? 'text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {subCategory === sub && <div className="absolute inset-0 bg-gradient-to-r from-brand-neon to-brand-magenta rounded-[1.5rem] shadow-[0_0_20px_rgba(168,85,247,0.5)] -z-10 animate-in zoom-in-90 duration-300"></div>}
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Level 2 Bubbles (Nested Sub-Categories) */}
        {(subCategory === 'Cooling' || subCategory === 'Periféricos' || subCategory === 'Memória & Disco') && (
          <div className="flex p-1.5 md:p-2 bg-black/40 backdrop-blur-2xl rounded-[1.5rem] border border-white/5 shadow-inner animate-in slide-in-from-top-2 duration-500">
             <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {(subCategory === 'Cooling' ? ['Air Cooler', 'Liquid Cooling', 'Fans'] : 
                  subCategory === 'Memória & Disco' ? ['RAM', 'Armazenamento'] :
                  ['Teclado', 'Rato', 'Mousepad', 'Headsets', 'Webcam', 'Chairs', 'Audio & Som', 'Routers']).map(inner => (
                  <button
                    key={inner}
                    onClick={() => setInnerSubCategory(inner === innerSubCategory ? null : inner)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${innerSubCategory === inner ? 'bg-brand-neon text-black shadow-[0_0_15px_rgba(20,241,149,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {inner}
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Global Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-center">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-2 backdrop-blur-xl">
             <Filter size={14} className="text-gray-400" />
             <select 
               value={laptopCondition} 
               onChange={e => setLaptopCondition(e.target.value)}
               className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
             >
               <option value="Todos" className="bg-black">Qualquer Estado/Stock</option>
               <option value="Novo" className="bg-black">Novo</option>
               <option value="Usado" className="bg-black">Usado</option>
               <option value="Na box" className="bg-black">Na Box</option>
               <option value="stock" className="bg-black">Em Stock</option>
               <option value="encomenda" className="bg-black">Por Encomenda</option>
             </select>
          </div>

           <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-2 backdrop-blur-xl">
             <Filter size={14} className="text-gray-400" />
             <select 
               value={priceSort} 
               onChange={e => setPriceSort(e.target.value)}
               className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
             >
               <option value="normal" className="bg-black">Relevância</option>
               <option value="asc" className="bg-black">Menor Preço</option>
               <option value="desc" className="bg-black">Maior Preço</option>
             </select>
          </div>

          {(activeCategory === 'Components' || activeCategory === "Desktop's") && (
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-2 backdrop-blur-xl">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={selectedBrand} 
                onChange={e => setSelectedBrand(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-black">Todas Marcas</option>
                <option value="ASUS" className="bg-black">ASUS</option>
                <option value="MSI" className="bg-black">MSI</option>
                <option value="Gigabyte" className="bg-black">Gigabyte</option>
                <option value="Corsair" className="bg-black">Corsair</option>
                <option value="Razer" className="bg-black">Razer</option>
                <option value="Logitech" className="bg-black">Logitech</option>
                <option value="Samsung" className="bg-black">Samsung</option>
                <option value="Intel" className="bg-black">Intel</option>
                <option value="AMD" className="bg-black">AMD</option>
                <option value="NVIDIA" className="bg-black">NVIDIA</option>
              </select>
            </div>
          )}

          {subCategory === 'Case' && (
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-2 backdrop-blur-xl">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={caseType} 
                onChange={e => setCaseType(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-black">Todos Formatos</option>
                <option value="E-ATX" className="bg-black">E-ATX</option>
                <option value="ATX" className="bg-black">ATX</option>
                <option value="Micro-ATX" className="bg-black">Micro-ATX</option>
                <option value="Mini-ITX" className="bg-black">Mini-ITX</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Product Grid - Compact Dense Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredProducts.map((product, idx) => (
          <div 
            key={product.id} 
            onClick={() => setSelectedIndex(idx)}
            className="product-card-anim bg-[#0a0a14]/60 backdrop-blur-2xl border border-white/10 rounded-2xl group cursor-pointer relative overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(168,85,247,0.3)] hover:border-brand-neon/50 hover:bg-[#110e1b] will-change-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-brand-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <div className="absolute top-3 left-3 z-20 flex gap-2">
              {(product as any).status && (
                <span className={`text-[8px] font-extrabold tracking-widest uppercase px-2 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-sm ${
                  (product as any).status === 'stock' ? 'bg-green-500/20 text-green-400' :
                  (product as any).status === 'encomenda' ? 'bg-blue-500/20 text-blue-400' :
                  (product as any).status === 'na_box' ? 'bg-purple-500/20 text-brand-magenta' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {((product as any).status as string).replace('_', ' ')}
                </span>
              )}
            </div>
            
            <div className="h-48 overflow-hidden relative p-6 flex items-center justify-center bg-gradient-to-b from-black/40 to-black/10 m-2 rounded-xl border border-white/5 group-hover:bg-white/[0.02]">
              <img 
                src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80'} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain filter group-hover:drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-700 ease-out" 
                loading="lazy"
                decoding="async"
              />
              
              {/* FPS Simulator Badge for Desktops */}
              {product.category === "Desktop's" && (
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md border border-brand-neon/30 rounded-lg px-2 py-1 flex flex-col items-center shadow-lg group-hover:border-brand-neon group-hover:scale-110 transition-all duration-500 opacity-0 group-hover:opacity-100">
                  <span className="text-[8px] font-black text-brand-neon uppercase tracking-tighter">Est. FPS</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-white">{product.name.includes('9') ? '240' : product.name.includes('7') ? '165' : '120'}</span>
                    <span className="text-[8px] font-bold text-gray-500">4K</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 pt-2 flex flex-col justify-between grow relative z-10">
               <div>
                  <h3 className="text-sm font-bold text-white mb-1 line-clamp-2 leading-snug group-hover:text-brand-neon transition-colors">{product.name}</h3>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold line-clamp-1 group-hover:text-gray-400">{product.category}</div>
               </div>
               <div className="flex items-center justify-between mt-4">
                  <div className="text-lg font-black text-white group-hover:text-brand-neon transition-colors">
                    {product.price.toLocaleString()} <span className="text-[10px] text-gray-500 font-bold">MT</span>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    <button 
                      onClick={(e) => handleToggleCompare(e, product)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-md ${compareItems.some(p => p.id === product.id) ? 'bg-brand-magenta text-white border-brand-magenta' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-brand-magenta hover:text-white'}`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                         e.stopPropagation();
                         addItem({ ...product, image: product.image || product.images?.[0] || 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80' });
                      }}
                      className="w-8 h-8 rounded-lg bg-brand-neon text-black flex items-center justify-center border border-brand-neon hover:bg-brand-magenta hover:border-brand-magenta transition-all duration-300 shadow-[0_0_10px_rgba(20,241,149,0.3)]"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-32 flex flex-col items-center justify-center text-center animate-in fade-in">
           <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
             <Settings className="w-10 h-10 text-gray-500" />
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Sem Resultados</h2>
           <p className="text-gray-400">Não encontrámos equipamentos com estes critérios. Tente alterar os filtros.</p>
        </div>
      )}

      {/* Comparator Floating Dock */}
      {compareItems.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-3xl border border-white/20 p-4 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-6 animate-in slide-in-from-bottom-10">
          <div className="flex -space-x-4">
            {compareItems.map((p, i) => (
              <div key={i} className="w-12 h-12 rounded-full border-2 border-[#110e1b] bg-white/5 overflow-hidden relative shadow-lg">
                <button onClick={(e) => handleToggleCompare(e, p)} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10"><X size={16} /></button>
                <img src={p.images?.[0] || p.image} alt={p.name} className="w-full h-full object-contain p-1" />
              </div>
            ))}
            {compareItems.length < 2 && (
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 bg-transparent flex items-center justify-center text-gray-500 shadow-lg">
                <span className="text-xs font-bold">?</span>
              </div>
            )}
          </div>
          <div className="text-white font-bold text-sm hidden md:block">
            {compareItems.length === 2 ? 'Pronto para o Duelo' : 'Selecione mais um para comparar'}
          </div>
          <Button 
            disabled={compareItems.length < 2} 
            onClick={handleRunComparison}
            className="rounded-full bg-brand-neon hover:bg-brand-magenta text-black font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Comparar com IA
          </Button>
        </div>
      )}

      {/* Comparator Modal */}
      {showCompareModal && compareItems.length === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-3xl transition-all duration-500 animate-in fade-in zoom-in-95">
          <div className="max-w-6xl w-full bg-[#0a0a14] border border-brand-magenta/30 rounded-[3rem] mx-auto overflow-hidden flex flex-col shadow-[0_0_120px_rgba(236,72,153,0.15)] relative">
            <button onClick={() => setShowCompareModal(false)} className="absolute top-6 right-6 z-50 w-12 h-12 flex items-center justify-center bg-black/50 backdrop-blur-xl hover:bg-white/10 text-white border border-white/10 transition-colors rounded-full shadow-2xl">
              <X size={24} strokeWidth={1.5} />
            </button>
            
            <div className="p-10 text-center border-b border-white/5 bg-gradient-to-b from-brand-magenta/5 to-transparent relative">
               <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta tracking-tighter drop-shadow-lg mb-2">
                 Duelo Matrix
               </h2>
               <p className="text-gray-400 font-medium">Amani 3 Neural Comparator</p>
            </div>

            <div className="flex flex-col md:flex-row p-8 gap-8">
              {/* P1 */}
              <div className="flex-1 bg-white/5 rounded-[2rem] p-8 border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neon/20 blur-[50px] rounded-full pointer-events-none"></div>
                <img src={compareItems[0].images?.[0] || compareItems[0].image} alt="" className="h-40 object-contain mb-6 drop-shadow-2xl relative z-10" />
                <h3 className="text-2xl font-bold text-white mb-2 relative z-10">{compareItems[0].name}</h3>
                <div className="text-xl font-medium text-brand-neon mb-6 relative z-10">{compareItems[0].price.toLocaleString()} MT</div>
                <div className="w-full space-y-2 relative z-10 text-left">
                  {Object.entries(compareItems[0].specs).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="text-xs flex justify-between border-b border-white/5 pb-2">
                       <span className="text-gray-500 uppercase font-bold">{k}</span>
                       <span className="text-gray-200 font-medium">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center shrink-0">
                 <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-neon to-brand-magenta flex items-center justify-center font-extrabold text-2xl text-white shadow-[0_0_30px_rgba(236,72,153,0.5)] z-10 relative">
                   VS
                 </div>
              </div>

              {/* P2 */}
              <div className="flex-1 bg-white/5 rounded-[2rem] p-8 border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-brand-magenta/20 blur-[50px] rounded-full pointer-events-none"></div>
                <img src={compareItems[1].images?.[0] || compareItems[1].image} alt="" className="h-40 object-contain mb-6 drop-shadow-2xl relative z-10" />
                <h3 className="text-2xl font-bold text-white mb-2 relative z-10">{compareItems[1].name}</h3>
                <div className="text-xl font-medium text-brand-magenta mb-6 relative z-10">{compareItems[1].price.toLocaleString()} MT</div>
                <div className="w-full space-y-2 relative z-10 text-left">
                  {Object.entries(compareItems[1].specs).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="text-xs flex justify-between border-b border-white/5 pb-2">
                       <span className="text-gray-500 uppercase font-bold">{k}</span>
                       <span className="text-gray-200 font-medium">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Verdict */}
            <div className="p-8 bg-black/40 border-t border-white/10 flex-shrink-0 max-h-[300px] flex flex-col">
               <div className="flex items-center gap-3 mb-4 shrink-0">
                 <Sparkles className="w-6 h-6 text-brand-neon" />
                 <h4 className="text-lg font-bold text-white">Veredito Amani 3</h4>
               </div>
               <div className="text-gray-300 font-medium leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner overflow-y-auto custom-scrollbar flex-1 prose prose-invert max-w-none prose-p:my-2 prose-strong:text-brand-neon">
                 {isComparing ? (
                   <span className="animate-pulse text-brand-neon">A processar biliões de parâmetros para o duelo perfeito...</span>
                 ) : compareResult ? (
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{compareResult}</ReactMarkdown>
                 ) : null}
               </div>
            </div>
          </div>
        </div>
      )}

      {selectedIndex !== null && (
        <ProductModal 
          key={filteredProducts[selectedIndex].id}
          product={filteredProducts[selectedIndex]} 
          onClose={() => setSelectedIndex(null)} 
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}

      {/* FOMO Notification Widget */}
      {fomoNotification && (
        <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-top-10 fade-in duration-500">
           <div className="bg-[#050510]/95 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-4 max-w-sm relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-r from-brand-neon/20 via-transparent to-transparent opacity-50 pointer-events-none"></div>
             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-neon to-brand-magenta flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-2 border-[#050510]">
               <span className="text-white font-extrabold text-lg">{fomoNotification.name.charAt(0)}</span>
             </div>
             <div className="relative z-10 pr-4">
               <p className="text-[11px] text-gray-300 tracking-wide uppercase"><span className="text-white font-extrabold">{fomoNotification.name}</span> comprou</p>
               <p className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-white truncate w-56">{fomoNotification.product}</p>
               <p className="text-[9px] text-gray-500 font-bold mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-neon animate-pulse"></span> Verificado há {fomoNotification.time} min</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
