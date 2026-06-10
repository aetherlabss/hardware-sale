import { useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { logAuditEvent } from '../../lib/audit';
import { formatMT, timeAgo, tsToMillis, whatsappLink, lineUnitPrice, lineQty } from '../../lib/adminFormat';
import { ShoppingBag, MessageCircle, Trash2, Search, Clock, Banknote } from 'lucide-react';

// ── Pipeline model ──────────────────────────────────────────────────────────
export const ORDER_STATES = [
  { id: 'pendente',   label: 'Pendente',    dot: 'bg-orange-400',  chip: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  { id: 'pago',       label: 'Pago',        dot: 'bg-brand-neon',  chip: 'bg-brand-neon/15 text-brand-neon border-brand-neon/30' },
  { id: 'a_preparar', label: 'A preparar',  dot: 'bg-yellow-400',  chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  { id: 'enviado',    label: 'Enviado',     dot: 'bg-blue-400',    chip: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { id: 'entregue',   label: 'Entregue',    dot: 'bg-green-400',   chip: 'bg-green-500/15 text-green-300 border-green-500/30' },
  { id: 'cancelado',  label: 'Cancelado',   dot: 'bg-red-400',     chip: 'bg-red-500/15 text-red-300 border-red-500/30' },
] as const;

type StateId = typeof ORDER_STATES[number]['id'];

function normaliseStatus(order: any): StateId {
  const s = String(order?.status || '').toLowerCase();
  if (ORDER_STATES.some(st => st.id === s)) return s as StateId;
  if (order?.paymentStatus === 'confirmed') return 'pago';
  return 'pendente';
}

export function OrdersPipeline({ checkouts }: { checkouts: any[] }) {
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<StateId | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? checkouts.filter(o =>
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.customerPhone || '').includes(q) ||
          (o.id || '').toLowerCase().includes(q))
      : checkouts;
    return [...list].sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
  }, [checkouts, search]);

  const byState = useMemo(() => {
    const map: Record<StateId, any[]> = { pendente: [], pago: [], a_preparar: [], enviado: [], entregue: [], cancelado: [] };
    for (const o of filtered) map[normaliseStatus(o)].push(o);
    return map;
  }, [filtered]);

  const kpis = useMemo(() => {
    const pendingRevenue = byState.pendente.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const paidStates: StateId[] = ['pago', 'a_preparar', 'enviado', 'entregue'];
    const confirmedRevenue = paidStates.reduce((s, st) => s + byState[st].reduce((a, o) => a + (Number(o.total) || 0), 0), 0);
    const stale = byState.pendente.filter(o => Date.now() - tsToMillis(o.createdAt) > 24 * 3600 * 1000).length;
    return { pendingRevenue, confirmedRevenue, stale, open: byState.pendente.length + byState.pago.length + byState.a_preparar.length };
  }, [byState]);

  const moveOrder = async (order: any, to: StateId) => {
    const from = normaliseStatus(order);
    if (from === to) return;
    try {
      await updateDoc(doc(db, 'checkouts', order.id), {
        status: to,
        statusHistory: arrayUnion({ status: to, at: Date.now() }),
      });
      await logAuditEvent({ action: 'order.status', targetId: order.id, data: { from, to } });
    } catch (err) {
      console.error('moveOrder failed', err);
      alert('Não foi possível atualizar o estado da encomenda.');
    }
  };

  const removeOrder = async (order: any) => {
    if (!window.confirm('Eliminar este registo de encomenda permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'checkouts', order.id));
      await logAuditEvent({ action: 'order.delete', targetId: order.id, data: { name: order.customerName, total: order.total } });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Pipeline de Encomendas</h2>
        <p className="text-gray-400">Arrasta os cartões entre colunas (ou usa o seletor no telemóvel) para atualizar o estado.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<ShoppingBag size={16} />} label="Em aberto" value={String(kpis.open)} tone="neon" />
        <Kpi icon={<Banknote size={16} />} label="Receita confirmada" value={formatMT(kpis.confirmedRevenue)} tone="green" />
        <Kpi icon={<Clock size={16} />} label="Receita pendente" value={formatMT(kpis.pendingRevenue)} tone="orange" />
        <Kpi icon={<Clock size={16} />} label="Pendentes >24h" value={String(kpis.stale)} tone={kpis.stale > 0 ? 'red' : 'neutral'} />
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por cliente, telefone ou ID…"
          aria-label="Pesquisar encomendas"
          className="w-full bg-black/40 border border-white/10 rounded-xl h-11 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon/50"
        />
      </div>

      {checkouts.length === 0 ? (
        <div className="bg-[#0a0a14] border border-white/5 rounded-3xl py-20 flex flex-col items-center justify-center text-center">
          <ShoppingBag className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white">Sem encomendas</h3>
          <p className="text-gray-400">As encomendas dos clientes aparecem aqui em tempo real.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x">
          {ORDER_STATES.map(col => (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol(c => (c === col.id ? null : c))}
              onDrop={() => {
                const o = checkouts.find(x => x.id === dragId);
                if (o) moveOrder(o, col.id);
                setDragId(null); setOverCol(null);
              }}
              className={`shrink-0 w-[85vw] sm:w-80 snap-start rounded-2xl border transition-colors ${
                overCol === col.id ? 'border-brand-neon/60 bg-brand-neon/[0.04]' : 'border-white/5 bg-[#0a0a14]'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className="font-bold text-white text-sm">{col.label}</span>
                </div>
                <span className="text-xs font-mono text-gray-500 bg-white/5 rounded-full px-2 py-0.5">{byState[col.id].length}</span>
              </div>

              <div className="p-3 space-y-3 min-h-[120px] max-h-[70vh] overflow-y-auto">
                {byState[col.id].map(order => (
                  <article
                    key={order.id}
                    draggable
                    onDragStart={() => setDragId(order.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    className="bg-black/40 border border-white/10 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-white font-bold text-sm truncate">{order.customerName || 'Cliente'}</div>
                        <div className="text-brand-magenta text-xs font-mono truncate">{order.customerPhone || '—'}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">{formatMT(order.total)}</div>
                        <div className="text-[10px] text-gray-500">{order.paymentMethod === 'emola' ? 'e-Mola' : 'M-Pesa'}</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400 mb-3">
                      {(order.items?.length || 0)} item(s) · {timeAgo(order.createdAt)}
                      <span className="block font-mono text-gray-600 mt-0.5">#{String(order.id).slice(0, 8)}</span>
                    </div>

                    {/* Per-card actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={normaliseStatus(order)}
                        onChange={(e) => moveOrder(order, e.target.value as StateId)}
                        aria-label="Mudar estado da encomenda"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg h-8 px-2 text-xs text-white focus:outline-none focus:border-brand-neon/50"
                      >
                        {ORDER_STATES.map(s => <option key={s.id} value={s.id} className="bg-[#0a0a14]">{s.label}</option>)}
                      </select>
                      <a
                        href={whatsappLink(order.customerPhone, buildWhatsAppMsg(order))}
                        target="_blank" rel="noopener noreferrer"
                        title="Avisar cliente por WhatsApp"
                        aria-label="Avisar cliente por WhatsApp"
                        className="w-8 h-8 shrink-0 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 flex items-center justify-center hover:bg-green-500/25 transition-colors"
                      >
                        <MessageCircle size={15} />
                      </a>
                      <button
                        onClick={() => removeOrder(order)}
                        title="Eliminar registo"
                        aria-label="Eliminar registo da encomenda"
                        className="w-8 h-8 shrink-0 rounded-lg bg-white/5 text-gray-500 border border-white/10 flex items-center justify-center hover:text-red-400 hover:border-red-500/30 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
                {byState[col.id].length === 0 && (
                  <div className="text-center text-xs text-gray-600 py-6 border border-dashed border-white/5 rounded-xl">Vazio</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildWhatsAppMsg(order: any): string {
  const items = (order.items || []).map((it: any) => `• ${it.name} x${lineQty(it)} — ${formatMT(lineUnitPrice(it) * lineQty(it))}`).join('\n');
  return `Olá ${order.customerName || ''}! 👋 Atualização da sua encomenda Hardware Sale (#${String(order.id).slice(0, 8)}):\n\n${items}\n\nTotal: ${formatMT(order.total)}\nEstado: ${normaliseStatus(order)}\n\nObrigado pela preferência!`;
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'neon' | 'green' | 'orange' | 'red' | 'neutral' }) {
  const tones: Record<string, string> = {
    neon: 'text-brand-neon', green: 'text-green-400', orange: 'text-orange-400', red: 'text-red-400', neutral: 'text-gray-300',
  };
  return (
    <div className="bg-[#0a0a14] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
        <span className={tones[tone]}>{icon}</span>{label}
      </div>
      <div className={`text-xl font-black ${tones[tone]}`}>{value}</div>
    </div>
  );
}
