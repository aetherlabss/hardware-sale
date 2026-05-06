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

        const wattage = (p as any).builderWattage ? Number((p as any).builderWattage) : (parseInt(p.specs?.['TDP'] || p.specs?.['Consumo'] || p.specs?.['Capacidade'] || p.name.match(/(\d+)W/)?.[1] || '0'));
        const socket = (p as any).builderSocket ? String((p as any).builderSocket) : (p.specs?.['Socket'] || p.specs?.['LGA'] || p.specs?.['Plataforma'] || undefined);
        const specsList = p.specs ? Object.values(p.specs).slice(0, 3) as string[] : [];

        return {
          id: p.id,
          type,
          name: p.name,
          priceMT: Number(p.price) || 0,
          socket,
          wattage,
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

  const recommendedMotherboards = useMemo(() => {
    if (!selectedCPU) return allComponents.filter(c => c.type === "motherboard");
    if (!selectedCPU.socket) return allComponents.filter(c => c.type === "motherboard");
    
    return allComponents.filter(c => c.type === "motherboard" && (!c.socket || c.socket.includes(selectedCPU.socket as string) || (selectedCPU.socket as string).includes(c.socket)));
  }, [selectedCPU, allComponents]);

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
    mockComponents: allComponents,
    selections: { selectedMotherboard, selectedCPU, selectedRAM, selectedStorage, selectedCooler, selectedGPU, selectedPSU, selectedCase, selectedFans, selectedPeripherals },
    setters: { setSelectedMotherboard, setSelectedCPU, setSelectedRAM, setSelectedStorage, setSelectedCooler, setSelectedGPU, setSelectedPSU, setSelectedCase, setSelectedFans, setSelectedPeripherals },
    totalPrice,
    totalWattage,
    recommendedMotherboards,
    psuWarning,
    smartUpsell
  };
}
