import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store/useStore";

export interface ComponentItem {
  id: string;
  type: "cpu" | "gpu" | "motherboard" | "ram" | "psu" | "case" | "storage" | "cooler" | "fans" | "peripheral";
  name: string;
  priceMT: number;
  socket?: string;
  wattage?: number;
  image: string;
  specs: string[];
}

export function usePCBuilder() {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const { products, initProducts } = useStore();

  useEffect(() => {
    if (products.length === 0) {
      initProducts();
    }
  }, [products.length, initProducts]);

  const allComponents = useMemo(() => {
    return products
      .filter(p => (p as any).isBuilderReady === true)
      .map(p => {
        // Assume p.builderType is defined since it was added via Smart Builder Panel
        // If it isn't defined explicitly, try to map from subCategory
        const typeMap: Record<string, string> = {
          'CPU': 'cpu', 'GPU': 'gpu', 'Motherboard': 'motherboard', 'RAM': 'ram', 'Fonte': 'psu', 'Case': 'case', 'Armazenamento': 'storage', 'Air Cooler': 'cooler', 'Liquid Cooling': 'cooler', 'Fans': 'fans', 'Teclado': 'peripheral', 'Rato': 'peripheral', 'Headsets': 'peripheral', 'Mousepad': 'peripheral',
        };
        const subC = (p as any).builderType || (p as any).subCategory || (p.tags && p.tags.find((t: string) => typeMap[t])) || '';
        const type = (p as any).builderType ? (p as any).builderType : (typeMap[subC] || 'peripheral');

        let extractedWattage = 0;
        if ((p as any).builderWattage) {
          extractedWattage = Number((p as any).builderWattage);
        } else {
          const nameMatch = p.name.match(/(\d+)\s*W/i);
          if (nameMatch) extractedWattage = parseInt(nameMatch[1]);
          else if (p.specs) {
            for (const val of Object.values(p.specs)) {
              if (typeof val === 'string') {
                const wMatch = val.match(/(\d+)\s*W/i);
                if (wMatch) {
                  extractedWattage = parseInt(wMatch[1]);
                  break;
                }
              }
            }
          }
        }
        
        // Baseline fallback wattage if not found
        if (!extractedWattage) {
           if (type === 'motherboard') extractedWattage = 45;
           else if (type === 'ram') extractedWattage = 10;
           else if (type === 'storage') extractedWattage = 15;
           else if (type === 'fans' || type === 'cooler') extractedWattage = 20;
           else if (type === 'peripheral' || type === 'case') extractedWattage = 0;
           else if (type === 'cpu') extractedWattage = 95;
           else if (type === 'gpu') extractedWattage = 200;
        }

        let extractedSocket = '';
        if ((p as any).builderSocket) {
          extractedSocket = String((p as any).builderSocket);
        } else if (p.specs) {
          extractedSocket = (p.specs as Record<string, string>)['Socket'] || (p.specs as Record<string, string>)['LGA'] || (p.specs as Record<string, string>)['Plataforma'] || '';
          if (!extractedSocket) {
            for (const val of Object.values(p.specs)) {
              if (typeof val === 'string' && (val.includes('LGA') || val.includes('AM4') || val.includes('AM5') || val.includes('TR4'))) {
                extractedSocket = val;
                break;
              }
            }
          }
        }
        if (!extractedSocket && p.tags) {
          const sTag = p.tags.find((t: string) => t.includes('LGA') || t.includes('AM4') || t.includes('AM5'));
          if (sTag) extractedSocket = sTag;
        }

        const specsList = p.specs ? Object.values(p.specs).slice(0, 3) as string[] : [];

        return {
          id: p.id,
          type,
          name: p.name,
          priceMT: Number(p.price) || 0,
          socket: extractedSocket,
          wattage: extractedWattage,
          image: p.images?.[0] || p.image || 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c',
          specs: specsList
        };
      });
  }, [products]);

  const [selectedMotherboard, setSelectedMotherboard] = useState<ComponentItem | null>(null);
  const [selectedCPU, setSelectedCPU] = useState<ComponentItem | null>(null);
  const [selectedRAM, setSelectedRAM] = useState<ComponentItem | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<ComponentItem | null>(null);
  const [selectedCooler, setSelectedCooler] = useState<ComponentItem | null>(null);
  const [selectedGPU, setSelectedGPU] = useState<ComponentItem | null>(null);
  const [selectedPSU, setSelectedPSU] = useState<ComponentItem | null>(null);
  const [selectedCase, setSelectedCase] = useState<ComponentItem | null>(null);
  const [selectedFans, setSelectedFans] = useState<ComponentItem | null>(null);
  const [selectedPeripherals, setSelectedPeripherals] = useState<ComponentItem[]>([]);

  useEffect(() => {
    if (preset && allComponents.length > 0) {
      const ids = preset.split(',');
      const getC = (type: string) => allComponents.find(c => c.type === type && ids.includes(c.id)) || null;

      setSelectedMotherboard(getC('motherboard'));
      setSelectedCPU(getC('cpu'));
      setSelectedRAM(getC('ram'));
      setSelectedStorage(getC('storage'));
      setSelectedCooler(getC('cooler'));
      setSelectedGPU(getC('gpu'));
      setSelectedPSU(getC('psu'));
      setSelectedCase(getC('case'));
      setSelectedFans(getC('fans'));

      const pers = allComponents.filter(c => c.type === 'peripheral' && ids.includes(c.id));
      if (pers.length > 0) setSelectedPeripherals(pers);
    }
  }, [preset, allComponents]);

  const getFullText = (c: ComponentItem | null) => {
    if (!c) return '';
    return (c.name + " " + (c.socket || '') + " " + c.specs.join(" ")).toLowerCase();
  };

  const isDDR = (c: ComponentItem | null, version: string) => {
    // Explicitly isolate DDR logic. Many DDR4 products have names that can confuse basic includes.
    const text = getFullText(c);
    // e.g. looking for "ddr5", checking for literal match
    return text.includes(version.toLowerCase());
  };

  const getSocket = (c: ComponentItem | null) => {
    const text = getFullText(c);
    if (text.includes("lga 1851") || text.includes("lga1851") || text.includes("b860") || text.includes("z890")) return "lga1851";
    if (text.includes("lga 1700") || text.includes("lga1700") || text.includes("b760") || text.includes("z790")) return "lga1700";
    if (text.includes("am5") || text.includes("x670") || text.includes("b650") || text.includes("x870")) return "am5";
    if (text.includes("am4") || text.includes("b550") || text.includes("x570")) return "am4";
    if (c?.socket) return c.socket.toLowerCase();
    return null;
  };

  const compatibleMotherboards = useMemo(() => {
    let list = allComponents.filter(c => c.type === "motherboard");
    
    // 1. Filter by CPU Socket
    if (selectedCPU) {
       const cpuSocket = getSocket(selectedCPU);
       if (cpuSocket) {
         list = list.filter(c => {
           const mbSocket = getSocket(c);
           return !mbSocket || mbSocket.includes(cpuSocket) || cpuSocket.includes(mbSocket);
         });
       }
    }
    
    // 2. Filter by RAM DDR Version
    if (selectedRAM) {
       const isRamDDR5 = isDDR(selectedRAM, "DDR5");
       const isRamDDR4 = isDDR(selectedRAM, "DDR4");
       
       list = list.filter(c => {
         const isMbDDR5 = isDDR(c, "DDR5");
         const isMbDDR4 = isDDR(c, "DDR4");
         
         if (isRamDDR5 && isMbDDR4) return false;
         if (isRamDDR4 && isMbDDR5) return false;
         return true;
       });
    }
    
    return list;
  }, [selectedCPU, selectedRAM, allComponents]);

  const compatibleCPUs = useMemo(() => {
    let list = allComponents.filter(c => c.type === "cpu");
    if (selectedMotherboard) {
       const mbSocket = getSocket(selectedMotherboard);
       if (mbSocket) {
         list = list.filter(c => {
           const cpuSocket = getSocket(c);
           return !cpuSocket || cpuSocket.includes(mbSocket) || mbSocket.includes(cpuSocket);
         });
       }
    }
    return list;
  }, [selectedMotherboard, allComponents]);

  const compatibleRAMs = useMemo(() => {
    let list = allComponents.filter(c => c.type === "ram");
    if (selectedMotherboard || selectedCPU) {
       // B860/Z890, LGA1851, AM5 and LGA1700 (often DDR5 natively nowadays in high end builds)
       // Determine motherboard DDR type implicitly if not explicit
       let isMbDDR5 = isDDR(selectedMotherboard, "DDR5");
       let isMbDDR4 = isDDR(selectedMotherboard, "DDR4");
       
       const mbSocket = getSocket(selectedMotherboard);
       const cpuSocket = getSocket(selectedCPU);
       
       // Force DDR5 for known modern DDR5-only platforms if not explicitly written
       if (mbSocket === "am5" || mbSocket === "lga1851" || cpuSocket === "am5" || cpuSocket === "lga1851") {
          isMbDDR5 = true;
          isMbDDR4 = false;
       }

       if (isMbDDR5 || isMbDDR4) {
         list = list.filter(c => {
           const isRamDDR5 = isDDR(c, "DDR5");
           const isRamDDR4 = isDDR(c, "DDR4");
           
           if (isMbDDR5 && isRamDDR4) return false;
           if (isMbDDR4 && isRamDDR5) return false;
           
           // Strict Fallback: if board is DDR5, force RAM to be explicitly DDR5
           if (isMbDDR5 && !isRamDDR5) return false;
           if (isMbDDR4 && !isRamDDR4) return false;
           
           return true;
         });
       }
    }
    return list;
  }, [selectedMotherboard, selectedCPU, allComponents]);

  // Auto-deselect incompatible parts when Motherboard changes
  useEffect(() => {
     if (selectedMotherboard && selectedCPU) {
        const mbSocket = getSocket(selectedMotherboard);
        const cpuSocket = getSocket(selectedCPU);
        
        if (mbSocket && cpuSocket && !mbSocket.includes(cpuSocket) && !cpuSocket.includes(mbSocket)) {
           setSelectedCPU(null);
        }
     }
     
     if (selectedMotherboard && selectedRAM) {
        let isMbDDR5 = isDDR(selectedMotherboard, "DDR5");
        let isMbDDR4 = isDDR(selectedMotherboard, "DDR4");
        const mbSocket = getSocket(selectedMotherboard);
        
        if (mbSocket === "am5" || mbSocket === "lga1851") {
           isMbDDR5 = true;
           isMbDDR4 = false;
        }

        const isRamDDR5 = isDDR(selectedRAM, "DDR5");
        const isRamDDR4 = isDDR(selectedRAM, "DDR4");
        
        if (isMbDDR5 && (isRamDDR4 || !isRamDDR5)) setSelectedRAM(null);
        if (isMbDDR4 && (isRamDDR5 || !isRamDDR4)) setSelectedRAM(null);
     }
  }, [selectedMotherboard, selectedCPU]);

  const totalWattage = useMemo(() => {
    return (selectedCPU?.wattage || 0) +
           (selectedCooler?.wattage || 0) +
           (selectedMotherboard?.wattage || 0) +
           (selectedGPU?.wattage || 0) +
           (selectedRAM?.wattage || 0) +
           (selectedStorage?.wattage || 0) +
           (selectedCase?.wattage || 0) +
           (selectedFans?.wattage || 0);
  }, [selectedCPU, selectedCooler, selectedMotherboard, selectedGPU, selectedRAM, selectedStorage, selectedCase, selectedFans]);

  const psuWarning = useMemo(() => {
    if (!selectedPSU) return null;
    const psuCapacity = selectedPSU.wattage || parseInt(selectedPSU.name.match(/(\d+)W/)?.[1] || "0");
    if (psuCapacity > 0 && totalWattage > psuCapacity * 0.8) {
      return `Alerta: Consumo de pico (${totalWattage}W) está marginal para eficiência desta fonte (Max ${psuCapacity}W).`;
    }
    return null;
  }, [selectedPSU, totalWattage]);

  const smartUpsell = useMemo(() => {
    if (totalWattage > 800 && (!selectedPSU || (selectedPSU.wattage || 0) < 1200)) {
      return "Hardware Sale Tips: Construções Enthusiast demandam margem térmica. Sugerimos fontes 1200W+ para estabilidade.";
    }
    if (selectedCPU && selectedCPU.name.includes("i9") && (!selectedCase || !selectedCase.name.includes("O11"))) {
       return "Hardware Sale Tips: O i9-14900KS ferve forte! Recomendamos gabinetes O11D EVO XL para AIOs 420mm.";
    }
    return null;
  }, [totalWattage, selectedPSU, selectedCPU, selectedCase]);

  const totalPrice =
    (selectedMotherboard?.priceMT || 0) +
    (selectedCPU?.priceMT || 0) +
    (selectedRAM?.priceMT || 0) +
    (selectedStorage?.priceMT || 0) +
    (selectedCooler?.priceMT || 0) +
    (selectedGPU?.priceMT || 0) +
    (selectedPSU?.priceMT || 0) +
    (selectedCase?.priceMT || 0) +
    (selectedFans?.priceMT || 0) +
    selectedPeripherals.reduce((acc, p) => acc + p.priceMT, 0);

  return {
    allComponents,
    compatibleMotherboards,
    compatibleCPUs,
    compatibleRAMs,
    selections: { selectedMotherboard, selectedCPU, selectedRAM, selectedStorage, selectedCooler, selectedGPU, selectedPSU, selectedCase, selectedFans, selectedPeripherals },
    setters: { setSelectedMotherboard, setSelectedCPU, setSelectedRAM, setSelectedStorage, setSelectedCooler, setSelectedGPU, setSelectedPSU, setSelectedCase, setSelectedFans, setSelectedPeripherals },
    totalPrice,
    totalWattage,
    psuWarning,
    smartUpsell
  };
}
