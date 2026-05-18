import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../store/useCart';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Trash2, ArrowRight, ShieldCheck, Smartphone, Sparkles, ShoppingCart, Loader2, X, MapPin, User, Mailbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function Checkout() {
  const { items, addItem, removeItem, total, voucher, clearCart } = useCart();
  const { products } = useStore();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'emola'>('mpesa');
  
  // New Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressPredictions, setAddressPredictions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [shippingSettings, setShippingSettings] = useState({
    baseLat: -25.9692,
    baseLng: 32.5732,
    freeRadiusKm: 15,
    costPerKmExtra: 60,
    fallbackFlatRate: 800
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync Shipping Settings from DB
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'admin_settings', 'shipping'), (docSnap) => {
      if(docSnap.exists()) {
        setShippingSettings(prev => ({...prev, ...docSnap.data()}));
      }
    });
    return () => unsub();
  }, []);

  // Address Autocomplete Logic
  useEffect(() => {
    if (!address || selectedPlaceId) {
      setAddressPredictions([]);
      return;
    }
    
    const fetchPlaces = async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(`/api/places?input=${encodeURIComponent(address)}`);
        const data = await res.json();
        if (data.predictions && data.predictions.length > 0) {
          setAddressPredictions(data.predictions);
        } else {
          // Local offline fallback heuristics
          const mock = [
            { description: 'Maputo Central, Cidade de Maputo', place_id: 'm1' },
            { description: 'Bairro da Polana, Maputo', place_id: 'm2' },
            { description: 'Sommerschield, Maputo', place_id: 'm3' },
            { description: 'Alto Maé, Maputo', place_id: 'm4' },
            { description: 'Zimpeto, Maputo', place_id: 'm5' },
            { description: 'Matola, Província de Maputo', place_id: 'm6' },
            { description: 'Machava, Matola', place_id: 'm7' },
            { description: 'Tchumene, Matola', place_id: 'm8' },
            { description: 'Boane, Província de Maputo', place_id: 'm9' },
            { description: 'Marracuene, Província de Maputo', place_id: 'm10' }
          ].filter(m => m.description.toLowerCase().includes(address.toLowerCase()));
          setAddressPredictions(mock);
        }
      } catch (err) {
        // Local offline fallback heuristics on fetch fail
        const mock = [
          { description: 'Maputo Central, Cidade de Maputo', place_id: 'm1' },
          { description: 'Matola, Província de Maputo', place_id: 'm6' },
          { description: 'Zimpeto, Maputo', place_id: 'm5' }
        ].filter(m => m.description.toLowerCase().includes(address.toLowerCase()));
        setAddressPredictions(mock);
      } finally {
        setIsSearchingAddress(false);
      }
    };

    const debounce = setTimeout(fetchPlaces, 400);
    return () => clearTimeout(debounce);
  }, [address, selectedPlaceId]);

  const handleSelectAddress = async (prediction: any) => {
    setAddress(prediction.description);
    setSelectedPlaceId(prediction.place_id);
    setAddressPredictions([]);
    setCalculatingShipping(true);

    try {
      // Get Exact Lat/Lng
      const res = await fetch(`/api/geocode?place_id=${prediction.place_id}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
         const location = data.results[0].geometry.location;
         calculateShippingCostFromCoords(location.lat, location.lng, prediction.description);
      } else {
         calculateShippingCostFromCoords(null, null, prediction.description);
      }
    } catch (err) {
      calculateShippingCostFromCoords(null, null, prediction.description);
    }
  };

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo('.checkout-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .fromTo('.checkout-card', { opacity: 0, y: 30, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15, ease: 'power2.out' }, '-=0.4')
      .fromTo('.checkout-summary', { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4');
  }, { scope: containerRef });

  const subtotal = total;
  const discount = voucher ? voucher.value : 0;
  
  const calculateCostFromDistance = (latitude: number, longitude: number) => {
    const baseLat = Number(shippingSettings.baseLat) || -25.9692;
    const baseLng = Number(shippingSettings.baseLng) || 32.5732;
    const R = 6371;
    const dLat = (latitude - baseLat) * Math.PI / 180;
    const dLon = (longitude - baseLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(baseLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const freeRad = Number(shippingSettings.freeRadiusKm) || 15;
    const costPerKm = Number(shippingSettings.costPerKmExtra) || 60;
    const effectiveDistance = Math.max(0, distance - 2); // 2km tolerance for GPS jitter
    return effectiveDistance <= freeRad ? 0 : Math.round((effectiveDistance - freeRad) * costPerKm);
  };

  // Auto-GPS on mount
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if ("geolocation" in navigator && shippingCost === null && isMounted && !address) {
        setCalculatingShipping(true);
        navigator.geolocation.getCurrentPosition((position) => {
          if (!isMounted) return;
          const cost = calculateCostFromDistance(position.coords.latitude, position.coords.longitude);
          setShippingCost(cost);
          setAddress("Localização Atual (GPS)");
          setSelectedPlaceId("GPS");
          setCalculatingShipping(false);
        }, () => {
          if (isMounted) setCalculatingShipping(false);
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); // Forced fresh GPS
      }
    }, 800); // Trigger slightly faster for better UX

    return () => { isMounted = false; clearTimeout(timer); };
  }, [shippingSettings, shippingCost, address]);
  
  // Matrix Synergies (Upsell logic)
  const getUpsells = () => {
    if (items.length === 0 || products.length === 0) return [];
    
    // Find categories we don't have in cart
    const cartCategories = new Set(items.map(i => i.category));
    
    const recommendations = products.filter(p => {
       // If cart has a Desktop/Component but no monitor, recommend monitors
       if ((cartCategories.has("Desktop's") || cartCategories.has('Components')) && (p.category === 'Displays' || p.category === 'Monitores')) return true;
       // Recommend gadgets if cart has components
       if (cartCategories.has('Components') && p.category === 'Gadgets') return true;
       // Recommend peripherals if cart has a desktop
       if (cartCategories.has("Desktop's") && p.category === 'Periféricos') return true;
       return false;
    }).slice(0, 2);

    return recommendations;
  };

  const upsells = getUpsells();

  // Sort cart items by component category
  const CATEGORY_ORDER: Record<string, number> = {
    'Motherboard': 1, 'Placa-Mãe': 1,
    'CPU': 2, 'Processador': 2,
    'RAM': 3, 'Memória': 3,
    'Armazenamento': 4, 'Storage': 4,
    'CPU Cooler': 5, 'Cooler': 5, 'Refrigeração': 5,
    'GPU': 6, 'Placa Gráfica': 6,
    'Fonte': 7, 'PSU': 7,
    'Case': 8, 'Gabinete': 8,
    'Fans': 9, 'Ventoinhas': 9,
    'Componente': 10,
    'Acessório': 20, 'Periférico': 20,
  };
  const sortedItems = [...items].sort((a, b) => {
    const oa = a.category ? (CATEGORY_ORDER[a.category] ?? 15) : 15;
    const ob = b.category ? (CATEGORY_ORDER[b.category] ?? 15) : 15;
    return oa - ob;
  });

  const calculateShippingCostFromCoords = (latitude: number | null, longitude: number | null, overrideAddressStr?: string) => {
     const freeRad = Number(shippingSettings.freeRadiusKm) || 15;
     const costPerKm = Number(shippingSettings.costPerKmExtra) || 60;

     if (latitude === null || longitude === null) {
       // Text-based zone detection: estimate distance in km per zone, then apply Admin settings
       const addr = (overrideAddressStr || address).toLowerCase();

       // Interprovincial ~300-600km
       if (addr.includes('gaza') || addr.includes('inhambane') || addr.includes('xai') || addr.includes('beira') || addr.includes('sofala') || addr.includes('nampula') || addr.includes('tete') || addr.includes('zambezia') || addr.includes('niassa') || addr.includes('cabo delgado') || addr.includes('pemba') || addr.includes('quelimane') || addr.includes('chimoio')) {
          const estimatedKm = 350; // Conservative interprovincial estimate
          const cost = Math.round((estimatedKm - freeRad) * costPerKm);
          setShippingCost(Math.max(cost, 1500));
          setCalculatingShipping(false); return;
       }
       // Arredores longínquos ~40-60km (Boane, Manhiça)
       if (addr.includes('boane') || addr.includes('marracuene') || addr.includes('katembe') || addr.includes('txumene') || addr.includes('manhica')) {
          const estimatedKm = 50;
          const cost = estimatedKm <= freeRad ? 0 : Math.round((estimatedKm - freeRad) * costPerKm);
          setShippingCost(cost);
          setCalculatingShipping(false); return;
       }
       // Matola e arredores ~18-30km
       if (addr.includes('matola') || addr.includes('zimpeto') || addr.includes('machava') || addr.includes('tchumene') || addr.includes('liberdade') || addr.includes('socimol') || addr.includes('fomento')) {
          const estimatedKm = 22;
          const cost = estimatedKm <= freeRad ? 0 : Math.round((estimatedKm - freeRad) * costPerKm);
          setShippingCost(cost);
          setCalculatingShipping(false); return;
       }
       // Maputo Central ~0-10km — dentro do raio grátis
       if (addr.includes('maputo') || addr.includes('cidade') || addr.includes('central') || addr.includes('museu') || addr.includes('polana') || addr.includes('sommerschield') || addr.includes('malhangalene') || addr.includes('alto mae') || addr.includes('triunfo') || addr.includes('costa do sol')) {
          setShippingCost(0);
          setCalculatingShipping(false); return;
       }
       // Fallback flat rate do Admin
       setShippingCost(Number(shippingSettings.fallbackFlatRate) || 800);
       setCalculatingShipping(false);
       return;
     }

     const cost = calculateCostFromDistance(latitude, longitude);
     setShippingCost(cost);
     setCalculatingShipping(false);
  };

  const calculateShipping = () => {
     setCalculatingShipping(true);
     // Force text calculation if they pressed the text calculation button
     calculateShippingCostFromCoords(null, null);
  };

  const isPhoneValid = () => {
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.length !== 9) return false;
    
    if (paymentMethod === 'mpesa') {
      return cleanNumber.startsWith('84') || cleanNumber.startsWith('85');
    }
    if (paymentMethod === 'emola') {
      return cleanNumber.startsWith('86') || cleanNumber.startsWith('87');
    }
    return false;
  };

  const handleCheckout = async () => {
    if (!fullName) { alert("Preencha o seu Nome Completo."); return; }
    if (!address) { alert("Preencha o endereço de entrega."); return; }
    if (!isPhoneValid()) { alert("Preencha um número válido de 9 dígitos para o método selecionado."); return; }

    setPaymentStatus('processing');
    
    const finalTotal = Math.max(0, subtotal - discount + (shippingCost || 0));
    
    try {
      // Save checkout in Firestore for the Admin
      await addDoc(collection(db, 'checkouts'), {
        customerName: fullName,
        customerPhone: phone,
        address: address,
        zipCode: zipCode || 'N/A',
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        discount: discount,
        shippingCost: shippingCost || 0,
        total: finalTotal,
        items: items,
        status: 'pendente', // 'pendente', 'pago', 'entregue', 'cancelado'
        createdAt: serverTimestamp()
      });

      // Simulate USSD Push
      setTimeout(() => {
        setPaymentStatus('success');
        setTimeout(() => {
          proceedToWhatsApp(finalTotal);
        }, 3000);
      }, 4000);

    } catch (err) {
      console.error(err);
      alert("Falha de rede ao registar encomenda. Tente novamente.");
      setPaymentStatus('idle');
    }
  };

  const proceedToWhatsApp = (finalTotal: number) => {
    const isMpesa = paymentMethod === 'mpesa';
    
    let msg = `*NOVA ENCOMENDA - HARDWARE SALE*\n\n`;
    msg += `*Cliente:* ${fullName}\n`;
    msg += `*Método:* ${isMpesa ? 'M-Pesa' : 'e-Mola'} (${phone})\n`;
    msg += `*Entrega:* ${address} ${zipCode ? `(CEP: ${zipCode})` : ''}\n`;
    if (shippingCost !== null) {
      msg += `*Portes (GPS):* ${shippingCost === 0 ? 'Grátis (Zona Central)' : `${shippingCost} MT`}\n`;
    }
    msg += `\n*ITENS:*\n`;
    items.forEach(i => {
      msg += `- ${i.name} (${i.price.toLocaleString()} MT)\n`;
    });
    
    if (voucher) {
       msg += `\n*Voucher Aplicado:* -${voucher.value.toLocaleString()} MT`;
    }
    
    msg += `\n\n*TOTAL A PAGAR:* ${finalTotal.toLocaleString()} MT`;

    const encoded = encodeURIComponent(msg);
    const whatsappNumber = "258840000000"; // Store number
    
    // Redirect to WhatsApp
    window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, '_blank');
    clearCart();
    navigate('/');
  };

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
         <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
            <ShieldCheck className="w-24 h-24 text-green-400 relative z-10" />
         </div>
         <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Pagamento Confirmado!</h2>
         <p className="text-gray-400 text-lg max-w-md">O seu {paymentMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola'} foi processado. A redireccionar para o WhatsApp da nossa equipa VIP...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
         <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
           <ShoppingCart className="w-10 h-10 text-gray-500" />
         </div>
         <h2 className="text-3xl font-extrabold text-white mb-4">A Matrix está vazia</h2>
         <p className="text-gray-400 mb-8 max-w-md">O teu setup de sonho começa com a primeira peça. Explora a nossa montra ou usa o Smart Builder.</p>
         <Button onClick={() => navigate('/products')} className="bg-brand-neon text-black font-bold h-14 px-8 rounded-full">Explorar Hardware</Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pt-32 pb-24 px-4 sm:px-6 max-w-screen-2xl mx-auto min-h-screen relative flex justify-center">
      {/* Global Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] max-w-[100vw] h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-neon/10 via-[#0a0a14] to-transparent blur-[150px] pointer-events-none -z-10"></div>
      
      <div className="w-full flex flex-col xl:flex-row gap-8 lg:gap-12 relative z-10">
        
        {/* Left Column: Cart & Upsell (Luxurious Glass Container) */}
        <div className="w-full xl:w-[55%] flex flex-col space-y-8">
           
           {/* Header Area */}
           <div className="checkout-header">
             <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 leading-none">
               Finalizar <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-white">Aquisição.</span>
             </h1>
             <p className="text-gray-400 font-medium text-lg max-w-md">Revise as peças do seu arsenal. O próximo passo é o domínio absoluto.</p>
           </div>

           {/* Items List */}
           <div className="checkout-card bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-[200px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                 <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    Arsenal <span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">{items.length} peças</span>
                 </h3>
                 <button onClick={clearCart} className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 uppercase tracking-widest">
                    <Trash2 size={12} /> Limpar
                 </button>
              </div>
              
              <div className="space-y-3 relative z-10">
                 {sortedItems.map((item, idx) => {
                   const showCategory = idx === 0 || sortedItems[idx - 1].category !== item.category;
                   return (
                     <React.Fragment key={`${item.id}-${idx}`}>
                       {showCategory && item.category && (
                         <div className="text-[10px] font-black text-brand-neon uppercase tracking-[0.2em] pt-4 pb-2 ml-2">{item.category}</div>
                       )}
                       <div className="flex items-center gap-4 sm:gap-6 bg-[#050510]/50 border border-white/5 rounded-3xl p-4 group hover:bg-white/[0.02] hover:border-white/10 transition-all duration-500">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-black/60 border border-white/5 p-3 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-shadow">
                             <div className="absolute inset-0 bg-brand-neon/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out relative z-10" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">{item.category}</div>
                             <h4 className="text-white font-bold text-lg sm:text-xl truncate leading-tight group-hover:text-brand-neon transition-colors">{item.name}</h4>
                             <div className="text-brand-neon font-extrabold mt-2 text-base sm:text-lg flex items-center gap-2">
                               {(item.price * (item.quantity || 1)).toLocaleString()} MT
                               {(item.quantity || 1) > 1 && <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">Unidade: {item.price.toLocaleString()} MT</span>}
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden shadow-inner h-10">
                               <button 
                                 onClick={() => {
                                   if ((item.quantity || 1) > 1) {
                                     // Quick hack to decrease quantity: we remove it and re-add with quantity - 1
                                     removeItem(item.id);
                                     for(let i=0; i<(item.quantity || 1)-1; i++) {
                                       addItem({ id: item.id, name: item.name, price: item.price, image: item.image, category: item.category });
                                     }
                                   } else {
                                     removeItem(item.id);
                                   }
                                 }}
                                 className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                               >
                                 -
                               </button>
                               <span className="w-6 text-center text-sm font-bold text-white">{item.quantity || 1}</span>
                               <button 
                                 onClick={() => addItem({ id: item.id, name: item.name, price: item.price, image: item.image, category: item.category })}
                                 className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                               >
                                 +
                               </button>
                             </div>
                             <button onClick={() => removeItem(item.id)} className="w-10 h-10 rounded-full bg-black/50 text-gray-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-white/5 hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:-translate-y-1">
                                <X size={16} strokeWidth={3} />
                             </button>
                          </div>
                       </div>
                     </React.Fragment>
                   );
                 })}
              </div>
           </div>

           {/* Sinergias Matrix (Upsell) */}
           {upsells.length > 0 && (
             <div className="checkout-card bg-gradient-to-br from-[#110e1b] to-[#0a0a14] border border-brand-magenta/20 rounded-[3rem] p-6 sm:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-brand-magenta/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-brand-magenta/20 transition-all duration-1000"></div>
                
                <div className="mb-8 relative z-10">
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                     <Sparkles className="text-brand-magenta w-6 h-6 animate-pulse" /> Sinergias Sugeridas
                  </h3>
                  <p className="text-sm text-gray-400 font-medium">Eleve o seu sistema ao próximo patamar com recomendações cruzadas da Amani.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                   {upsells.map(product => (
                     <div key={product.id} className="bg-black/40 border border-white/5 rounded-3xl p-5 flex flex-col gap-4 group/item hover:border-brand-magenta/40 hover:bg-black/60 transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-white/5 shadow-inner">
                            <img src={product.images?.[0] || product.image} alt={product.name} className="max-w-full max-h-full object-contain group-hover/item:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="text-white text-sm font-bold leading-tight group-hover/item:text-brand-magenta transition-colors line-clamp-2">{product.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                           <div className="text-brand-magenta text-sm font-extrabold">{product.price.toLocaleString()} MT</div>
                           <button onClick={() => {
                              addItem({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || product.image || '', category: product.category || '' });
                           }} className="h-8 px-4 rounded-full bg-brand-magenta/10 border border-brand-magenta/30 text-brand-magenta text-xs font-bold flex items-center justify-center hover:bg-brand-magenta hover:text-white transition-all shadow-lg hover:shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                              Adicionar
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        {/* Right Col: Summary & Payment (Sticky Panel) */}
        <div className="w-full xl:w-[45%] relative">
           <div className="checkout-summary bg-[#0a0a14] border border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] p-6 sm:p-10 sticky top-24 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-neon/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                 Resumo Oficial
              </h3>

              {/* Subtotals Box */}
              <div className="bg-black/50 border border-white/5 rounded-3xl p-6 space-y-5 mb-8 relative z-10">
                 <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-400">Hardware ({items.length} itens)</span>
                    <span className="text-white text-base font-bold">{subtotal.toLocaleString()} MT</span>
                 </div>
                 
                 {voucher && (
                   <div className="flex justify-between items-center text-sm font-bold text-green-400 bg-green-500/10 p-3 rounded-2xl border border-green-500/20 shadow-inner">
                      <span className="flex items-center gap-2"><Sparkles size={16}/> Voucher IA</span>
                      <span>-{discount.toLocaleString()} MT</span>
                   </div>
                 )}
                 
                 <div className="flex justify-between items-center text-sm font-medium pt-5 border-t border-white/5">
                    <span className="text-gray-300 flex flex-col">
                      Logística & Portes
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Cálculo GPS Integrado</span>
                    </span>
                    {shippingCost === null ? (
                               <div className="flex gap-2">
                                 <Button onClick={() => {
                                   if ("geolocation" in navigator) {
                                     setCalculatingShipping(true);
                                     navigator.geolocation.getCurrentPosition((position) => {
                                       calculateShippingCostFromCoords(position.coords.latitude, position.coords.longitude);
                                       setAddress("Localização Atual (GPS)");
                                       setSelectedPlaceId("GPS");
                                     }, () => {
                                       alert("Permissão de GPS negada ou sinal muito fraco. Por favor, digite o endereço manualmente.");
                                       setCalculatingShipping(false);
                                     }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                                   }
                                 }} variant="outline" className="h-9 px-3 text-xs font-bold bg-brand-neon/10 border-brand-neon/30 text-brand-neon hover:bg-brand-neon/20 transition-all shadow-[0_0_10px_rgba(20,241,149,0.2)]">
                                   Usar Meu GPS Atual
                                 </Button>
                                 <Button onClick={calculateShipping} disabled={calculatingShipping || !address} variant="outline" className="h-9 px-3 text-xs font-bold bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all">
                                   {calculatingShipping ? <Loader2 size={14} className="animate-spin mr-2" /> : 'Calcular por Texto'}
                                 </Button>
                               </div>
                    ) : (
                       <div className="flex flex-col items-end gap-1">
                         <span className="text-brand-neon font-extrabold text-lg">{shippingCost === 0 ? 'Grátis' : `${shippingCost.toLocaleString()} MT`}</span>
                         {shippingCost === 0 && <span className="text-[9px] text-black bg-brand-neon px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(20,241,149,0.5)]">Zona VIP Central</span>}
                         <button onClick={() => setShippingCost(null)} className="text-[10px] text-gray-500 hover:text-white underline mt-1 transition-colors">Recalcular</button>
                       </div>
                    )}
                 </div>
              </div>

              {/* Total Box */}
              <div className="flex justify-between items-end mb-10 px-2 relative z-10">
                 <span className="text-sm font-extrabold text-gray-500 uppercase tracking-widest mb-2">Total Final</span>
                 <div className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-lg flex items-start gap-2">
                    {Math.max(0, subtotal - discount + (shippingCost || 0)).toLocaleString()} 
                    <span className="text-xl sm:text-2xl text-brand-neon font-bold mt-2">MT</span>
                 </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                 <button 
                   onClick={() => { setPaymentMethod('mpesa'); setPhone(''); }}
                   className={`relative overflow-hidden h-20 rounded-2xl font-extrabold flex flex-col items-center justify-center gap-1.5 border-2 transition-all duration-300 ${paymentMethod === 'mpesa' ? 'border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] scale-[1.03]' : 'border-white/5 bg-black/40 text-gray-500 hover:border-red-500/30 hover:text-red-400 hover:bg-white/5'}`}
                 >
                   <span className="text-lg tracking-tight">M-Pesa</span>
                   {paymentMethod === 'mpesa' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                 </button>
                 <button 
                   onClick={() => { setPaymentMethod('emola'); setPhone(''); }}
                   className={`relative overflow-hidden h-20 rounded-2xl font-extrabold flex flex-col items-center justify-center gap-1.5 border-2 transition-all duration-300 ${paymentMethod === 'emola' ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)] scale-[1.03]' : 'border-white/5 bg-black/40 text-gray-500 hover:border-orange-500/30 hover:text-orange-400 hover:bg-white/5'}`}
                 >
                   <span className="text-lg tracking-tight">e-Mola</span>
                   {paymentMethod === 'emola' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>}
                 </button>
              </div>

              {/* Complex Inputs */}
              <div className="space-y-5 mb-10 relative z-10">
                 <div className="group relative">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-neon transition-colors">
                     <User size={18} />
                   </div>
                   <input required value={fullName} onChange={e => setFullName(e.target.value)} type="text" placeholder="Nome Completo" className="w-full bg-white/5 border border-white/10 h-16 rounded-2xl pl-12 pr-5 text-white text-sm font-medium focus:outline-none focus:border-brand-neon focus:bg-white/10 focus:ring-4 focus:ring-brand-neon/10 transition-all shadow-inner placeholder:text-gray-600" />
                 </div>

                 <div className="group relative">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-neon transition-colors">
                     <Smartphone size={18} />
                   </div>
                   <input 
                     required 
                     value={phone} 
                     onChange={e => setPhone(e.target.value)} 
                     type="tel" 
                     maxLength={9}
                     placeholder={`Número ${paymentMethod === 'mpesa' ? 'M-Pesa (Ex: 841234567)' : 'e-Mola (Ex: 861234567)'}`}
                     className={`w-full bg-white/5 h-16 rounded-2xl pl-12 pr-5 text-white text-sm font-medium focus:outline-none focus:bg-white/10 focus:ring-4 transition-all shadow-inner placeholder:text-gray-600 ${
                       phone.length === 9 
                         ? isPhoneValid() 
                           ? 'border-2 border-green-500 focus:border-green-500 focus:ring-green-500/10' 
                           : 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500/10'
                         : 'border border-white/10 focus:border-brand-neon focus:ring-brand-neon/10'
                     }`} 
                   />
                 </div>
                 {phone.length > 0 && phone.length < 9 && (
                   <p className="text-[11px] text-gray-500 ml-2 mt-[-10px]">Por favor introduza 9 dígitos do seu telemóvel.</p>
                 )}
                 {phone.length === 9 && !isPhoneValid() && (
                   <p className="text-[11px] text-red-400 ml-2 mt-[-10px]">Prefixo inválido para a rede {paymentMethod === 'mpesa' ? 'M-Pesa (use 84/85)' : 'e-Mola (use 86/87)'}.</p>
                 )}

                 <div className="group relative z-20">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-neon transition-colors">
                     <MapPin size={18} />
                   </div>
                   <input 
                     required 
                     value={address} 
                     onChange={e => {
                       setAddress(e.target.value);
                       setSelectedPlaceId(null);
                     }} 
                     type="text" 
                     placeholder="Endereço Físico Exato (Ex: Av. FPLM, Maputo)" 
                     className="w-full bg-white/5 border border-white/10 h-16 rounded-2xl pl-12 pr-12 text-white text-sm font-medium focus:outline-none focus:border-brand-neon focus:bg-white/10 focus:ring-4 focus:ring-brand-neon/10 transition-all shadow-inner placeholder:text-gray-600" 
                   />
                   {isSearchingAddress && (
                     <div className="absolute inset-y-0 right-4 flex items-center">
                       <Loader2 size={16} className="text-gray-500 animate-spin" />
                     </div>
                   )}
                   {/* Address Autocomplete Dropdown */}
                   {addressPredictions.length > 0 && !selectedPlaceId && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-[#110e1b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-30">
                       {addressPredictions.map((pred) => (
                         <div 
                           key={pred.place_id} 
                           onClick={() => handleSelectAddress(pred)}
                           className="p-4 hover:bg-brand-neon/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors flex items-center gap-3"
                         >
                           <MapPin size={16} className="text-gray-400 shrink-0" />
                           <span className="text-sm text-gray-200 truncate">{pred.description}</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 <div className="group relative">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-neon transition-colors">
                     <Mailbox size={18} />
                   </div>
                   <input value={zipCode} onChange={e => setZipCode(e.target.value)} type="text" placeholder="CEP / Código Postal (Opcional)" className="w-full bg-white/5 border border-white/10 h-16 rounded-2xl pl-12 pr-5 text-white text-sm font-medium focus:outline-none focus:border-brand-neon focus:bg-white/10 focus:ring-4 focus:ring-brand-neon/10 transition-all shadow-inner placeholder:text-gray-600" />
                 </div>
              </div>

              {paymentStatus === 'processing' ? (
                 <div className="w-full h-16 rounded-2xl bg-black/60 border border-brand-neon/30 flex items-center justify-center gap-3 relative z-10 text-brand-neon">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="font-bold text-lg">Aguardando USSD Push no telemóvel...</span>
                 </div>
              ) : (
                 <Button 
                   onClick={handleCheckout}
                   disabled={!address || !isPhoneValid()}
                   className={`w-full h-16 rounded-2xl transition-all hover:scale-[1.02] shadow-[0_20px_40px_rgba(255,255,255,0.2)] font-black text-lg flex items-center justify-center gap-3 relative z-10 border-0 ${
                     address && isPhoneValid() ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-gray-500 cursor-not-allowed'
                   }`}
                 >
                   <ArrowRight className="w-5 h-5" /> Submeter Protocolo Pago
                 </Button>
              )}
              
              <div className="mt-8 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-500 relative z-10">
                <ShieldCheck size={12} className="text-green-500" /> Checkout SSL Encriptado • Hardware Sale MZ
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
