// Lightweight admin audit log. Every meaningful write performed from the
// admin dashboard records an entry in `admin_audit` so we have a forensic
// trail: who changed what, when, with which payload.
//
// Reads/writes are admin-only (see firestore.rules).

import { db, auth } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type AuditAction =
  | 'product.create' | 'product.update' | 'product.delete'
  | 'builder.create' | 'builder.update' | 'builder.delete' | 'builder.toggle'
  | 'order.update'   | 'order.delete'   | 'order.status'
  | 'coupon.create'  | 'coupon.update'  | 'coupon.delete' | 'coupon.target'
  | 'inventory.bulk' | 'inventory.update'
  | 'settings.update' | 'shipping.update' | 'bom.update'
  | 'admin.login'    | 'admin.logout'
  | 'ai_studio.usage';

interface AuditPayload {
  action: AuditAction;
  targetId?: string;
  /** Light snapshot of the relevant data — keep it small. Avoid PII when possible. */
  data?: Record<string, unknown>;
}

export async function logAuditEvent(payload: AuditPayload): Promise<void> {
  try {
    const u = auth.currentUser;
    await addDoc(collection(db, 'admin_audit'), {
      action: payload.action,
      targetId: payload.targetId || null,
      data: payload.data || null,
      actorUid: u?.uid || null,
      actorEmail: u?.email || null,
      at: serverTimestamp(),
    });
  } catch (err) {
    // Audit failures must not block the underlying action — just log locally
    console.warn('Audit log write failed:', (err as Error)?.message || err);
  }
}
