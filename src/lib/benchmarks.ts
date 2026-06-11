// Data-driven PC performance estimation engine.
//
// Pure, side-effect-free, and unit-tested (see benchmarks.test.ts). Replaces the
// scattered `name.includes('4090')` heuristics that used to live inside
// SmartBuilder. Everything keys off a fuzzy name match against relative
// performance indices (RTX 4090 / Ryzen 7800X3D ≈ 100), so adding a product to
// the catalogue immediately benchmarks correctly without touching the UI.
//
// The numbers are *estimates* anchored to public 1440p review aggregates — good
// enough to rank builds and flag bottlenecks, deliberately labelled as estimates
// in the UI. They are NOT a promise of real-world FPS.

export type Resolution = '1080p' | '1440p' | '4K';

// ─── Relative performance indices ──────────────────────────────────────────
// Gaming-weighted. Normalised so the current halo card ≈ 100. Order matters:
// the matcher takes the FIRST key whose tokens all appear in the product name,
// so more specific keys (e.g. "4070 ti super") must precede looser ones ("4070").

interface IndexRow { match: string[]; score: number }

const GPU_INDEX: IndexRow[] = [
  { match: ['5090'], score: 135 },
  { match: ['4090'], score: 100 },
  { match: ['5080'], score: 90 },
  { match: ['7900', 'xtx'], score: 85 },
  { match: ['4080', 'super'], score: 84 },
  { match: ['4080'], score: 80 },
  { match: ['7900', 'xt'], score: 76 },
  { match: ['5070', 'ti'], score: 74 },
  { match: ['4070', 'ti', 'super'], score: 72 },
  { match: ['4070', 'ti'], score: 66 },
  { match: ['7800', 'xt'], score: 64 },
  { match: ['4070', 'super'], score: 62 },
  { match: ['5070'], score: 60 },
  { match: ['4070'], score: 56 },
  { match: ['3080'], score: 55 },
  { match: ['7700', 'xt'], score: 53 },
  { match: ['4060', 'ti'], score: 46 },
  { match: ['3070'], score: 45 },
  { match: ['7600'], score: 40 },
  { match: ['4060'], score: 38 },
  { match: ['3060'], score: 32 },
  { match: ['1660'], score: 18 },
];

const CPU_INDEX: IndexRow[] = [
  { match: ['9800', 'x3d'], score: 108 },
  { match: ['7800', 'x3d'], score: 100 },
  { match: ['7950', 'x3d'], score: 99 },
  { match: ['14900'], score: 96 },
  { match: ['13900'], score: 92 },
  { match: ['14700'], score: 88 },
  { match: ['7950'], score: 87 },
  { match: ['13700'], score: 84 },
  { match: ['7900'], score: 82 },
  { match: ['14600'], score: 78 },
  { match: ['13600'], score: 75 },
  { match: ['7700'], score: 72 },
  { match: ['7600'], score: 64 },
  { match: ['12600'], score: 62 },
  { match: ['5800', 'x3d'], score: 70 },
  { match: ['5800'], score: 58 },
  { match: ['12400'], score: 52 },
  { match: ['5600'], score: 50 },
  { match: ['i9'], score: 85 },
  { match: ['i7'], score: 75 },
  { match: ['i5'], score: 58 },
  { match: ['ryzen', '9'], score: 80 },
  { match: ['ryzen', '7'], score: 68 },
  { match: ['ryzen', '5'], score: 52 },
];

function lookupScore(name: string | null | undefined, table: IndexRow[], fallback: number): number {
  if (!name) return 0;
  const n = name.toLowerCase();
  for (const row of table) {
    if (row.match.every((tok) => n.includes(tok))) return row.score;
  }
  return fallback;
}

/** Relative GPU gaming index (RTX 4090 ≈ 100). 0 when no GPU. */
export function scoreGpu(name: string | null | undefined): number {
  if (!name) return 0;
  return lookupScore(name, GPU_INDEX, 28); // unknown discrete card ≈ entry-level
}

/** Relative CPU gaming index (Ryzen 7800X3D ≈ 100). 0 when no CPU. */
export function scoreCpu(name: string | null | undefined): number {
  if (!name) return 0;
  return lookupScore(name, CPU_INDEX, 45);
}

// ─── Game catalogue ─────────────────────────────────────────────────────────
// refFps = frame rate a reference 100/100 build reaches. gpuWeight is how
// GPU-bound the title is (1 = pure GPU, 0 = pure CPU). Esports titles lean CPU,
// AAA/RT titles lean GPU.

export interface GameProfile {
  id: string;
  name: string;
  gpuWeight: number;
  refFps: Record<Resolution, number>;
}

export const GAMES: GameProfile[] = [
  { id: 'valorant',  name: 'Valorant',           gpuWeight: 0.25, refFps: { '1080p': 760, '1440p': 620, '4K': 420 } },
  { id: 'warzone',   name: 'Warzone',            gpuWeight: 0.65, refFps: { '1080p': 280, '1440p': 210, '4K': 120 } },
  { id: 'fortnite',  name: 'Fortnite (Epic)',    gpuWeight: 0.6,  refFps: { '1080p': 300, '1440p': 220, '4K': 130 } },
  { id: 'cyberpunk', name: 'Cyberpunk 2077 (RT)', gpuWeight: 0.9, refFps: { '1080p': 150, '1440p': 110, '4K': 64 } },
  { id: 'gtav',      name: 'GTA V',              gpuWeight: 0.5,  refFps: { '1080p': 200, '1440p': 165, '4K': 110 } },
  { id: 'forza',     name: 'Forza Horizon 5',    gpuWeight: 0.7,  refFps: { '1080p': 190, '1440p': 150, '4K': 95 } },
];

/**
 * Estimated average FPS for a GPU+CPU pair on a game at a resolution.
 * Uses a weighted geometric blend of the two indices so the weaker part drags
 * the result down (a real bottleneck), rather than a naive average.
 */
export function estimateFps(
  gpuName: string | null | undefined,
  cpuName: string | null | undefined,
  game: GameProfile,
  resolution: Resolution = '1440p',
): number {
  const gpu = scoreGpu(gpuName);
  const cpu = scoreCpu(cpuName);
  if (gpu <= 0 || cpu <= 0) return 0;
  const gpuF = gpu / 100;
  const cpuF = cpu / 100;
  const blend = Math.pow(gpuF, game.gpuWeight) * Math.pow(cpuF, 1 - game.gpuWeight);
  return Math.max(1, Math.round(game.refFps[resolution] * blend));
}

export interface Bottleneck {
  component: 'cpu' | 'gpu' | null;
  /** 0–100, how lopsided the pairing is at this resolution. */
  severity: number;
  message: string | null;
}

/**
 * Detects whether the CPU or GPU is holding the pair back. Resolution shifts the
 * expectation: at 1080p the CPU should roughly keep up with the GPU; at 4K a
 * strong GPU is expected to lead, so only a very weak CPU flags.
 */
export function detectBottleneck(
  gpuName: string | null | undefined,
  cpuName: string | null | undefined,
  resolution: Resolution = '1440p',
): Bottleneck {
  const gpu = scoreGpu(gpuName);
  const cpu = scoreCpu(cpuName);
  if (gpu <= 0 || cpu <= 0) return { component: null, severity: 0, message: null };

  // Expected CPU index for a balanced pairing, by resolution. At 4K the GPU does
  // most of the work, so a lower CPU is acceptable.
  const expectedCpuRatio = resolution === '1080p' ? 1.0 : resolution === '1440p' ? 0.85 : 0.7;
  const expectedCpu = gpu * expectedCpuRatio;

  if (cpu < expectedCpu * 0.8) {
    const severity = Math.min(100, Math.round((1 - cpu / expectedCpu) * 100));
    return {
      component: 'cpu',
      severity,
      message: `O CPU pode limitar a ${gpuName?.trim()} em ${resolution} (estimativa ~${severity}% de bottleneck). Considera um processador mais forte para libertar a placa.`,
    };
  }
  // GPU much weaker than the CPU can feed → GPU is the limiter (expected, but
  // worth noting if extreme, e.g. a top CPU with an entry GPU).
  if (gpu < cpu * 0.55) {
    const severity = Math.min(100, Math.round((1 - gpu / cpu) * 100));
    return {
      component: 'gpu',
      severity,
      message: `O CPU está subaproveitado: a GPU é o fator limitante. Uma placa gráfica mais forte daria mais FPS sem trocar o resto.`,
    };
  }
  return { component: null, severity: 0, message: 'Combinação equilibrada — CPU e GPU bem casados para esta resolução.' };
}

// ─── Use-case tiers ──────────────────────────────────────────────────────────

export interface Tier { label: string; rank: number } // rank 0–5 for bar fills

export function gamingTier(gpuName?: string | null, cpuName?: string | null): Tier {
  const score = Math.round(scoreGpu(gpuName) * 0.7 + scoreCpu(cpuName) * 0.3);
  if (score >= 92) return { label: 'S+ Extreme', rank: 5 };
  if (score >= 78) return { label: 'S Ultra', rank: 4 };
  if (score >= 60) return { label: 'A High', rank: 3 };
  if (score >= 40) return { label: 'B Competitivo', rank: 2 };
  if (score > 0)   return { label: 'C Essencial', rank: 1 };
  return { label: '—', rank: 0 };
}

export function workstationTier(cpuName?: string | null, ramText?: string | null): Tier {
  const cpu = scoreCpu(cpuName);
  const ramGb = ramText ? parseInt(ramText.match(/(\d+)\s*gb/i)?.[1] || '0', 10) : 0;
  const score = Math.round(cpu * 0.7 + Math.min(100, ramGb * 1.4) * 0.3);
  if (score >= 90) return { label: 'S+ Divino', rank: 5 };
  if (score >= 75) return { label: 'S Avançado', rank: 4 };
  if (score >= 58) return { label: 'A Estável', rank: 3 };
  if (score >= 40) return { label: 'B Produtivo', rank: 2 };
  if (score > 0)   return { label: 'C Básico', rank: 1 };
  return { label: '—', rank: 0 };
}

export function aiTier(gpuName?: string | null): Tier {
  // AI/ML throughput tracks GPU + VRAM. Pull VRAM from the name when present.
  const score = scoreGpu(gpuName);
  const vram = gpuName ? parseInt(gpuName.match(/(\d+)\s*gb/i)?.[1] || '0', 10) : 0;
  if (score >= 95 || vram >= 24) return { label: 'S+ Core (24GB+)', rank: 5 };
  if (score >= 80 || vram >= 16) return { label: 'S Core (16GB)', rank: 4 };
  if (score >= 55 || vram >= 12) return { label: 'A Accelerated', rank: 3 };
  if (score >= 38) return { label: 'B Basic', rank: 2 };
  if (score > 0)   return { label: 'C Limitado', rank: 1 };
  return { label: '—', rank: 0 };
}
