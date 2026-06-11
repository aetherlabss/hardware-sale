import { describe, it, expect } from 'vitest';
import {
  scoreGpu, scoreCpu, estimateFps, detectBottleneck,
  gamingTier, workstationTier, aiTier, GAMES,
} from './benchmarks';

const game = (id: string) => GAMES.find((g) => g.id === id)!;

describe('scoreGpu / scoreCpu', () => {
  it('ranks the halo cards near 100', () => {
    expect(scoreGpu('NVIDIA GeForce RTX 4090')).toBe(100);
    expect(scoreCpu('AMD Ryzen 7 7800X3D')).toBe(100);
  });

  it('orders cards correctly and matches specific keys before loose ones', () => {
    expect(scoreGpu('RTX 4070 Ti Super')).toBeGreaterThan(scoreGpu('RTX 4070'));
    expect(scoreGpu('RTX 4090')).toBeGreaterThan(scoreGpu('RTX 4080'));
    expect(scoreGpu('RTX 4060')).toBeGreaterThan(scoreGpu('RTX 3060'));
  });

  it('returns 0 for missing parts and a sane fallback for unknown ones', () => {
    expect(scoreGpu(null)).toBe(0);
    expect(scoreCpu(undefined)).toBe(0);
    expect(scoreGpu('Some Unknown GPU 9000')).toBeGreaterThan(0);
  });
});

describe('estimateFps', () => {
  it('is 0 until both a GPU and CPU are chosen', () => {
    expect(estimateFps('RTX 4090', null, game('valorant'))).toBe(0);
    expect(estimateFps(null, 'i9-14900K', game('cyberpunk'))).toBe(0);
  });

  it('gives a top build very high esports FPS and lower 4K RT FPS', () => {
    const valorant = estimateFps('RTX 4090', 'Ryzen 7 7800X3D', game('valorant'), '1080p');
    const cyberpunk4k = estimateFps('RTX 4090', 'Ryzen 7 7800X3D', game('cyberpunk'), '4K');
    expect(valorant).toBeGreaterThan(400);
    expect(cyberpunk4k).toBeLessThan(valorant);
  });

  it('scales down at higher resolutions for GPU-bound games', () => {
    const at1080 = estimateFps('RTX 4070', 'Ryzen 5 7600', game('cyberpunk'), '1080p');
    const at4k = estimateFps('RTX 4070', 'Ryzen 5 7600', game('cyberpunk'), '4K');
    expect(at1080).toBeGreaterThan(at4k);
  });

  it('a weaker GPU produces fewer FPS than a stronger one, same CPU', () => {
    const strong = estimateFps('RTX 4090', 'i7-14700K', game('warzone'), '1440p');
    const weak = estimateFps('RTX 4060', 'i7-14700K', game('warzone'), '1440p');
    expect(strong).toBeGreaterThan(weak);
  });
});

describe('detectBottleneck', () => {
  it('flags the CPU when a weak CPU is paired with a strong GPU at 1080p', () => {
    const b = detectBottleneck('RTX 4090', 'Ryzen 5 5600', '1080p');
    expect(b.component).toBe('cpu');
    expect(b.severity).toBeGreaterThan(0);
  });

  it('treats a balanced high-end pairing as healthy', () => {
    const b = detectBottleneck('RTX 4090', 'Ryzen 7 7800X3D', '1440p');
    expect(b.component).toBeNull();
  });

  it('returns no bottleneck when a part is missing', () => {
    expect(detectBottleneck('RTX 4090', null).component).toBeNull();
  });
});

describe('tiers', () => {
  it('rates a halo build top-tier across use cases', () => {
    expect(gamingTier('RTX 4090', 'Ryzen 7 7800X3D').rank).toBe(5);
    expect(workstationTier('i9-14900K', '64GB DDR5').rank).toBeGreaterThanOrEqual(4);
    expect(aiTier('RTX 4090 24GB').rank).toBe(5);
  });

  it('returns an empty tier when nothing is selected', () => {
    expect(gamingTier(null, null).rank).toBe(0);
    expect(aiTier(null).rank).toBe(0);
  });
});
