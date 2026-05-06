import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getAssetUrl } from "../lib/assets";

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

export const mockComponents: ComponentItem[] = [
  // Motherboards
  { id: "m1", type: "motherboard", name: "ROG Maximus Z790 Extreme", priceMT: 85000, socket: "LGA1700", wattage: 50, image: getAssetUrl("/rog-maximus-z790-extreme.jpg"), specs: ["E-ATX Form", "DDR5 8000+ MHz", "Thunderbolt 4"] },
  { id: "m2", type: "motherboard", name: "X670E AORUS XTREME", priceMT: 78000, socket: "AM5", wattage: 50, image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80", specs: ["E-ATX Form", "18+2+2 Power Phases", "PCIe 5.0"] },
  { id: "m3", type: "motherboard", name: "MSI MAG Z790 TOMAHAWK", priceMT: 28000, socket: "LGA1700", wattage: 40, image: getAssetUrl("/msi-mag-z790-tomahawk.png"), specs: ["ATX Form", "DDR5 7200 MHz", "Wi-Fi 6E"] },
  { id: "m4", type: "motherboard", name: "ASUS TUF GAMING B650-PLUS", priceMT: 19000, socket: "AM5", wattage: 35, image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80", specs: ["ATX Form", "DDR5 6400 MHz", "PCIe 4.0"] },

  // CPUs
  { id: "c1", type: "cpu", name: "Intel Core i9-14900KS", priceMT: 62000, socket: "LGA1700", wattage: 320, image: getAssetUrl("/i9.jpg"), specs: ["24 Cores / 32 Threads", "Up to 6.2 GHz", "150W Base Power"] },
  { id: "c2", type: "cpu", name: "AMD Ryzen 9 7950X3D", priceMT: 58000, socket: "AM5", wattage: 120, image: getAssetUrl("/ryzen9.jpg"), specs: ["16 Cores / 32 Threads", "144MB 3D V-Cache", "120W TDP"] },
  { id: "c3", type: "cpu", name: "Intel Core i7-14700K", priceMT: 39000, socket: "LGA1700", wattage: 253, image: getAssetUrl("/intel-core-i7-14700k.webp"), specs: ["20 Cores / 28 Threads", "Up to 5.6 GHz", "125W Base Power"] },
  { id: "c4", type: "cpu", name: "AMD Ryzen 7 7800X3D", priceMT: 36000, socket: "AM5", wattage: 120, image: getAssetUrl("/ryzen7.webp"), specs: ["8 Cores / 16 Threads", "96MB 3D V-Cache", "120W TDP"] },
  { id: "c5", type: "cpu", name: "Intel Core i5-13600K", priceMT: 26000, socket: "LGA1700", wattage: 181, image: getAssetUrl("/intel-core-i5-13600k.jpg"), specs: ["14 Cores / 20 Threads", "Up to 5.1 GHz", "125W Base Power"] },

  // RAM
  { id: "r1", type: "ram", name: "Corsair Dominator Titanium 64GB", priceMT: 35000, wattage: 15, image: getAssetUrl("/corsair-dominator-titanium-64gb.jpg"), specs: ["64GB (2x32GB)", "DDR5-6600", "C32 Timing"] },
  { id: "r2", type: "ram", name: "G.Skill Trident Z5 RGB 32GB", priceMT: 18000, wattage: 10, image: getAssetUrl("/gskill-trident-z5-rgb-32gb.jpg"), specs: ["32GB (2x16GB)", "DDR5-7200", "C34 Timing"] },
  { id: "r3", type: "ram", name: "Kingston FURY Beast 32GB", priceMT: 12000, wattage: 8, image: getAssetUrl("/kingston-fury-beast-32gb.jpg"), specs: ["32GB (2x16GB)", "DDR5-6000", "C36 Timing"] },

  // Storage
  { id: "s1", type: "storage", name: "Samsung 990 PRO 4TB", priceMT: 39000, wattage: 8, image: getAssetUrl("/samsung-990-pro-4tb.jpg"), specs: ["4TB NVMe M.2", "PCIe 4.0", "Read 7450 MB/s"] },
  { id: "s2", type: "storage", name: "WD Black SN850X 2TB", priceMT: 16000, wattage: 6, image: getAssetUrl("/wd-black-sn850x-2tb.webp"), specs: ["2TB NVMe M.2", "PCIe 4.0", "Read 7300 MB/s"] },
  { id: "s3", type: "storage", name: "Crucial T700 2TB Gen5", priceMT: 31000, wattage: 11, image: getAssetUrl("/crucial-t700-2tb-gen5.png"), specs: ["2TB NVMe M.2", "PCIe 5.0", "Read 12,400 MB/s"] },

  // Coolers (CPU Coolers)
  { id: "co1", type: "cooler", name: "ROG RYUJIN III 360 ARGB", priceMT: 24000, wattage: 35, image: getAssetUrl("/ryujin.png"), specs: ["360mm AIO Liquid Cooler", "LCD Screen", "Magnetic Fans"] },
  { id: "co2", type: "cooler", name: "Lian Li Galahad II Trinity", priceMT: 14000, wattage: 25, image: getAssetUrl("/galahad.jpg"), specs: ["360mm Performance Cooler", "RGB Fans", "Modular Pump Cap"] },
  { id: "co3", type: "cooler", name: "DeepCool AK620 Digital", priceMT: 6000, wattage: 5, image: getAssetUrl("/ak620.webp"), specs: ["Dual Tower Air Cooler", "Status Display", "Six Heat Pipes"] },

  // GPUs
  { id: "g1", type: "gpu", name: "ROG Matrix RTX 4090", priceMT: 280000, wattage: 500, image: getAssetUrl("/rog4090.jpg"), specs: ["24GB GDDR6X", "Liquid Metal", "360mm AIO Cooler"] },
  { id: "g2", type: "gpu", name: "Sapphire Nitro+ RX 7900 XTX", priceMT: 110000, wattage: 420, image: getAssetUrl("/sapphire.jpg"), specs: ["24GB GDDR6", "Vapor-X Cooling", "Dual BIOS"] },
  { id: "g3", type: "gpu", name: "MSI SUPRIM X RTX 4080 SUPER", priceMT: 95000, wattage: 320, image: getAssetUrl("/msi-suprim-x-rtx-4080-super.jpg"), specs: ["16GB GDDR6X", "Tri Frozr 3S", "DLSS 3"] },
  { id: "g4", type: "gpu", name: "GIGABYTE AERO RTX 4070 Ti SUPER", priceMT: 72000, wattage: 285, image: getAssetUrl("/gigabyte-aero-rtx-4070-ti-super.jpg"), specs: ["16GB GDDR6X", "White Edit", "Windforce Cooling"] },

  // PSUs
  { id: "p1", type: "psu", name: "Be Quiet! Dark Power Pro 13", priceMT: 35000, wattage: 1600, image: getAssetUrl("/be-quiet-dark-power-pro-13.jpg"), specs: ["1600W", "80 PLUS Titanium", "ATX 3.0 Compatible"] },
  { id: "p2", type: "psu", name: "Corsair AX1600i", priceMT: 42000, wattage: 1600, image: getAssetUrl("/corsair-ax1600i.avif"), specs: ["1600W", "80 PLUS Titanium", "Digital ATX"] },
  { id: "p3", type: "psu", name: "Seasonic FOCUS GX-1000", priceMT: 18000, wattage: 1000, image: getAssetUrl("/seasonic-focus-gx-1000.jpg"), specs: ["1000W", "80 PLUS Gold", "Fully Modular"] },
  { id: "p4", type: "psu", name: "Corsair RM850x", priceMT: 14000, wattage: 850, image: getAssetUrl("/corsair-rm850x.avif"), specs: ["850W", "80 PLUS Gold", "Fully Modular"] },

  // Cases
  { id: "ca1", type: "case", name: "Hyte Y70 Touch", priceMT: 36000, wattage: 20, image: getAssetUrl("/hyte-y70-touch.jpg"), specs: ["Integrated 4K Touchscreen", "Dual Chamber", "Vertical GPU", "E-ATX"] },
  { id: "ca2", type: "case", name: "Lian Li O11D EVO XL", priceMT: 22000, wattage: 0, image: getAssetUrl("/lian-li-o11d-evo-xl.webp"), specs: ["Full Tower", "Tempered Glass", "Reversible", "E-ATX"] },
  { id: "ca3", type: "case", name: "Fractal Design North", priceMT: 16000, wattage: 0, image: getAssetUrl("/fractal-design-north.webp"), specs: ["Mid Tower", "Real Oak Wood", "Airflow Focused", "ATX"] },

  // Fans
  { id: "fa1", type: "fans", name: "Lian Li Uni Fan SL-Inf 120 (3-Pack)", priceMT: 8500, wattage: 12, image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80", specs: ["120mm", "Infinity Mirror RGB", "Daisy-Chain"] },
  { id: "fa2", type: "fans", name: "Noctua NF-A12x25 (3-Pack)", priceMT: 7200, wattage: 6, image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=500&q=80", specs: ["120mm", "Ultra-Low Noise", "PWM Premium"] },
  { id: "fa3", type: "fans", name: "be quiet! Silent Wings 4 140mm (3-Pack)", priceMT: 6800, wattage: 9, image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=500&q=80", specs: ["140mm", "4-Pin PWM", "Rifle Bearing"] },
  { id: "fa4", type: "fans", name: "Corsair iCUE LINK QX120 (3-Pack)", priceMT: 12000, wattage: 15, image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80", specs: ["120mm", "iCUE LINK Ecosystem", "RGB 34-LEDs"] },

  // Peripherals / Accessories
  { id: "per1", type: "peripheral", name: "Razer DeathAdder V3 Pro", priceMT: 8500, image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=500", specs: ["Rato Sem Fio", "30K DPI Óptico", "Ergonómico"] },
  { id: "per2", type: "peripheral", name: "Logitech G Pro X TKL", priceMT: 12000, image: "https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=500", specs: ["Teclado Sem Fio", "Switches Tácteis", "Tenkeyless"] },
  { id: "per3", type: "peripheral", name: "SteelSeries Arctis Nova Pro", priceMT: 18000, image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=500", specs: ["Headset Sem Fio", "ANC", "Hi-Res Audio"] },
  { id: "per4", type: "peripheral", name: "Thermal Grizzly Kryonaut", priceMT: 1500, image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=500", specs: ["Pasta Térmica", "12.5 W/mk", "1 gram"] },
];

export function usePCBuilder() {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');

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
    if (preset) {
      const ids = preset.split(',');
      const getC = (type: string) => mockComponents.find(c => c.type === type && ids.includes(c.id)) || null;

      setSelectedMotherboard(getC('motherboard'));
      setSelectedCPU(getC('cpu'));
      setSelectedRAM(getC('ram'));
      setSelectedStorage(getC('storage'));
      setSelectedCooler(getC('cooler'));
      setSelectedGPU(getC('gpu'));
      setSelectedPSU(getC('psu'));
      setSelectedCase(getC('case'));
      setSelectedFans(getC('fans'));

      const pers = mockComponents.filter(c => c.type === 'peripheral' && ids.includes(c.id));
      if (pers.length > 0) setSelectedPeripherals(pers);
    }
  }, [preset]);

  const recommendedMotherboards = useMemo(() => {
    if (!selectedCPU) return mockComponents.filter(c => c.type === "motherboard");
    return mockComponents.filter(c => c.type === "motherboard" && c.socket === selectedCPU.socket);
  }, [selectedCPU]);

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
    if (totalWattage > psuCapacity * 0.8) {
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
    mockComponents,
    selections: { selectedMotherboard, selectedCPU, selectedRAM, selectedStorage, selectedCooler, selectedGPU, selectedPSU, selectedCase, selectedFans, selectedPeripherals },
    setters: { setSelectedMotherboard, setSelectedCPU, setSelectedRAM, setSelectedStorage, setSelectedCooler, setSelectedGPU, setSelectedPSU, setSelectedCase, setSelectedFans, setSelectedPeripherals },
    totalPrice,
    totalWattage,
    recommendedMotherboards,
    psuWarning,
    smartUpsell
  };
}
