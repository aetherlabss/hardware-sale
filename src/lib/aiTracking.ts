import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Cost per 1k tokens in USD (approximate Vertex AI pricing)
const MODEL_COST_PER_1K_TOKENS: Record<string, number> = {
  'gemini-3.1-pro-preview': 0.0025,
  'gemini-2.0-flash': 0.00015,
  'gemini-2.0-flash-lite': 0.000075,
  'imagen-4.0-generate-preview-06-06': 0, // flat rate per image, handled separately
  'veo-3.0-generate-preview': 0, // flat rate per second, handled separately
};

const MARKUP_FACTOR = 1.15; // 15% markup on top of API cost

export async function logAetherLabsUsage(
  latencyMs: number,
  promptText: string,
  responseText: string,
  exactTokens?: number,
  model: string = 'gemini-3.1-pro-preview',
  flatCostUsd?: number // for image/video, pass the flat cost directly
) {
  try {
    const tokensToLog = exactTokens || Math.ceil((promptText.length + responseText.length) / 4);

    // Calculate cost: flat rate (images/video) or token-based
    let rawCostUsd = 0;
    if (flatCostUsd !== undefined) {
      rawCostUsd = flatCostUsd;
    } else {
      const costPer1k = MODEL_COST_PER_1K_TOKENS[model] ?? 0.001;
      rawCostUsd = (tokensToLog / 1000) * costPer1k;
    }
    const costWithMarkup = rawCostUsd * MARKUP_FACTOR;

    await addDoc(collection(db, 'analytics_events'), {
      type: 'ai_usage',
      path: model,
      sessionId: String(Math.round(latencyMs)),
      value: tokensToLog,
      costUsd: costWithMarkup,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Falha ao registar telemetria AetherLabs", error);
  }
}
