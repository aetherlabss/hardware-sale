// Server-side proxy for all Vertex/Gemini calls.
//
// Why: the previous architecture called Google GenAI from the browser using
// VITE_VERTEX_API_KEY, which inlined the key into the public JS bundle.
// Anyone could extract it and spend the AI budget. This endpoint keeps the
// key server-only and acts as the single funnel for every AI feature.
//
// Required env vars:
//   VERTEX_API_KEY      — server-only Vertex/Gemini API key
//   VERTEX_PROJECT_ID   — (optional) GCP project id, default "matrix-hardware"
//   VERTEX_LOCATION     — (optional) GCP region, default "us-central1"
//
// Request shape:
//   { prompt: string,
//     systemInstruction?: string,
//     temperature?: number,         // 0.0–1.5, default 0.5
//     mode?: 'text' | 'json',       // forces application/json output
//     model?: string,               // default "gemini-3.1-pro-preview"
//     image?: { data: string, mimeType: string }, // optional base64 image
//     tools?: any[] | { googleSearch?: true },    // grounding or function decls
//   }
//
// Response:
//   { text: string,
//     functionCalls?: { name: string, args: any }[],
//     usage?: { totalTokens: number }, latencyMs: number }

import { GoogleGenAI } from '@google/genai';
import { gateBrowserRequest } from './_security';

// Hard caps so an abused request can't burn unlimited budget
const MAX_PROMPT_LEN = 24_000;
const MAX_SYSTEM_LEN = 8_000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;  // 6 MB (base64 expands ~33%)
const ALLOWED_MODELS = new Set([
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
]);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // 60 calls per minute per IP — generous but stops budget runaway
  if (!gateBrowserRequest(req, res, { rateLimit: 60, windowMs: 60_000 })) return;

  const apiKey = process.env.VERTEX_API_KEY || process.env.VITE_VERTEX_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'VERTEX_API_KEY is not set on the server.' });

  const body = req.body || {};
  const prompt: string = String(body.prompt ?? '');
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  if (prompt.length > MAX_PROMPT_LEN) {
    return res.status(413).json({ error: `prompt exceeds ${MAX_PROMPT_LEN} chars` });
  }

  const systemInstruction: string | undefined = body.systemInstruction
    ? String(body.systemInstruction).slice(0, MAX_SYSTEM_LEN)
    : undefined;

  const temperature: number = typeof body.temperature === 'number'
    ? Math.max(0, Math.min(1.5, body.temperature))
    : 0.5;

  const model: string = ALLOWED_MODELS.has(body.model) ? body.model : 'gemini-3.1-pro-preview';
  const mode: 'text' | 'json' = body.mode === 'json' ? 'json' : 'text';

  // Build the contents array (supports optional vision — single or multiple)
  const parts: any[] = [];
  const imgs: { data: string; mimeType: string }[] = [];
  if (body.image && typeof body.image === 'object') imgs.push(body.image);
  if (Array.isArray(body.images)) imgs.push(...body.images);
  if (imgs.length > 6) {
    return res.status(400).json({ error: 'maximum 6 images per request' });
  }
  for (const img of imgs) {
    if (!img || typeof img.data !== 'string' || typeof img.mimeType !== 'string') {
      return res.status(400).json({ error: 'each image needs data and mimeType strings' });
    }
    if (img.data.length * 0.75 > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'image too large (max 6 MB each)' });
    }
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(img.mimeType)) {
      return res.status(400).json({ error: 'unsupported image mime type' });
    }
    parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
  }
  parts.push({ text: prompt });

  const config: any = { temperature };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (mode === 'json') config.responseMimeType = 'application/json';
  // Tools: either a structured object (shorthand for Google Search grounding)
  // or an array of tool descriptors (function declarations, etc.) passed through.
  if (Array.isArray(body.tools)) {
    config.tools = body.tools;
  } else if (body.tools?.googleSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const startedAt = Date.now();
  try {
    const ai = new GoogleGenAI({
      apiKey,
      vertexai: {
        project: process.env.VERTEX_PROJECT_ID || 'matrix-hardware',
        location: process.env.VERTEX_LOCATION || 'us-central1',
      } as any,
    });

    const resp = await ai.models.generateContent({
      model,
      contents: [{ parts }],
      config,
    });

    const text = resp.text || '';
    const functionCalls = Array.isArray(resp.functionCalls) && resp.functionCalls.length > 0
      ? resp.functionCalls.map((c: any) => ({ name: c.name, args: c.args }))
      : undefined;
    const totalTokens = resp.usageMetadata?.totalTokenCount
      || Math.ceil((prompt.length + (systemInstruction?.length || 0) + text.length) / 4);

    return res.status(200).json({
      text,
      functionCalls,
      usage: { totalTokens },
      latencyMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    console.error('ai-proxy error:', err?.message || err);
    return res.status(502).json({
      error: 'AI upstream failure',
      detail: process.env.NODE_ENV === 'production' ? undefined : err?.message,
    });
  }
}
