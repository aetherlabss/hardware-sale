// Thin client wrapper around /api/ai-proxy.
//
// Every Gemini/Vertex call in the app should go through here so we never ship
// the API key in the client bundle. Tracks usage via aiTracking just like the
// old direct-SDK code did, but the key stays server-side.

import { logAetherLabsUsage } from './aiTracking';

export type AiMode = 'text' | 'json';

export interface AskAIOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  mode?: AiMode;
  model?: string;
  image?: { data: string; mimeType: string };
  images?: { data: string; mimeType: string }[];
  /** Either { googleSearch: true } for grounding, or an array of tool descriptors (function declarations). */
  tools?: { googleSearch?: true } | any[];
  /** If true, do not call aiTracking.logAetherLabsUsage on success */
  silent?: boolean;
}

export interface FunctionCall {
  name: string;
  args: any;
}

export interface AskAIResult {
  text: string;
  functionCalls?: FunctionCall[];
  totalTokens: number;
  latencyMs: number;
}

export async function askAI(opts: AskAIOptions): Promise<AskAIResult> {
  const startedAt = performance.now();
  const res = await fetch('/api/ai-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: opts.prompt,
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature,
      mode: opts.mode,
      model: opts.model,
      image: opts.image,
      images: opts.images,
      tools: opts.tools,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.error || `AI request failed (${res.status})`;
    throw new Error(msg);
  }
  const result: AskAIResult = {
    text: (data as any).text || '',
    functionCalls: (data as any).functionCalls,
    totalTokens: (data as any).usage?.totalTokens || 0,
    latencyMs: (data as any).latencyMs || performance.now() - startedAt,
  };
  if (!opts.silent) {
    logAetherLabsUsage(result.latencyMs, opts.prompt, result.text, result.totalTokens);
  }
  return result;
}

/** Convenience: ask and just return the text. */
export async function askAIText(opts: AskAIOptions): Promise<string> {
  const { text } = await askAI(opts);
  return text;
}

/** Convenience: ask in JSON mode and parse. Throws if response isn't valid JSON. */
export async function askAIJson<T = any>(opts: Omit<AskAIOptions, 'mode'>): Promise<T> {
  const { text } = await askAI({ ...opts, mode: 'json' });
  // Some Gemini outputs still wrap in ```json … ``` even in JSON mode
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
