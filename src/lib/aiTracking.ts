import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logAetherLabsUsage(latencyMs: number, promptText: string, responseText: string, exactTokens?: number) {
  try {
    // Estimativa simples de tokens se a API não devolver o usageMetadata exato:
    // ~4 caracteres por token.
    const tokensToLog = exactTokens || Math.ceil((promptText.length + responseText.length) / 4);
    
    // Workaround Seguro: Vamos usar a tabela "analytics_events" para não precisares de
    // fazer deploy (firebase deploy --only firestore:rules) da nova tabela "ai_usage".
    // Mapeamento: type="ai_usage", path=Modelo, sessionId=Latência, value=Tokens
    await addDoc(collection(db, 'analytics_events'), {
      type: 'ai_usage',
      path: 'gemini-3.1-pro-preview',
      sessionId: String(Math.round(latencyMs)),
      value: tokensToLog,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Falha ao registar telemetria AetherLabs", error);
  }
}
