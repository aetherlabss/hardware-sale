// Small, pure formatting/normalisation helpers shared by the admin features.
// Kept dependency-free and pure so they're trivial to reason about and test.

/** Format a number as Meticais, e.g. 12500 -> "12,500 MT". */
export function formatMT(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  return `${v.toLocaleString()} MT`;
}

/** Coerce a Firestore Timestamp | number | Date into epoch milliseconds. */
export function tsToMillis(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  if (v instanceof Date) return v.getTime();
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}

/** Coerce to a Date (epoch 0 if unknown). */
export function tsToDate(v: any): Date {
  return new Date(tsToMillis(v));
}

/** Compact relative time in Portuguese, e.g. "há 3h", "há 2d". */
export function timeAgo(v: any): string {
  const ms = tsToMillis(v);
  if (!ms) return '—';
  const diff = Date.now() - ms;
  if (diff < 0) return 'agora';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'agora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `há ${mo} mês${mo > 1 ? 'es' : ''}`;
  return `há ${Math.floor(mo / 12)} ano(s)`;
}

/** Build a wa.me link to a Mozambican number with a prefilled message. */
export function whatsappLink(phone: string | undefined, message: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  const msisdn = digits.startsWith('258') ? digits : `258${digits}`;
  return `https://wa.me/${msisdn}?text=${encodeURIComponent(message)}`;
}

/** Unit price of an order line, tolerating both old ({price}) and new ({unitPrice}) shapes. */
export function lineUnitPrice(item: any): number {
  return Number(item?.unitPrice ?? item?.price) || 0;
}

/** Quantity of an order line, tolerating both {qty} and {quantity}. */
export function lineQty(item: any): number {
  return Math.max(1, Math.floor(Number(item?.qty ?? item?.quantity) || 1));
}
