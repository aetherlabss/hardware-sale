import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function getSessionId() {
  let sessionId = localStorage.getItem('matrix_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('matrix_session_id', sessionId);
  }
  return sessionId;
}

export type EventType = 'pageview' | 'add_to_cart' | 'checkout';

export async function logEvent(type: EventType, path: string, value?: number) {
  try {
    const eventId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const eventRef = doc(collection(db, 'analytics_events'), eventId);
    
    const eventData: any = {
      type,
      path,
      sessionId: getSessionId(),
      timestamp: serverTimestamp()
    };
    if (value !== undefined) {
      eventData.value = value;
    }
    
    await setDoc(eventRef, eventData);
  } catch (error) {
    console.error("Failed to log event:", error);
  }
}
