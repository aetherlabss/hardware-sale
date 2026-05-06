import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Plus, Trash2, LogOut, Package, HardDrive, ShieldCheck, LayoutDashboard, Settings, Users, Search, Bell, Menu, X, Cpu, LineChart, ArrowUpRight, Zap, Loader2, MessageSquare, Bot, AlertCircle, ArrowRight, Sparkles, Terminal, ArrowUp, Wrench, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { logAetherLabsUsage } from '../lib/aiTracking';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AdminDashboard() {
  const [user, setUser] = useState(auth.currentUser);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [adminProductFilter, setAdminProductFilter] = useState('Todos');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState("Desktop's");
  const [subCategory, setSubCategory] = useState('');
  const [status, setStatus] = useState('stock'); // availability
  const [condition, setCondition] = useState('novo'); // product state
  const [images, setImages] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [specsList, setSpecsList] = useState<{key: string, value: string}[]>([{key: '', value: ''}]);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  // Builder Specific Add State
  const [isAddingBuilder, setIsAddingBuilder] = useState(false);
  const [bName, setBName] = useState('');
  const [bPrice, setBPrice] = useState('');
  const [bType, setBType] = useState('gpu');
  const [bWattage, setBWattage] = useState('');
  const [bSocket, setBSocket] = useState('');
  const [bSpecs, setBSpecs] = useState(''); // comma separated
  const [bImages, setBImages] = useState('');

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const ALLOWED_ADMINS = ['admin@hardwaresales.co.mz', 'gabriel.vieira.jamal@gmail.com'];
  const [authChecked, setAuthChecked] = useState(false);

  // Command Center State
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [commandCenterTab, setCommandCenterTab] = useState<'ai' | 'notifications'>('ai');
  const [adminChatMessages, setAdminChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Central Matrix operacional. Como posso optimizar as operações de hardware hoje?' }
  ]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [isAdminChatLoading, setIsAdminChatLoading] = useState(false);

  // Settings State
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Hardware Sale MZ',
    currency: 'MT',
    aiBehavior: 'pro',
    aiTemperature: 0.7,
    supportEmail: 'suporte@hardwaresale.co.mz',
    supportPhone: '+258 84 000 0000',
    maintenanceMode: false,
    disableMocks: false
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const handleAutocomplete = async () => {
    if (!name) return;
    setIsAutoCompleting(true);
    try {
      const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
      if (!apiKey) throw new Error("VITE_VERTEX_API_KEY missing");
      const ai = new GoogleGenAI({ 
        apiKey,
        vertexai: {
          project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware',
          location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1'
        } as any
      });

      const prompt = `Gere dados de marketing e especificações para este produto de hardware tech: "${name}". 
Usando as tuas capacidades de pesquisa na web (Google Search), procure e RETORNE APENAS LINKS COMPLETAMENTE REAIS E FUNCIONAIS de imagens do produto. Se não encontrar um URL que termine em .jpg, .png ou .webp de uma fonte confiavel como amazon, fabricante etc, deixe a array images VAZIA.
Retorne um JSON válido com esta exata estrutura:
{
  "desc": "Uma descrição premium, comercial e detalhada de até 3 frases sobre as qualidades do produto.",
  "specs": "Especificações chave no formato Chave: Valor, uma por linha (Ex:\\nMemória: 16GB\\nFrequência: 3200MHz)",
  "tags": "3 a 5 tags separadas por vírgula (Ex: premium, rgb, overclock)",
  "category": "Uma destas: Desktop's, Displays, Components, Consolas, Laptops, Gadgets",
  "subCategory": "Uma destas se aplicável: GPU, CPU, RAM, Armazenamento, Air Cooler, Liquid Cooling, Fans, Motherboard, Fonte, Case, Teclado, Rato, Headsets, Webcam, Chairs / Cadeiras, Audio & Som, Routers & Redes, Android, iOS. (Ou null se não aplicável)",
  "images": ["URL REAL 1", "URL REAL 2"]
}`;

      const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
          config: {
            temperature: 0.2, // Baixa temperatura para factos técnicos
            tools: [{ googleSearch: {} }] // Usar pesquisa na Web para specs reais
          }
      });
      
      let text = response.text || "";
      // Strip markdown code fences if present
      text = text.replace(/```json\n/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(text);
      if (parsed.desc) setDesc(parsed.desc);
      if (parsed.specs) {
        const lines = parsed.specs.split('\n');
        const newList = lines.map((l: string) => {
          const [k, v] = l.split(':');
          return { key: k ? k.trim() : '', value: v ? v.trim() : '' };
        }).filter((item: any) => item.key && item.value);
        setSpecsList(newList.length ? newList : [{key: '', value: ''}]);
      }
      if (parsed.tags) setTags(parsed.tags);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.subCategory) setSubCategory(parsed.subCategory);
      // Only set images if current images are empty (don't overwrite user uploads)
      if (!images) {
        if (parsed.images && Array.isArray(parsed.images)) {
          const validImages = parsed.images.filter((img: string) => img && !img.includes('placeholder'));
          setImages(validImages.join('|||'));
        } else if (parsed.image_url && !parsed.image_url.includes('placeholder')) {
          setImages(parsed.image_url);
        }
      }
    } catch (err) {
      console.error("Auto-complete failed:", err);
    } finally {
      setIsAutoCompleting(false);
    }
  };

  const handleBuilderAutocomplete = async () => {
    if (!bName) return;
    setIsAutoCompleting(true);
    try {
      const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
      if (!apiKey) throw new Error("VITE_VERTEX_API_KEY missing");
      const ai = new GoogleGenAI({ 
        apiKey,
        vertexai: {
          project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware',
          location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1'
        } as any
      });

      const prompt = `Gere dados de compatibilidade técnica para o Smart Builder sobre este componente de hardware: "${bName}". 
Usando pesquisa, encontre e RETORNE APENAS LINKS COMPLETAMENTE REAIS E FUNCIONAIS de imagens. Se não encontrar imagens, deixe a array vazia.
Retorne um JSON válido com esta exata estrutura:
{
  "bType": "Um destes: cpu, gpu, motherboard, ram, psu, case, storage, cooler, fans, peripheral",
  "bWattage": "Apenas número (ex: se o TDP for 125W, retorne 125). Em caso de PSU, devolva os Watts totais.",
  "bSocket": "O Socket ou chipset (LGA1700, AM5, ATX, PCIe 4.0, etc.)",
  "bSpecs": "3 especificações chave separadas por vírgula (ex: 24 Cores, 6.2GHz, 125W TDP)",
  "images": ["URL real 1", "URL real 2"]
}`;

      const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
          config: {
            temperature: 0.1,
            tools: [{ googleSearch: {} }]
          }
      });
      
      let text = response.text || "";
      text = text.replace(/```json\n/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(text);
      if (parsed.bType) setBType(parsed.bType);
      if (parsed.bWattage !== undefined) setBWattage(String(parsed.bWattage));
      if (parsed.bSocket) setBSocket(parsed.bSocket);
      if (parsed.bSpecs) setBSpecs(parsed.bSpecs);
      if (!bImages) {
        if (parsed.images && Array.isArray(parsed.images)) {
          const validImages = parsed.images.filter((img: string) => img && !img.includes('placeholder'));
          setBImages(validImages.join('|||'));
        } else if (parsed.image_url && !parsed.image_url.includes('placeholder')) {
          setBImages(parsed.image_url);
        }
      }
    } catch (err) {
      console.error("Builder Auto-complete failed:", err);
    } finally {
      setIsAutoCompleting(false);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
     if (!user) return;
     const unsub = onSnapshot(doc(db, 'admin_settings', 'main'), (docSnap) => {
        if(docSnap.exists()) {
           setStoreSettings(prev => ({...prev, ...docSnap.data()}));
        }
     });
     return () => unsub();
  }, [user]);

  const handleSaveSettings = async () => {
     setSavingSettings(true);
     try {
       await setDoc(doc(db, 'admin_settings', 'main'), storeSettings, { merge: true });
       alert("Configurações salvas na Matrix!");
     } catch(err) {
       console.error(err);
       alert("Erro ao salvar.");
     }
     setSavingSettings(false);
  };

  const [events, setEvents] = useState<any[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState('30D');

  const aiEvents = events.filter(e => e.type === 'ai_usage').map(e => ({
     model: e.path,
     latency: Number(e.sessionId) || 0,
     tokens: e.value || 0,
     timestamp: e.timestamp
  }));

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality JPEG
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const base64Images: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await processImage(files[i]);
        base64Images.push(base64);
      }
      // Combine existing images (split safely) and new images using a dedicated array approach instead of strings
      const currentImgs = images ? images.split('|||').filter(Boolean) : [];
      setImages([...currentImgs, ...base64Images].join('|||'));
    } catch (err) {
      console.error("Error processing image:", err);
    }
  };

  const handleBuilderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const base64Images: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await processImage(files[i]);
        base64Images.push(base64);
      }
      const currentImgs = bImages ? bImages.split('|||').filter(Boolean) : [];
      setBImages([...currentImgs, ...base64Images].join('|||'));
    } catch (err) {
      console.error("Error processing image:", err);
    }
  };

  useEffect(() => {
    if (!user || !ALLOWED_ADMINS.includes(user.email || '')) {
      setLoading(false);
      return;
    }
    const q = collection(db, 'products');
    const unsubProducts = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation time manually as we don't have indexes setup perfectly yet
      data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const qEvents = collection(db, 'analytics_events');
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
    }, (error) => {
      console.error(error);
    });

    return () => {
      unsubProducts();
      unsubEvents();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    if (!ALLOWED_ADMINS.includes(email.toLowerCase().trim())) {
      setLoginError('Acesso Negado: Email não autorizado nas diretivas de segurança.');
      setIsLoggingIn(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        try {
          // If the email is allowed, we can lazily create the account with the password they provided
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createError: any) {
          setLoginError('Acesso Negado: Falha na criação do acesso Master.');
        }
      } else {
        setLoginError('Acesso Negado: Credenciais inválidas.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleAddBuilderComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedImages = bImages.split('|||').map(i => i.trim()).filter(Boolean);
      const specsList = bSpecs.split(',').map(s => s.trim()).filter(Boolean);
      const parsedSpecs: Record<string, string> = {};
      specsList.forEach((s, i) => parsedSpecs[`Espec ${i+1}`] = s);

      const typeMapRev: Record<string, string> = {
        'cpu': 'CPU', 'gpu': 'GPU', 'motherboard': 'Motherboard', 'ram': 'RAM', 'psu': 'Fonte', 'case': 'Case', 'storage': 'Armazenamento', 'cooler': 'Air Cooler', 'fans': 'Fans', 'peripheral': 'Acessório',
      };

      const productData: any = {
        name: bName,
        price: Number(bPrice),
        category: 'Components',
        subCategory: typeMapRev[bType] || 'Componente',
        status: 'stock',
        condition: 'novo',
        images: parsedImages.length ? parsedImages : ['https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80'],
        desc: 'Componente otimizado e adicionado diretamente via Smart Builder Matrix.',
        tags: [typeMapRev[bType] || 'Componente'],
        specs: parsedSpecs,
        isBuilderReady: true,
        builderType: bType,
        builderWattage: Number(bWattage) || 0,
        builderSocket: bSocket || '',
        updatedAt: serverTimestamp()
      };

      productData.createdAt = serverTimestamp();
      await addDoc(collection(db, 'products'), productData);
      
      setBName(''); setBPrice(''); setBType('gpu'); setBWattage(''); setBSocket(''); setBSpecs(''); setBImages('');
      setIsAddingBuilder(false);
    } catch(err) {
      console.error(err);
      alert("Erro ao adicionar componente ao Builder.");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedImages = images.split('|||').map(i => i.trim()).filter(Boolean);
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const parsedSpecs: Record<string, string> = {};
      specsList.forEach(item => {
        if (item.key && item.value) parsedSpecs[item.key.trim()] = item.value.trim();
      });

      // Include condition in specs directly
      if (condition) {
         parsedSpecs['Estado'] = condition === 'novo' ? 'Novo' : condition === 'usado' ? 'Usado (Com Garantia)' : 'Na Box (Selado)';
      }

      // Auto-append subcategory to tags if it's not empty
      if (subCategory && !parsedTags.map(t => t.toLowerCase()).includes(subCategory.toLowerCase())) {
        parsedTags.push(subCategory);
      }

      const productData: any = {
        name,
        price: Number(price),
        category,
        subCategory,
        status,
        images: parsedImages.length ? parsedImages : ['https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80'],
        desc,
        tags: parsedTags,
        specs: parsedSpecs,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await setDoc(doc(db, 'products', editingId), productData, { merge: true });
      } else {
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), productData);
      }
      
      setName('');
      setPrice('');
      setImages('');
      setDesc('');
      setTags('');
      setSubCategory('');
      setSpecsList([{key: '', value: ''}]);
      setEditingId(null);
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  const handleEdit = (p: any) => {
    setName(p.name);
    setPrice(p.price.toString());
    setCategory(p.category);
    
    // Guess subCategory from tags if possible
    const possibleSubs = ['GPU', 'CPU', 'RAM', 'Armazenamento', 'Air Cooler', 'Liquid Cooling', 'Fans', 'Motherboard', 'Fonte', 'Case', 'Teclado', 'Rato', 'Mousepad', 'Headsets', 'Android', 'iOS', 'Monitores', 'Suportes', 'Consolas', 'Laptops', 'Acessórios'];
    const foundSub = p.subCategory || p.tags?.find((t: string) => possibleSubs.includes(t)) || '';
    setSubCategory(foundSub);
    
    setStatus(p.status || 'stock');
    
    // Reverse engineer condition from specs
    let cond = 'novo';
    if (p.specs?.['Estado'] === 'Usado (Com Garantia)') cond = 'usado';
    if (p.specs?.['Estado'] === 'Na Box (Selado)') cond = 'na_box';
    setCondition(cond);

    setImages(p.images?.join('|||') || '');
    setDesc(p.desc || '');
    setTags(p.tags?.join(', ') || '');
    
    // Reverse engineer specs map to list
    if (p.specs) {
      const spList = Object.entries(p.specs)
        .filter(([k]) => k !== 'Estado')
        .map(([k, v]) => ({ key: k, value: v as string }));
      setSpecsList(spList.length > 0 ? spList : [{key: '', value: ''}]);
    } else {
      setSpecsList([{key: '', value: ''}]);
    }

    setEditingId(p.id);
    setIsAdding(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Remover este produto permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-neon border-t-brand-magenta animate-spin"></div>
      </div>
    );
  }

  if (!user || !ALLOWED_ADMINS.includes(user.email || '')) {
    return (
      <div className="min-h-screen bg-[#050510] relative flex items-center justify-center p-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-neon/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-20 w-[400px] h-[400px] bg-brand-magenta/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-2xl border border-white/5 shadow-2xl relative z-10 z-50">
          <div className="p-8 pb-6 text-center border-b border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-neon to-brand-magenta mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Acesso Restrito</h1>
            <p className="text-sm text-gray-400">Entre com as suas credenciais de administrador.</p>
          </div>
          <CardContent className="p-8 pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-semibold text-center">
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Email Security Level</label>
                <Input 
                  required 
                  type="email"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="bg-white/5 border-white/10 h-12" 
                  placeholder="admin@hardwaresales.co.mz" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Override Passcode</label>
                <Input 
                  required 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="bg-white/5 border-white/10 h-12" 
                  placeholder="******" 
                />
              </div>
              <Button disabled={isLoggingIn} type="submit" className="w-full bg-white text-black hover:bg-gray-200 h-12 rounded-xl font-bold transition-transform hover:scale-[1.02]">
                {isLoggingIn ? 'Autenticando...' : 'Iniciar Protocolo'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Produtos' },
    { id: 'builder', icon: Wrench, label: 'Smart Builder' },
    { id: 'customers', icon: Users, label: 'Clientes' },
    { id: 'settings', icon: Settings, label: 'Configurações' },
    { id: 'aetherlabs', icon: Sparkles, label: 'AetherLabs AI' },
    { id: 'status', icon: Zap, label: 'Server Status' },
  ];

  return (
    <div className="flex h-screen bg-[#050510] text-[#f8f8fc] selection:bg-brand-neon/30 overflow-hidden font-sans">
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-brand-neon transition-colors border border-white/20">
            <X size={24} />
          </button>
          <img src={previewImage} className="max-w-full max-h-full object-contain rounded-2xl border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a14] border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <HardDrive className="text-brand-neon w-6 h-6" />
          <span className="font-bold text-lg tracking-tight">Matrix Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-white">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a14] border-r border-white/5 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-24 flex items-center px-8 border-b border-white/5 hidden lg:flex">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex items-center justify-center bg-black/50">
              <img src="/hardwaresaleogo.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="block font-bold text-lg tracking-tight leading-none text-white">Hardware Sale</span>
              <span className="block text-[10px] font-bold tracking-widest uppercase text-brand-neon mt-1">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto mt-16 lg:mt-0">
          <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase px-4 mb-4">Menu Principal</div>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                activeTab === item.id 
                  ? 'bg-brand-neon/10 text-brand-neon font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'opacity-100' : 'opacity-70'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-brand-neon/20 border border-brand-neon/50 flex items-center justify-center text-brand-neon font-bold shrink-0">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{user.email?.split('@')[0]}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{user.email}</div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-brand-magenta transition-colors rounded-lg hover:bg-white/5">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#050510] relative mt-16 lg:mt-0">
        
        {/* Top Header */}
        <header className="h-24 px-8 flex items-center justify-between border-b border-white/5 bg-[#0a0a14]/50 backdrop-blur-md z-10 hidden lg:flex">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Pesquisar em todo o painel..." 
              className="w-full bg-black/40 border border-white/5 rounded-2xl h-12 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-neon/50 transition-colors text-white"
            />
          </div>
          <div className="flex items-center gap-4 ml-8">
            <button onClick={() => setIsCommandCenterOpen(true)} className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative group shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <Bell size={20} className="group-hover:text-brand-neon transition-colors" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-brand-neon animate-pulse border-2 border-[#0a0a14]"></span>
            </button>
          </div>
        </header>

        {/* Command Center Drawer */}
        <div className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[440px] bg-[#030305]/95 backdrop-blur-[50px] border-l border-white/10 transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col shadow-2xl ${isCommandCenterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 pb-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.05] to-transparent">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                  <Terminal className="w-6 h-6 text-brand-neon" strokeWidth={1.5} />
               </div>
               <div>
                  <h3 className="font-extrabold text-white text-lg tracking-tight leading-tight">Command Center</h3>
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Operacional • AetherLabs
                  </p>
               </div>
             </div>
             <button onClick={() => setIsCommandCenterOpen(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/10 border border-transparent hover:border-white/10">
               <X size={20} strokeWidth={2} />
             </button>
          </div>

          <div className="flex p-2 bg-[#050510] border-b border-white/5 shadow-inner">
             <button onClick={() => setCommandCenterTab('ai')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${commandCenterTab === 'ai' ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>Amani AI</button>
             <button onClick={() => setCommandCenterTab('notifications')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${commandCenterTab === 'notifications' ? 'bg-brand-magenta/10 text-brand-magenta shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                Notificações <span className="bg-brand-magenta text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-[0_0_10px_rgba(236,72,153,0.5)]">{events.filter(e => e.type === 'checkout').length}</span>
             </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
             {/* Notificacoes */}
             {commandCenterTab === 'notifications' && (
               <div className="absolute inset-0 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {events.filter(e => e.type === 'checkout').sort((a,b) => b.timestamp - a.timestamp).map((evt, idx) => (
                    <div key={idx} className="bg-white/5 border border-brand-magenta/20 rounded-2xl p-4 flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-brand-magenta/10 flex flex-shrink-0 items-center justify-center text-brand-magenta">
                         <AlertCircle size={18} />
                       </div>
                       <div>
                          <div className="text-white font-bold text-sm">Novo Checkout Iniciado</div>
                          <div className="text-gray-400 text-xs mt-1">Sessão: <span className="font-mono text-[10px] bg-black/50 px-1 py-0.5 rounded border border-white/10">{evt.sessionId?.substring(0,8) || 'unknown'}...</span></div>
                          <div className="text-brand-neon font-bold text-sm mt-2">{evt.value?.toLocaleString()} MT</div>
                       </div>
                    </div>
                  ))}
                  {events.filter(e => e.type === 'checkout').length === 0 && (
                     <div className="text-center text-gray-500 py-10 font-medium text-sm">Nenhuma notificação recente.</div>
                  )}
               </div>
             )}

             {/* Amani AI Chat (Admin Mode) */}
             {commandCenterTab === 'ai' && (
               <div className="absolute inset-0 flex flex-col bg-transparent">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {adminChatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-[0.8rem] bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                             <Terminal className="w-4 h-4 text-brand-neon" strokeWidth={2} />
                          </div>
                        )}
                        <div className={`max-w-[82%] px-6 py-4 text-[13px] leading-relaxed font-medium ${
                          msg.role === 'user' 
                            ? 'bg-white text-black rounded-[1.8rem] rounded-tr-sm shadow-[0_10px_30px_rgba(255,255,255,0.1)]' 
                            : 'bg-white/5 border border-white/10 text-gray-300 rounded-[1.8rem] rounded-tl-sm shadow-inner prose prose-invert prose-sm max-w-none'
                        }`}>
                          {msg.role === 'user' ? (
                            msg.content
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    ))}
                    {isAdminChatLoading && (
                      <div className="flex justify-start items-center">
                         <div className="w-8 h-8 rounded-[0.8rem] bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center shrink-0 mr-3 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                             <Terminal className="w-4 h-4 text-brand-neon" strokeWidth={2} />
                         </div>
                         <div className="bg-white/5 border border-white/10 rounded-[1.5rem] rounded-tl-sm px-5 py-4 flex items-center gap-2 h-12 shadow-inner">
                           <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                           <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                           <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-150"></span>
                         </div>
                      </div>
                    )}
                  </div>
                  <div className="p-5 pt-2 bg-transparent">
                    <form onSubmit={async (e) => {
                       e.preventDefault();
                       if (!adminChatInput.trim() || isAdminChatLoading) return;
                       const userMsg = adminChatInput.trim();
                       setAdminChatInput('');
                       setAdminChatMessages(prev => [...prev, {role: 'user', content: userMsg}]);
                       setIsAdminChatLoading(true);
                       try {
                          const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
                          if (!apiKey) throw new Error("API Key missing");
                          const ai = new GoogleGenAI({ 
                            apiKey,
                            vertexai: { project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware', location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1' } as any
                          });
                          const ctx = `Estás no painel de administração da loja. Stock: ${products.length} produtos. Total Checkouts: ${events.filter(e => e.type === 'checkout').length}.`;
                          const prompt = ctx + "\n" + adminChatMessages.map(m => `${m.role}: ${m.content}`).join("\n") + "\nuser: " + userMsg;
                          
                          const startTime = performance.now();
                          const res = await ai.models.generateContent({
                              model: "gemini-3.1-pro-preview",
                              contents: prompt,
                              config: { systemInstruction: "Você é Amani 3, assistente IA exclusiva do Administrador da Hardware Sale desenvolvida pela AetherLabs. Responda de forma curta, técnica e focada em gestão de e-commerce, análise de dados e performance corporativa." }
                          });
                          const endTime = performance.now();
                          
                          const text = res.text || "Sem resposta da rede neural.";
                          const totalTokens = res.usageMetadata?.totalTokenCount || Math.ceil((prompt.length + text.length) / 4);
                          
                          setAdminChatMessages(prev => [...prev, {role: 'assistant', content: text}]);
                          logAetherLabsUsage(endTime - startTime, prompt, text, totalTokens);
                       } catch(err) {
                          setAdminChatMessages(prev => [...prev, {role: 'assistant', content: "Erro na Matrix: Verifique suas variáveis de ambiente ou a conexão com a AetherLabs."}]);
                       }
                       setIsAdminChatLoading(false);
                    }} className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-1.5 transition-all focus-within:border-brand-neon/50 focus-within:bg-black/60 shadow-inner group">
                      <div className="pl-4 pr-2 text-gray-500">
                         <Terminal size={16} strokeWidth={2} className="group-focus-within:text-brand-neon transition-colors" />
                      </div>
                      <input 
                        type="text"
                        value={adminChatInput}
                        onChange={e => setAdminChatInput(e.target.value)}
                        placeholder="Executar comando..."
                        className="flex-1 bg-transparent border-0 text-white placeholder:text-gray-500 h-12 px-2 focus:outline-none focus:ring-0 text-sm font-medium"
                      />
                      <button 
                        type="submit" 
                        disabled={isAdminChatLoading || !adminChatInput.trim()} 
                        className="w-10 h-10 rounded-full bg-brand-neon text-black hover:bg-brand-magenta transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-gray-500 flex items-center justify-center shrink-0 mr-1 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:shadow-none"
                      >
                         {isAdminChatLoading ? <Loader2 size={16} className="animate-spin text-black" /> : <ArrowUp size={18} strokeWidth={3} className="text-black" />}
                      </button>
                    </form>
                    <div className="text-center mt-3">
                      <span className="text-[9px] font-bold text-gray-600 tracking-widest uppercase">Admin Neural Processing by AetherLabs</span>
                    </div>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 p-4 lg:p-10 z-10">
          <div className="max-w-7xl mx-auto">
            {/* --- TAB: DASHBOARD --- */}
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Visão Geral</h2>
                  <p className="text-gray-400">Métricas principais e estado do inventário.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-neon/10 blur-[40px] rounded-full group-hover:bg-brand-neon/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center text-brand-neon">
                        <Package size={20} />
                      </div>
                      <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total Produtos</div>
                    </div>
                    <div className="text-5xl font-bold text-white tracking-tighter relative z-10">{products.length}</div>
                  </div>
                  
                  <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-magenta/10 blur-[40px] rounded-full group-hover:bg-brand-magenta/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center text-brand-magenta">
                        <HardDrive size={20} />
                      </div>
                      <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Valor em Stock</div>
                    </div>
                    <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta relative z-10 tracking-tight">
                      {products.reduce((acc, p) => acc + (p.status === 'stock' || p.status === 'na_box' ? Number(p.price) : 0), 0).toLocaleString()} <span className="text-lg text-white font-medium">MT</span>
                    </div>
                  </div>

                  <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 blur-[40px] rounded-full group-hover:bg-green-500/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center text-green-400">
                        <Cpu size={20} />
                      </div>
                      <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Pronta Entrega</div>
                    </div>
                    <div className="text-5xl font-bold text-white tracking-tighter relative z-10">{products.filter(p => p.status === 'stock').length}</div>
                  </div>

                  <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center text-blue-400">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Por Encomenda</div>
                    </div>
                    <div className="text-5xl font-bold text-white tracking-tighter relative z-10">{products.filter(p => p.status === 'encomenda').length}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* --- ANALYTICS PANEL & AI --- */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-8 shadow-xl">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Análise Geral ({analyticsFilter})</h3>
                        <div className="flex gap-2 bg-white/5 border border-white/10 p-1 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500">
                          <button onClick={() => setAnalyticsFilter('30D')} className={`px-3 py-1.5 rounded-lg transition-colors ${analyticsFilter === '30D' ? 'bg-white/10 text-white' : 'hover:text-white'}`}>30D</button>
                          <button onClick={() => setAnalyticsFilter('90D')} className={`px-3 py-1.5 rounded-lg transition-colors ${analyticsFilter === '90D' ? 'bg-white/10 text-white' : 'hover:text-white'}`}>90D</button>
                          <button onClick={() => setAnalyticsFilter('1Y')} className={`px-3 py-1.5 rounded-lg transition-colors ${analyticsFilter === '1Y' ? 'bg-white/10 text-white' : 'hover:text-white'}`}>1Y</button>
                        </div>
                      </div>
                      
                      {(() => {
                        const now = new Date();
                        const timeFrameMs = analyticsFilter === '30D' ? 30*24*60*60*1000 : analyticsFilter === '90D' ? 90*24*60*60*1000 : 365*24*60*60*1000;
                        const filteredEvents = events.filter(e => {
                          const eventTime = e.timestamp ? (e.timestamp.toMillis ? e.timestamp.toMillis() : e.timestamp) : now.getTime();
                          return (now.getTime() - eventTime) < timeFrameMs;
                        });

                        const cartEvents = filteredEvents.filter(e => e.type === 'add_to_cart');
                        const checkoutEvents = filteredEvents.filter(e => e.type === 'checkout');
                        const pageviews = filteredEvents.filter(e => e.type === 'pageview');

                        const uniqueUsers = new Set(pageviews.map(e => e.sessionId)).size;
                        const conversionRate = uniqueUsers > 0 ? ((checkoutEvents.length / uniqueUsers) * 100).toFixed(1) : '0.0';
                        const estimatedProfit = checkoutEvents.reduce((acc, e) => acc + (e.value || 0), 0) * 0.15; // 15% margin
                        
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Users Ativos</div>
                              <div className="text-2xl font-bold text-white">{uniqueUsers}</div>
                              <div className="text-xs text-green-400 mt-1 flex items-center gap-1">+{(uniqueUsers * 0.1).toFixed(0)}% <ArrowUpRight size={12}/></div>
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Conversão</div>
                              <div className="text-2xl font-bold text-brand-neon">{conversionRate}%</div>
                              <div className="text-[10px] text-gray-500 mt-1">{checkoutEvents.length} checkouts</div>
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">No Carrinho</div>
                              <div className="text-2xl font-bold text-white">{cartEvents.length}</div>
                              <div className="text-[10px] text-gray-500 mt-1">Acções totais</div>
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Lucro Estimado</div>
                              <div className="text-xl font-bold text-brand-magenta">{(estimatedProfit / 1000).toFixed(1)}k <span className="text-xs">MT</span></div>
                              <div className="text-[10px] text-gray-500 mt-1">Margem 15%</div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Real Chart Area based on events grouping */}
                      <div className="h-40 w-full flex items-end gap-2 px-2 opacity-50 relative group">
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg z-10">
                           <span className="text-xs font-bold text-white uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full bg-black">Visualização Ativa de Tráfego (Últimos 30 Dias)</span>
                        </div>
                        {(() => {
                           const days = 30;
                           const now = new Date();
                           const chartData = Array.from({ length: days }).map((_, i) => {
                             const d = new Date(now);
                             d.setDate(d.getDate() - (days - 1 - i));
                             d.setHours(0,0,0,0);
                             return { date: d, count: 0 };
                           });

                           events.forEach(e => {
                             if (e.type !== 'pageview') return;
                             const eventTime = e.timestamp ? (e.timestamp.toMillis ? e.timestamp.toMillis() : e.timestamp) : now.getTime();
                             const eDate = new Date(eventTime);
                             eDate.setHours(0,0,0,0);
                             
                             const diffTime = now.getTime() - eDate.getTime();
                             const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                             
                             if (diffDays >= 0 && diffDays < days) {
                               const index = days - 1 - diffDays;
                               if (chartData[index]) chartData[index].count++;
                             }
                           });

                           const maxCount = Math.max(...chartData.map(d => d.count), 1);
                           return chartData.map((d, i) => (
                             <div key={i} className="flex-1 bg-gradient-to-t from-brand-neon/40 to-brand-magenta/40 rounded-t-sm transition-all duration-500 hover:from-brand-neon hover:to-brand-magenta relative" style={{ height: `${Math.max(5, (d.count / maxCount) * 100)}%` }}>
                               <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 bg-black text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 whitespace-nowrap z-20">
                                 {d.count} views
                               </div>
                             </div>
                           ));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* AI INTEGRATION MODULE */}
                  <div className="lg:col-span-1">
                    <div className="bg-gradient-to-b from-[#1a1025] to-[#0a0a14] border border-brand-magenta/20 rounded-3xl p-6 shadow-xl h-full flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neon/10 blur-[50px] rounded-full pointer-events-none"></div>
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-brand-magenta/20 border border-brand-magenta/50 flex items-center justify-center text-brand-magenta">
                          <Cpu size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white leading-tight">Vertex AI Insights</h3>
                          <div className="text-[9px] uppercase tracking-widest text-brand-neon font-bold">Analista de Negócios / Site Analysis</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-6 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
                        {aiInsights || "A inteligência Matrix está pronta para analisar os dados reais do site, cruzar com o inventário e entregar estratégias de conversão de alto impacto e análise de crescimento."}
                      </p>
                      <Button 
                        disabled={generatingInsights}
                        onClick={async () => {
                          setGeneratingInsights(true);
                          try {
                            const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
                            if (!apiKey) throw new Error("VITE_VERTEX_API_KEY missing");
                            
                            const ai = new GoogleGenAI({ 
                              apiKey,
                              vertexai: {
                                project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware',
                                location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1'
                              } as any
                            });
                            const now = new Date();
                            const timeFrameMs = analyticsFilter === '30D' ? 30*24*60*60*1000 : analyticsFilter === '90D' ? 90*24*60*60*1000 : 365*24*60*60*1000;
                            const filteredEvents = events.filter(e => {
                              const eventTime = e.timestamp ? (e.timestamp.toMillis ? e.timestamp.toMillis() : e.timestamp) : now.getTime();
                              return (now.getTime() - eventTime) < timeFrameMs;
                            });
    
                            const cartEvents = filteredEvents.filter(e => e.type === 'add_to_cart');
                            const checkoutEvents = filteredEvents.filter(e => e.type === 'checkout');
                            const pageviews = filteredEvents.filter(e => e.type === 'pageview');
                            const uniqueUsers = new Set(pageviews.map(e => e.sessionId)).size;
                            
                            const prompt = `Atue como um analista de dados especialista e estrategista cibernético para a Hardware Sale (e-commerce real em Moçambique).
Dados Locais do Projeto:
- Produtos em Stock: ${products.filter(p => p.status === 'stock').length}
- Valor em Stock: ${products.reduce((acc, p) => acc + (p.status === 'stock' || p.status === 'na_box' ? Number(p.price) : 0), 0)} MT
Site Analysis (${analyticsFilter}):
- Visitantes Ativos Únicos: ${uniqueUsers}
- Adições ao Carrinho: ${cartEvents.length}
- Checkouts Iniciados: ${checkoutEvents.length}
- Taxa de Crescimento (Simulada): +10% 

Forneça uma análise global rápida do contexto, recomende estratégias precisas para converter mais visitantes em leads/compradores e sugira como alavancar a audiência atual. Seja incisivo, tom corporativo agressivo. Mantenha em 4 frases diretas.`;

                            const startTime = performance.now();
                            const response = await ai.models.generateContent({
                                model: "gemini-3.1-pro-preview",
                                contents: prompt,
                            });
                            const endTime = performance.now();
                            setAiInsights(response.text || null);
                            logAetherLabsUsage(endTime - startTime, prompt, response.text || "");
                          } catch (err: any) {
                            setAiInsights("Erro ao conectar à Vertex AI. Verifique as variáveis de ambiente.");
                            console.error(err);
                          } finally {
                            setGeneratingInsights(false);
                          }
                        }}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl py-6 font-bold flex items-center justify-center gap-2 transition-all relative z-10"
                      >
                        {generatingInsights ? <div className="w-5 h-5 rounded-full border-2 border-brand-neon border-t-transparent animate-spin" /> : <LineChart size={18} />}
                        {generatingInsights ? 'Processando Telemetria...' : 'Gerar Estratégia Matrix'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-[#0a0a14] border border-white/5 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-6">Produtos Adicionados Recentemente</h3>
                  {loading ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand-neon border-t-transparent animate-spin"></div></div>
                  ) : products.length > 0 ? (
                    <div className="space-y-4">
                      {products.slice(0, 5).map(product => (
                        <div key={product.id} className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                          <img src={product.images && product.images[0] ? product.images[0] : 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c'} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-white/10 bg-white/5" />
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-lg">{product.name}</h4>
                            <div className="text-gray-400 text-sm font-medium">{product.category}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-brand-neon">{Number(product.price).toLocaleString()} MT</div>
                            <div className={`text-[10px] uppercase font-bold tracking-widest inline-block px-2 py-0.5 rounded-full mt-1 ${
                                product.status === 'stock' ? 'bg-green-500/20 text-green-400' :
                                product.status === 'encomenda' ? 'bg-blue-500/20 text-blue-400' :
                                product.status === 'na_box' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-orange-500/20 text-orange-400'
                              }`}>{product.status?.replace('_', ' ')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 font-medium text-center py-10">Nenhum produto encontrado.</p>
                  )}
                </div>
              </div>
            )}

            {/* --- TAB: PRODUTOS --- */}
            {activeTab === 'products' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Gestão de Produtos</h2>
                    <p className="text-gray-400 mb-4">Catálogo completo da Hardware Sale.</p>
                    <div className="flex flex-wrap gap-2">
                      {['Todos', "Desktop's", 'Displays', 'Components', 'Consolas', 'Laptops', 'Gadgets'].map(c => (
                        <button 
                          key={c}
                          onClick={() => setAdminProductFilter(c)}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors border ${adminProductFilter === c ? 'bg-brand-neon text-black border-brand-neon' : 'bg-transparent text-gray-500 border-white/10 hover:text-white'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      setIsAdding(!isAdding);
                      if (isAdding) {
                         setEditingId(null);
                         setName(''); setPrice(''); setImages(''); setDesc(''); setTags(''); setSubCategory(''); setSpecsList([{key: '', value: ''}]);
                      }
                    }}
                    className="bg-brand-neon hover:bg-brand-magenta text-black font-bold border-0 rounded-xl px-6 h-12 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  >
                    {isAdding ? 'Cancelar' : <><Plus size={18} className="mr-2" /> Novo Produto</>}
                  </Button>
                </div>

                {isAdding && (
                  <div className="mb-8 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
                      
                      {/* AI Magic Fill Banner - COMPACT */}
                      <div className="bg-gradient-to-r from-brand-neon/10 to-brand-magenta/10 rounded-xl p-3 border border-brand-neon/20 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                           <Sparkles className="w-5 h-5 text-brand-neon" />
                           <div>
                             <h3 className="font-bold text-white text-sm">Amani Neural Fill</h3>
                             <p className="text-xs text-gray-400 hidden sm:block">Digite o nome da peça e a IA preenche o resto.</p>
                           </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: RTX 4090" className="w-full sm:w-48 bg-black/40 border-white/10 h-8 rounded-lg text-white text-xs focus:border-brand-neon" />
                          <Button type="button" onClick={handleAutocomplete} disabled={!name || isAutoCompleting} className="h-8 bg-white text-black font-bold rounded-lg px-4 text-xs hover:bg-gray-200">
                            {isAutoCompleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Autofill'}
                          </Button>
                        </div>
                      </div>

                      {/* Main Form Area - Dense Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Col 1 & 2: General & Specs */}
                        <div className="lg:col-span-2 space-y-4">
                          <div className="bg-[#0a0a14] border border-white/5 rounded-xl p-4 shadow-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                               <div className="col-span-2">
                                 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome</label>
                                 <Input required value={name} onChange={e => setName(e.target.value)} className="bg-black/40 border-white/10 h-9 px-3 text-white text-xs rounded-lg focus:border-brand-neon transition-colors" placeholder="Nome Completo..." />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Preço (MT)</label>
                                 <Input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-black/40 border-white/10 h-9 px-3 text-brand-neon font-bold text-xs rounded-lg focus:border-brand-neon transition-colors" placeholder="0.00" />
                               </div>
                               <div className="flex flex-col gap-2">
                                 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categoria</label>
                                 <select required value={category} onChange={e => { setCategory(e.target.value); setSubCategory(''); }} className="w-full bg-black/40 border border-white/10 rounded-lg h-9 px-3 text-xs font-bold text-white focus:outline-none focus:border-brand-neon appearance-none cursor-pointer">
                                   <option value="Desktop's" className="bg-[#0a0a14] text-white">Desktop's</option>
                                   <option value="Displays" className="bg-[#0a0a14] text-white">Displays</option>
                                   <option value="Components" className="bg-[#0a0a14] text-white">Components</option>
                                   <option value="Consolas" className="bg-[#0a0a14] text-white">Consolas</option>
                                   <option value="Laptops" className="bg-[#0a0a14] text-white">Laptops</option>
                                   <option value="Gadgets" className="bg-[#0a0a14] text-white">Gadgets</option>
                                 </select>
                               </div>
                            </div>
                            
                            {/* Dynamic Subcategory based on Category */}
                            {(category === 'Components' || category === 'Monitores' || category === 'Consolas' || category === 'Laptops' || category === 'Celulares' || category === 'Displays' || category === 'Gadgets') && (
                              <div className="mb-3 animate-in fade-in zoom-in duration-300">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sub-Categoria</label>
                                <select required value={subCategory} onChange={e => setSubCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg h-9 px-3 text-xs font-bold text-brand-neon focus:outline-none focus:border-brand-neon appearance-none cursor-pointer">
                                   <option value="" disabled className="bg-[#0a0a14] text-gray-500">Selecione a variante...</option>
                                   {category === 'Components' && ['GPU', 'CPU', 'RAM', 'Armazenamento', 'Motherboard', 'Fonte', 'Case', 'Air Cooler', 'Liquid Cooling', 'Fans', 'Teclado', 'Rato', 'Headsets', 'Mousepad'].map(sub => <option key={sub} value={sub} className="bg-[#0a0a14] text-white">{sub}</option>)}
                                   {(category === 'Monitores' || category === 'Displays') && ['Monitores', 'Suportes'].map(sub => <option key={sub} value={sub} className="bg-[#0a0a14] text-white">{sub}</option>)}
                                   {category === 'Consolas' && ['Consolas', 'Acessórios'].map(sub => <option key={sub} value={sub} className="bg-[#0a0a14] text-white">{sub}</option>)}
                                   {category === 'Laptops' && ['Laptops', 'Acessórios'].map(sub => <option key={sub} value={sub} className="bg-[#0a0a14] text-white">{sub}</option>)}
                                   {category === 'Celulares' && ['Android', 'iOS'].map(sub => <option key={sub} value={sub} className="bg-[#0a0a14] text-white">{sub}</option>)}
                                   {category === 'Gadgets' && ['Webcam', 'Chairs / Cadeiras', 'Audio & Som', 'Routers & Redes', 'Acessórios Diversos'].map(sub => <option key={sub} value={sub} className="bg-[#0a0a14] text-white">{sub}</option>)}
                                </select>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-3 gap-3 mb-3">
                               <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Disponibilidade</label>
                                  <select required value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg h-9 px-3 text-xs font-bold text-white focus:outline-none focus:border-brand-neon appearance-none cursor-pointer">
                                    <option value="stock" className="bg-[#0a0a14] text-white">Em Stock</option>
                                    <option value="encomenda" className="bg-[#0a0a14] text-white">Por Encomenda</option>
                                  </select>
                               </div>
                               <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estado Físico</label>
                                  <select required value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg h-9 px-3 text-xs font-bold text-white focus:outline-none focus:border-brand-neon appearance-none cursor-pointer">
                                    <option value="novo" className="bg-[#0a0a14] text-white">Novo</option>
                                    <option value="na_box" className="bg-[#0a0a14] text-white">Na Box (Selado)</option>
                                    <option value="usado" className="bg-[#0a0a14] text-white">Usado (Premium)</option>
                                  </select>
                               </div>
                               <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tags (Vírgula)</label>
                                  <Input value={tags} onChange={e => setTags(e.target.value)} className="bg-black/40 border-white/10 h-9 px-3 text-xs text-white rounded-lg focus:border-brand-neon transition-colors" placeholder="Ex: RTX, 4K" />
                               </div>
                            </div>

                            <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição</label>
                               <textarea required value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white min-h-[60px] resize-y custom-scrollbar" placeholder="Descrição..." />
                            </div>
                          </div>

                          <div className="bg-[#0a0a14] border border-white/5 rounded-xl p-4 shadow-sm">
                             <div className="flex justify-between items-center mb-2">
                               <label className="block text-[10px] font-bold text-gray-500 uppercase">Especificações Técnicas</label>
                               <button type="button" onClick={() => setSpecsList([...specsList, {key: '', value: ''}])} className="text-[10px] font-bold text-brand-neon hover:text-white flex items-center gap-1"><Plus size={12}/> Adicionar</button>
                             </div>
                             
                             <div className="flex flex-wrap gap-1.5 mb-3">
                               <span className="text-[9px] font-bold text-gray-600 uppercase mr-1 flex items-center">Templates:</span>
                               <button type="button" onClick={() => setSpecsList([{key: 'VRAM', value: ''}, {key: 'Interface', value: ''}, {key: 'Clock', value: ''}, {key: 'Cores', value: ''}])} className="text-[9px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">GPU</button>
                               <button type="button" onClick={() => setSpecsList([{key: 'Cores', value: ''}, {key: 'Threads', value: ''}, {key: 'Clock Base', value: ''}, {key: 'Socket', value: ''}])} className="text-[9px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">CPU</button>
                               <button type="button" onClick={() => setSpecsList([{key: 'Capacidade', value: ''}, {key: 'Frequência', value: ''}, {key: 'Tipo', value: ''}, {key: 'Latência', value: ''}])} className="text-[9px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">RAM</button>
                               <button type="button" onClick={() => setSpecsList([{key: 'CPU', value: ''}, {key: 'GPU', value: ''}, {key: 'RAM', value: ''}, {key: 'Armazenamento', value: ''}, {key: 'Motherboard', value: ''}])} className="text-[9px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">Desktop</button>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                               {specsList.map((spec, index) => (
                                 <div key={index} className="flex items-center gap-2 group bg-white/[0.02] p-1.5 rounded-lg border border-white/5 hover:border-brand-neon/30 transition-colors">
                                   <Input value={spec.key} onChange={e => { const newSpecs = [...specsList]; newSpecs[index].key = e.target.value; setSpecsList(newSpecs); }} placeholder="Chave (Ex: VRAM)" className="w-1/3 bg-transparent border-0 h-8 text-xs px-2 text-brand-neon font-bold focus-visible:ring-0 placeholder:text-gray-600" />
                                   <span className="text-gray-600 font-bold">:</span>
                                   <Input value={spec.value} onChange={e => { const newSpecs = [...specsList]; newSpecs[index].value = e.target.value; setSpecsList(newSpecs); }} placeholder="Valor (Ex: 24GB)" className="flex-1 bg-transparent border-0 h-8 text-xs px-2 text-white focus-visible:ring-0 placeholder:text-gray-600" />
                                   <button type="button" onClick={() => { const newSpecs = specsList.filter((_, i) => i !== index); setSpecsList(newSpecs.length ? newSpecs : [{key: '', value: ''}]); }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"><X size={14} /></button>
                                 </div>
                               ))}
                             </div>
                          </div>
                        </div>

                        {/* Col 3: Media & Actions */}
                        <div className="flex flex-col gap-4">
                           <div className="bg-[#0a0a14] border border-white/5 rounded-xl p-4 shadow-sm flex-1 flex flex-col">
                             <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Imagens</label>
                             <div className="relative border border-dashed border-white/10 rounded-xl p-4 hover:border-brand-neon/30 transition-colors flex flex-col items-center justify-center text-center cursor-pointer mb-3 bg-white/[0.02] flex-1 min-h-[100px]">
                               <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                               <Plus size={16} className="text-gray-500 mb-1" />
                               <p className="text-[10px] text-gray-400 font-bold">Arraste ou Clique (Max 4MB)</p>
                             </div>
                             <Input value={images} onChange={e => setImages(e.target.value)} className="bg-white/5 border-white/10 h-8 text-[10px] rounded-lg mb-2" placeholder="URLs online (separadas por |||)" />
                             
                             {images && (
                               <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[80px] custom-scrollbar">
                                 {images.split('|||').map((img, i) => img.trim() && (
                                   <div key={i} className="relative w-12 h-12 rounded-md border border-white/10 bg-black/50 overflow-hidden group shrink-0 cursor-zoom-in" onClick={() => setPreviewImage(img.trim())}>
                                     <button type="button" onClick={(e) => { e.stopPropagation(); setImages(images.split('|||').filter((_, idx) => idx !== i).join('|||')); }} className="absolute top-0.5 right-0.5 bg-red-500 rounded text-white z-10 opacity-0 group-hover:opacity-100"><X size={10} /></button>
                                     <img src={img.trim()} alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=50&q=80' }} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                           
                           {/* Actions */}
                           <div className="bg-[#0a0a14] border border-white/5 rounded-xl p-3 flex justify-end gap-2 shadow-sm shrink-0">
                              <Button type="button" onClick={() => {
                                 setIsAdding(false);
                                 setEditingId(null);
                                 setName(''); setPrice(''); setImages(''); setDesc(''); setTags(''); setSubCategory(''); setSpecsList([{key: '', value: ''}]);
                              }} variant="ghost" className="h-8 text-xs px-4 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border-0">Cancelar</Button>
                              <Button type="submit" className="h-8 text-xs px-6 bg-brand-neon hover:bg-brand-magenta text-black font-bold shadow-md rounded-lg">
                                {editingId ? 'Atualizar' : 'Guardar Produto'}
                              </Button>
                           </div>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {!isAdding && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loading ? (
                    <div className="col-span-full py-20 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand-neon border-t-transparent animate-spin"></div></div>
                  ) : products.length > 0 ? (
                    products.filter(p => adminProductFilter === 'Todos' || p.category === adminProductFilter || (adminProductFilter === 'Displays' && p.category === 'Monitores')).map(product => (
                      <div key={product.id} className="bg-[#0a0a14] border border-white/5 rounded-3xl p-5 group hover:border-brand-neon/30 hover:bg-[#110e1b] transition-all duration-300 relative">
                        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                           <button 
                            onClick={() => handleEdit(product)}
                            className="bg-brand-neon/20 text-brand-neon p-2 rounded-xl hover:bg-brand-neon hover:text-black transition-colors backdrop-blur-md border border-brand-neon/20"
                           >
                              <Settings size={18} />
                           </button>
                           <button 
                            onClick={() => handleDelete(product.id)}
                            className="bg-red-500/20 text-red-400 p-2 rounded-xl hover:bg-red-500 hover:text-white transition-colors backdrop-blur-md border border-red-500/20"
                           >
                              <Trash2 size={18} />
                           </button>
                        </div>
                        <div className="w-full aspect-square bg-black/40 rounded-2xl mb-4 overflow-hidden border border-white/5 p-4 flex items-center justify-center">
                          <img src={product.images && product.images[0] ? product.images[0] : 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c'} alt={product.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex gap-2 mb-3 flex-wrap">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 bg-white/5 px-2 py-1 rounded-md border border-white/10">{product.category}</span>
                          <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border border-white/10 ${
                                product.status === 'stock' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}>{product.status?.replace('_', ' ')}</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border border-white/10 bg-white/5 text-gray-300">{product.specs?.['Estado'] || 'Novo'}</span>
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1 leading-tight line-clamp-2 min-h-[2.8rem]">{product.name}</h3>
                        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">{Number(product.price).toLocaleString()} MT</div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-gray-500">
                        <Package size={32} />
                      </div>
                      <p className="text-gray-400 font-medium">Nenhum produto encontrado. Adicione o primeiro.</p>
                    </div>
                  )}
                 </div>
                )}
              </div>
            )}

            {/* --- TAB: BUILDER --- */}
            {activeTab === 'builder' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0a0a14] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden gap-4 mb-8">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-neon/10 blur-[100px] rounded-full pointer-events-none"></div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Gestor do Smart Builder</h2>
                    <p className="text-gray-400 font-medium">Controle total sobre o inventário disponível no configurador de PCs.</p>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <Button 
                      onClick={() => setIsAddingBuilder(!isAddingBuilder)}
                      className="bg-brand-neon hover:bg-brand-magenta text-black font-bold border-0 rounded-xl px-6 h-12 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    >
                      {isAddingBuilder ? 'Cancelar' : <><Plus size={18} className="mr-2" /> Add Componente</>}
                    </Button>
                  </div>
                </div>

                {isAddingBuilder && (
                  <div className="mb-8 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleAddBuilderComponent} className="flex flex-col gap-4">
                      {/* AI Magic Fill Banner - COMPACT */}
                      <div className="bg-gradient-to-r from-brand-neon/10 to-brand-magenta/10 rounded-xl p-3 border border-brand-neon/20 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                           <Sparkles className="w-5 h-5 text-brand-neon" />
                           <div>
                             <h3 className="font-bold text-white text-sm">Amani Neural Builder Fill</h3>
                             <p className="text-xs text-gray-400 hidden sm:block">Digite o nome do componente para preencher tipo, socket e voltagem.</p>
                           </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Input value={bName} onChange={e => setBName(e.target.value)} placeholder="Ex: RTX 4090" className="w-full sm:w-48 bg-black/40 border-white/10 h-8 rounded-lg text-white text-xs focus:border-brand-neon" />
                          <Button type="button" onClick={handleBuilderAutocomplete} disabled={!bName || isAutoCompleting} className="h-8 bg-white text-black font-bold rounded-lg px-4 text-xs hover:bg-gray-200">
                            {isAutoCompleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Autofill'}
                          </Button>
                        </div>
                      </div>

                      {/* Main Form Area - Dense Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Col 1 & 2: General & Specs */}
                        <div className="lg:col-span-2 space-y-4">
                          <div className="bg-[#0a0a14] border border-white/5 rounded-xl p-4 shadow-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                               <div className="col-span-2">
                                 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome do Componente</label>
                                 <Input required value={bName} onChange={e => setBName(e.target.value)} className="bg-black/40 border-white/10 h-9 px-3 text-white text-xs rounded-lg focus:border-brand-neon transition-colors" placeholder="Nome Completo..." />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Preço (MT)</label>
                                 <Input required type="number" value={bPrice} onChange={e => setBPrice(e.target.value)} className="bg-black/40 border-white/10 h-9 px-3 text-brand-neon font-bold text-xs rounded-lg focus:border-brand-neon transition-colors" placeholder="0.00" />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo Builder</label>
                                 <select required value={bType} onChange={e => setBType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg h-9 px-3 text-xs font-bold text-brand-neon focus:outline-none focus:border-brand-neon appearance-none cursor-pointer">
                                   <option value="cpu" className="bg-[#0a0a14] text-white">CPU</option>
                                   <option value="gpu" className="bg-[#0a0a14] text-white">GPU</option>
                                   <option value="motherboard" className="bg-[#0a0a14] text-white">Motherboard</option>
                                   <option value="ram" className="bg-[#0a0a14] text-white">RAM</option>
                                   <option value="psu" className="bg-[#0a0a14] text-white">Fonte (PSU)</option>
                                   <option value="case" className="bg-[#0a0a14] text-white">Case</option>
                                   <option value="storage" className="bg-[#0a0a14] text-white">Armazenamento</option>
                                   <option value="cooler" className="bg-[#0a0a14] text-white">Cooler</option>
                                   <option value="fans" className="bg-[#0a0a14] text-white">Fans</option>
                                   <option value="peripheral" className="bg-[#0a0a14] text-white">Peripheral</option>
                                 </select>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                               <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Socket/Compatibilidade (Opcional)</label>
                                  <Input value={bSocket} onChange={e => setBSocket(e.target.value)} className="bg-black/40 border-white/10 h-9 px-3 text-xs text-white rounded-lg focus:border-brand-neon transition-colors" placeholder="Ex: LGA1700, AM5, ATX" />
                               </div>
                               <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Consumo / Capacidade (Watts)</label>
                                  <Input type="number" value={bWattage} onChange={e => setBWattage(e.target.value)} className="bg-black/40 border-white/10 h-9 px-3 text-xs text-white rounded-lg focus:border-brand-neon transition-colors" placeholder="Ex: 120 (Se CPU/GPU) ou 850 (Se PSU)" />
                               </div>
                            </div>
                            
                            <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Specs Curtas (Separadas por vírgula. Máx 3)</label>
                               <Input required value={bSpecs} onChange={e => setBSpecs(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-lg h-9 px-3 text-xs text-white focus:outline-none focus:border-brand-neon" placeholder="Ex: 24 Cores, 6.2GHz, 125W TDP" />
                            </div>
                          </div>
                        </div>

                        {/* Col 3: Media & Actions */}
                        <div className="flex flex-col gap-4">
                           <div className="bg-[#0a0a14] border border-white/5 rounded-xl p-4 shadow-sm flex-1 flex flex-col">
                             <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Imagens</label>
                             <div className="relative border border-dashed border-white/10 rounded-xl p-4 hover:border-brand-neon/30 transition-colors flex flex-col items-center justify-center text-center cursor-pointer mb-3 bg-white/[0.02] flex-1 min-h-[100px]">
                               <input type="file" multiple accept="image/*" onChange={handleBuilderImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                               <Plus size={16} className="text-gray-500 mb-1" />
                               <p className="text-[10px] text-gray-400 font-bold">Upload (Max 4MB)</p>
                             </div>
                             <Input value={bImages} onChange={e => setBImages(e.target.value)} className="bg-white/5 border-white/10 h-8 text-[10px] rounded-lg mb-2" placeholder="URLs online (separadas por |||)" />

                             {bImages && (
                               <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[80px] custom-scrollbar">
                                 {bImages.split('|||').map((img, i) => img.trim() && (
                                   <div key={i} className="relative w-12 h-12 rounded-md border border-white/10 bg-black/50 overflow-hidden group shrink-0 cursor-zoom-in" onClick={() => setPreviewImage(img.trim())}>
                                     <button type="button" onClick={(e) => { e.stopPropagation(); setBImages(bImages.split('|||').filter((_, idx) => idx !== i).join('|||')); }} className="absolute top-0.5 right-0.5 bg-red-500 rounded text-white z-10 opacity-0 group-hover:opacity-100"><X size={10} /></button>
                                     <img src={img.trim()} alt="" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=50&q=80' }} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                           
                           {/* Actions */}
                           <div className="bg-[#0a0a14] border border-white/5 rounded-xl p-3 flex justify-end gap-2 shadow-sm shrink-0">
                              <Button type="button" onClick={() => {
                                 setIsAddingBuilder(false);
                                 setBName(''); setBPrice(''); setBImages(''); setBSpecs(''); setBWattage(''); setBSocket('');
                              }} variant="ghost" className="h-8 text-xs px-4 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border-0">Cancelar</Button>
                              <Button type="submit" className="h-8 text-xs px-6 bg-brand-neon hover:bg-brand-magenta text-black font-bold shadow-md rounded-lg">
                                Adicionar ao Builder
                              </Button>
                           </div>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-8 shadow-xl">
                   <h3 className="text-xl font-bold text-white mb-6">Componentes Elegíveis para o Builder</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {products.filter(p => p.category === 'Components' || p.category === 'Gadgets').map(product => (
                        <div key={product.id} className={`p-4 rounded-2xl border transition-all flex gap-4 items-center cursor-pointer ${product.isBuilderReady ? 'bg-brand-neon/10 border-brand-neon shadow-[0_0_15px_rgba(20,241,149,0.2)]' : 'bg-black/40 border-white/5 hover:border-white/20'}`} onClick={async () => {
                           await setDoc(doc(db, 'products', product.id), { isBuilderReady: !product.isBuilderReady }, { merge: true });
                        }}>
                          <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center p-1">
                             <img src={product.images?.[0] || product.image} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-bold text-white truncate">{product.name}</h4>
                             <p className="text-xs text-gray-500">{product.subCategory || 'Sem Sub-categoria'}</p>
                          </div>
                          <div>
                             <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${product.isBuilderReady ? 'bg-brand-neon border-brand-neon text-black' : 'border-white/20 text-transparent'}`}>
                                <CheckCircle2 size={14} />
                             </div>
                          </div>
                        </div>
                     ))}
                     {products.filter(p => p.category === 'Components' || p.category === 'Gadgets').length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-10">Nenhum componente encontrado. Adicione peças no catálogo primeiro.</div>
                     )}
                   </div>
                </div>
              </div>
            )}

            {/* --- TAB: SETTINGS --- */}
            {activeTab === 'settings' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0a0a14] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden gap-4">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-magenta/10 blur-[100px] rounded-full pointer-events-none"></div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Configurações Base</h2>
                    <p className="text-gray-400 font-medium">Controles vitais da plataforma Matrix.</p>
                  </div>
                  <Button disabled={savingSettings} onClick={handleSaveSettings} className="relative z-10 bg-brand-neon text-black font-bold px-8 py-6 rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(20,241,149,0.3)] flex items-center gap-2">
                    {savingSettings ? <Loader2 size={20} className="animate-spin" /> : <Settings size={20} />}
                    {savingSettings ? 'A Salvar...' : 'Salvar Alterações'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                   <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-8">
                     <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2"><Settings size={20} className="text-brand-magenta" /> Geral</h3>
                     <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nome da Loja</label>
                          <Input value={storeSettings.storeName} onChange={(e) => setStoreSettings(prev => ({...prev, storeName: e.target.value}))} className="bg-white/5 border-white/10 h-12 text-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Moeda Principal</label>
                          <select value={storeSettings.currency} onChange={(e) => setStoreSettings(prev => ({...prev, currency: e.target.value}))} className="w-full bg-[#050510] border border-white/10 h-12 rounded-xl px-4 text-white outline-none">
                            <option value="MT" className="bg-black text-white">Metical (MT)</option>
                            <option value="USD" className="bg-black text-white">Dólar Americano ($)</option>
                            <option value="EUR" className="bg-black text-white">Euro (€)</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between p-4 border border-white/10 rounded-xl bg-white/5">
                           <div>
                              <div className="font-bold text-sm text-white">Modo Manutenção</div>
                              <div className="text-xs text-gray-400">Suspender temporariamente novas compras</div>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={storeSettings.maintenanceMode} onChange={(e) => setStoreSettings(prev => ({...prev, maintenanceMode: e.target.checked}))} className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                           </label>
                        </div>
                     </div>
                   </div>

                   <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-8">
                     <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2"><Zap size={20} className="text-brand-neon" /> Amani AI Hub</h3>
                     <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">AI Behavior Mode</label>
                          <select value={storeSettings.aiBehavior} onChange={(e) => setStoreSettings(prev => ({...prev, aiBehavior: e.target.value}))} className="w-full bg-[#050510] border border-white/10 h-12 rounded-xl px-4 text-white outline-none">
                            <option value="pro" className="bg-black text-white">Amani Pro (Default - Sales & Consult)</option>
                            <option value="technical" className="bg-black text-white">Especialista Técnico (Avançado)</option>
                            <option value="polite" className="bg-black text-white">Suporte Corporativo (Padrão)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Temperature (Criatividade AI): {storeSettings.aiTemperature}</label>
                          <input type="range" min="0" max="1" step="0.1" value={storeSettings.aiTemperature} onChange={(e) => setStoreSettings(prev => ({...prev, aiTemperature: parseFloat(e.target.value)}))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-neon" />
                          <div className="flex justify-between text-xs text-gray-500 mt-2 font-bold">
                            <span>Analítica (0.0)</span>
                            <span>Criativa (1.0)</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Email de Alertas</label>
                             <Input value={storeSettings.supportEmail} onChange={(e) => setStoreSettings(prev => ({...prev, supportEmail: e.target.value}))} className="bg-white/5 border-white/10 h-10 text-white text-sm" />
                           </div>
                           <div>
                             <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">WhatsApp Suporte</label>
                             <Input value={storeSettings.supportPhone} onChange={(e) => setStoreSettings(prev => ({...prev, supportPhone: e.target.value}))} className="bg-white/5 border-white/10 h-10 text-white text-sm" />
                           </div>
                        </div>
                     </div>
                   </div>
                </div>
              </div>
            )}

            {/* --- TAB: AETHERLABS AI --- */}
            {activeTab === 'aetherlabs' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 flex items-center gap-3">
                    <Sparkles className="text-brand-magenta" /> AetherLabs AI Hub
                  </h2>
                  <p className="text-gray-400">Métricas de uso e telemetria da Amani AI.</p>
                </div>
                
                <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-8 shadow-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                      <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Total Interações AI</div>
                      <div className="text-3xl font-bold text-white">{aiEvents.length}</div>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                      <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Tokens Consumidos</div>
                      <div className="text-3xl font-bold text-brand-neon">{aiEvents.reduce((acc, e) => acc + e.tokens, 0).toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                      <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Custo Estimado</div>
                      <div className="text-3xl font-bold text-green-400">
                        ${(aiEvents.reduce((acc, e) => acc + e.tokens, 0) * 0.000005).toFixed(4)}
                      </div>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                      <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Latência Média</div>
                      <div className="text-3xl font-bold text-brand-magenta">
                        {aiEvents.length > 0 ? (aiEvents.reduce((acc, e) => acc + e.latency, 0) / aiEvents.length).toFixed(0) : 0} <span className="text-sm">ms</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-lg mb-4">Logs Recentes</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {aiEvents.sort((a,b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : b.timestamp) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : a.timestamp)).map((log, i) => (
                      <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-4 hover:border-brand-magenta/30 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-brand-magenta/20 flex items-center justify-center text-brand-magenta">
                             <Bot size={14} />
                           </div>
                           <div>
                             <div className="text-white text-sm font-bold truncate max-w-[200px] sm:max-w-xs">Latest</div>
                             <div className="text-xs text-gray-500">{new Date(log.timestamp?.toMillis ? log.timestamp.toMillis() : log.timestamp).toLocaleString()}</div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-brand-neon text-xs font-bold">{log.tokens} tokens</div>
                           <div className="text-gray-400 text-[10px]">{log.latency.toFixed(0)} ms</div>
                        </div>
                      </div>
                    ))}
                    {aiEvents.length === 0 && (
                      <div className="text-center text-gray-500 py-8">Nenhum registro de uso da IA encontrado.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: SERVER STATUS --- */}
            {activeTab === 'status' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 flex items-center gap-3">
                    <Zap className="text-brand-neon" /> Matrix Server Status
                  </h2>
                  <p className="text-gray-400">Monitorização em tempo real das APIs e Gateways.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center"><CheckCircle2 size={24} /></div>
                     <div>
                       <div className="text-white font-bold text-lg">Firebase Database</div>
                       <div className="text-green-400 text-xs">Operacional (9ms latency)</div>
                     </div>
                  </div>
                  <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center"><CheckCircle2 size={24} /></div>
                     <div>
                       <div className="text-white font-bold text-lg">Firebase Auth</div>
                       <div className="text-green-400 text-xs">Operacional (12ms latency)</div>
                     </div>
                  </div>
                  <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center"><CheckCircle2 size={24} /></div>
                     <div>
                       <div className="text-white font-bold text-lg">Vertex AI API</div>
                       <div className="text-green-400 text-xs">Operacional (320ms latency)</div>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: CLIENTES --- */}
            {(activeTab === 'customers') && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Módulo de Clientes</h2>
                  <p className="text-gray-400">Rastreio de atividade, checkouts e engajamento baseado em telemetria.</p>
                </div>
                
                <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl">
                  {(() => {
                    const clientMap = new Map();
                    events.forEach(e => {
                       if (!e.sessionId) return;
                       if (!clientMap.has(e.sessionId)) {
                          clientMap.set(e.sessionId, { id: e.sessionId, firstSeen: e.timestamp, events: 0, checkouts: 0, totalSpent: 0, cartAdds: 0 });
                       }
                       const c = clientMap.get(e.sessionId);
                       c.events++;
                       if (e.type === 'checkout') {
                          c.checkouts++;
                          c.totalSpent += (e.value || 0);
                       } else if (e.type === 'add_to_cart') {
                          c.cartAdds++;
                       }
                       // keep earliest timestamp
                       if (e.timestamp && (!c.firstSeen || e.timestamp < c.firstSeen)) c.firstSeen = e.timestamp;
                    });
                    
                    const clients = Array.from(clientMap.values()).sort((a, b) => b.totalSpent - a.totalSpent || b.events - a.events);
                    
                    if (clients.length === 0) {
                       return (
                         <div className="flex flex-col items-center justify-center py-20">
                           <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500">
                             <Users size={32} />
                           </div>
                           <p className="text-gray-400 font-medium">Nenhum dado de cliente encontrado ainda.</p>
                         </div>
                       )
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                           <thead>
                             <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-500">
                               <th className="pb-4 font-bold pl-4">Client ID (Sessão)</th>
                               <th className="pb-4 font-bold text-center">Interações</th>
                               <th className="pb-4 font-bold text-center">Add Cart</th>
                               <th className="pb-4 font-bold text-center">Checkouts</th>
                               <th className="pb-4 font-bold text-right pr-4">Valor Gasto</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                             {clients.map(c => (
                               <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="py-4 pl-4">
                                     <div className="font-mono text-sm text-gray-300 bg-white/5 px-2 py-1 rounded inline-block border border-white/10">{c.id.substring(0, 12)}...</div>
                                  </td>
                                  <td className="py-4 text-center">
                                     <span className="text-white font-bold">{c.events}</span>
                                  </td>
                                  <td className="py-4 text-center">
                                     <span className="text-white font-medium">{c.cartAdds}</span>
                                  </td>
                                  <td className="py-4 text-center">
                                     <span className={`font-bold ${c.checkouts > 0 ? 'text-brand-neon' : 'text-gray-600'}`}>{c.checkouts}</span>
                                  </td>
                                  <td className="py-4 text-right pr-4">
                                     <span className="font-bold text-brand-magenta">{c.totalSpent.toLocaleString()} MT</span>
                                  </td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
