import { useMemo, useState } from 'react';
import { askAI } from '../../lib/ai';
import { formatMT, tsToMillis, timeAgo } from '../../lib/adminFormat';
import { lineUnitPrice, lineQty } from '../../lib/adminFormat';
import {
  Banknote, ShoppingBag, TrendingUp, Users, Sparkles, AlertTriangle,
  Clock, Ticket, Package, ArrowUpRight,
} from 'lucide-react';

const DAY = 24 * 3600 * 1000;
const PAID_STATES = ['pago', 'a_preparar', 'enviado', 'entregue'];

function isPaid(o: any): boolean {
  if (o?.paymentStatus === 'confirmed') return true;
  return PAID_STATES.includes(String(o?.status || '').toLowerCase());
}
function isPending(o: any): boolean {
  return !isPaid(o) && String(o?.status || 'pendente').toLowerCase() !== 'cancelado';
}

export function BIDashboard({ checkouts, events, products, coupons }: {
  checkouts: any[]; events: any[]; products: any[]; coupons: any[];
}) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const m = useMemo(() => {
    const now = Date.now();
    const since = now - range * DAY;
    const paid = checkouts.filter(isPaid);
    const paidInRange = paid.filter(o => tsToMillis(o.createdAt) >= since);

    const revenueIn = (fromMs: number) =>
      paid.filter(o => tsToMillis(o.createdAt) >= fromMs).reduce((s, o) => s + (Number(o.total) || 0), 0);

    const revToday = revenueIn(new Date(new Date().setHours(0, 0, 0, 0)).getTime());
    const rev7 = revenueIn(now - 7 * DAY);
    const rev30 = revenueIn(now - 30 * DAY);
    const revRange = paidInRange.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const ordersRange = paidInRange.length;
    const aov = ordersRange > 0 ? revRange / ordersRange : 0;
    const pendingRevenue = checkouts.filter(isPending).reduce((s, o) => s + (Number(o.total) || 0), 0);

    // Funnel from analytics events (within range)
    const evIn = events.filter(e => tsToMillis(e.timestamp) >= since);
    const visitors = new Set(evIn.filter(e => e.type === 'pageview').map(e => e.sessionId)).size;
    const carts = evIn.filter(e => e.type === 'add_to_cart').length;
    const checkoutsStarted = evIn.filter(e => e.type === 'checkout').length;
    const conversion = visitors > 0 ? (ordersRange / visitors) * 100 : 0;

    // Revenue time-series (range buckets by day)
    const buckets = Array.from({ length: range }).map((_, i) => {
      const d = new Date(now - (range - 1 - i) * DAY);
      d.setHours(0, 0, 0, 0);
      return { day: d.getTime(), value: 0 };
    });
    for (const o of paidInRange) {
      const t = new Date(tsToMillis(o.createdAt)); t.setHours(0, 0, 0, 0);
      const idx = buckets.findIndex(b => b.day === t.getTime());
      if (idx >= 0) buckets[idx].value += Number(o.total) || 0;
    }

    // Top products by revenue (from paid order items)
    const prodAgg = new Map<string, { name: string; revenue: number; units: number }>();
    for (const o of paidInRange) {
      for (const it of (o.items || [])) {
        const key = String(it.id || it.name || 'unknown');
        const cur = prodAgg.get(key) || { name: it.name || key, revenue: 0, units: 0 };
        cur.revenue += lineUnitPrice(it) * lineQty(it);
        cur.units += lineQty(it);
        prodAgg.set(key, cur);
      }
    }
    const topProducts = [...prodAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Alerts
    const lowStock = products.filter(p => typeof p.stockQty === 'number' && p.stockQty <= 3);
    const stalePending = checkouts.filter(o => isPending(o) && now - tsToMillis(o.createdAt) > DAY);
    const expiringCoupons = coupons.filter(c => {
      if (!c.active || !c.validUntil) return false;
      const until = tsToMillis(c.validUntil);
      return until > now && until - now < 7 * DAY;
    });

    return {
      revToday, rev7, rev30, revRange, ordersRange, aov, pendingRevenue,
      visitors, carts, checkoutsStarted, conversion, buckets, topProducts,
      lowStock, stalePending, expiringCoupons,
    };
  }, [checkouts, events, products, coupons, range]);

  const generateInsight = async () => {
    setAiLoading(true);
    try {
      const top = m.topProducts.map(p => `${p.name} (${formatMT(p.revenue)})`).join(', ') || 'n/d';
      const prompt = `És analista de negócio da Hardware Sale (e-commerce de hardware em Moçambique).
Dados REAIS dos últimos ${range} dias:
- Receita confirmada: ${formatMT(m.revRange)} em ${m.ordersRange} encomendas (ticket médio ${formatMT(m.aov)})
- Receita pendente (não paga): ${formatMT(m.pendingRevenue)}
- Visitantes únicos: ${m.visitors}; adições ao carrinho: ${m.carts}; conversão: ${m.conversion.toFixed(1)}%
- Top produtos: ${top}
- Alertas: ${m.lowStock.length} com stock baixo, ${m.stalePending.length} encomendas pendentes há +24h
Dá um resumo executivo curto (4-5 frases), directo e accionável: o que está bem, o maior risco, e a próxima ação concreta para crescer receita.`;
      const { text } = await askAI({ prompt });
      setAiText(text || 'Sem resposta.');
    } catch {
      setAiText('Erro ao contactar a IA. Verifica a ligação.');
    } finally {
      setAiLoading(false);
    }
  };

  const maxBar = Math.max(...m.buckets.map(b => b.value), 1);
  const totalAlerts = m.lowStock.length + m.stalePending.length + m.expiringCoupons.length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Visão Geral do Negócio</h2>
          <p className="text-gray-400">Métricas reais de receita, conversão e inventário.</p>
        </div>
        <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500">
          {([7, 30, 90] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg transition-colors ${range === r ? 'bg-white/10 text-white' : 'hover:text-white'}`}>{r}D</button>
          ))}
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard icon={<Banknote size={18} />} label={`Receita (${range}D)`} value={formatMT(m.revRange)} sub={`Hoje: ${formatMT(m.revToday)}`} tone="neon" />
        <KpiCard icon={<ShoppingBag size={18} />} label="Encomendas pagas" value={String(m.ordersRange)} sub={`Ticket médio ${formatMT(m.aov)}`} tone="magenta" />
        <KpiCard icon={<TrendingUp size={18} />} label="Conversão" value={`${m.conversion.toFixed(1)}%`} sub={`${m.visitors} visitantes`} tone="green" />
        <KpiCard icon={<Clock size={18} />} label="Receita pendente" value={formatMT(m.pendingRevenue)} sub="aguarda pagamento" tone="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart + funnel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Receita diária ({range} dias)</h3>
            <div className="h-44 w-full flex items-end gap-1">
              {m.buckets.map((b, i) => (
                <div key={i} className="flex-1 group relative flex flex-col justify-end h-full">
                  <div
                    className="bg-gradient-to-t from-brand-neon/40 to-brand-magenta/50 rounded-t-sm hover:from-brand-neon hover:to-brand-magenta transition-all"
                    style={{ height: `${Math.max(2, (b.value / maxBar) * 100)}%` }}
                  />
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 whitespace-nowrap z-20 pointer-events-none">
                    {new Date(b.day).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}: {formatMT(b.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion funnel */}
          <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Funil de conversão ({range}D)</h3>
            <div className="space-y-3">
              <FunnelRow icon={<Users size={14} />} label="Visitantes" value={m.visitors} max={m.visitors} tone="from-blue-500/40 to-blue-400/40" />
              <FunnelRow icon={<ShoppingBag size={14} />} label="Adições ao carrinho" value={m.carts} max={m.visitors} tone="from-brand-magenta/40 to-brand-magenta/60" />
              <FunnelRow icon={<ArrowUpRight size={14} />} label="Checkouts iniciados" value={m.checkoutsStarted} max={m.visitors} tone="from-yellow-500/40 to-yellow-400/40" />
              <FunnelRow icon={<Banknote size={14} />} label="Encomendas pagas" value={m.ordersRange} max={m.visitors} tone="from-brand-neon/40 to-green-400/50" />
            </div>
          </div>
        </div>

        {/* Right column: AI + alerts + top products */}
        <div className="space-y-6">
          {/* AI executive summary */}
          <div className="bg-gradient-to-b from-[#1a1025] to-[#0a0a14] border border-brand-magenta/20 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-magenta/20 border border-brand-magenta/50 flex items-center justify-center text-brand-magenta"><Sparkles size={18} /></div>
              <div>
                <h3 className="font-bold text-white leading-tight">Resumo Executivo IA</h3>
                <div className="text-[9px] uppercase tracking-widest text-brand-neon font-bold">Sobre dados reais</div>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-4 min-h-[80px] whitespace-pre-wrap">{aiText || 'Gera um diagnóstico do negócio a partir dos números reais acima.'}</p>
            <button onClick={generateInsight} disabled={aiLoading} className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {aiLoading ? <span className="w-4 h-4 rounded-full border-2 border-brand-neon border-t-transparent animate-spin" /> : <Sparkles size={16} />}
              {aiLoading ? 'A analisar…' : 'Gerar resumo'}
            </button>
          </div>

          {/* Alerts */}
          <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className={totalAlerts > 0 ? 'text-orange-400' : 'text-gray-500'} />
              <h3 className="font-bold text-white">Alertas {totalAlerts > 0 && <span className="text-orange-400">({totalAlerts})</span>}</h3>
            </div>
            <div className="space-y-2">
              <AlertRow icon={<Package size={14} />} text={`${m.lowStock.length} produto(s) com stock baixo`} active={m.lowStock.length > 0} />
              <AlertRow icon={<Clock size={14} />} text={`${m.stalePending.length} encomenda(s) pendentes há +24h`} active={m.stalePending.length > 0} />
              <AlertRow icon={<Ticket size={14} />} text={`${m.expiringCoupons.length} cupão(ões) a expirar em 7 dias`} active={m.expiringCoupons.length > 0} />
              {totalAlerts === 0 && <div className="text-sm text-gray-500">Tudo em ordem. 🎉</div>}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="font-bold text-white mb-4">Top produtos ({range}D)</h3>
            {m.topProducts.length === 0 ? (
              <div className="text-sm text-gray-500">Sem vendas registadas no período.</div>
            ) : (
              <div className="space-y-3">
                {m.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-gray-500">{p.units} unidade(s)</div>
                    </div>
                    <div className="text-sm font-bold text-brand-neon shrink-0">{formatMT(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent paid orders */}
      <div className="mt-6 bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4">Encomendas pagas recentes</h3>
        {checkouts.filter(isPaid).length === 0 ? (
          <div className="text-sm text-gray-500">Ainda sem encomendas pagas.</div>
        ) : (
          <div className="space-y-2">
            {[...checkouts.filter(isPaid)].sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt)).slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{o.customerName || 'Cliente'}</div>
                  <div className="text-[10px] text-gray-500">{timeAgo(o.createdAt)} · {o.paymentMethod === 'emola' ? 'e-Mola' : 'M-Pesa'}</div>
                </div>
                <div className="text-sm font-bold text-brand-neon shrink-0">{formatMT(o.total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: 'neon' | 'magenta' | 'green' | 'orange' }) {
  const tones: Record<string, string> = { neon: 'text-brand-neon', magenta: 'text-brand-magenta', green: 'text-green-400', orange: 'text-orange-400' };
  return (
    <div className="bg-[#0a0a14] border border-white/5 rounded-2xl lg:rounded-3xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
        <span className={tones[tone]}>{icon}</span><span className="truncate">{label}</span>
      </div>
      <div className={`text-2xl lg:text-3xl font-black ${tones[tone]} tracking-tight`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1 truncate">{sub}</div>
    </div>
  );
}

function FunnelRow({ icon, label, value, max, tone }: { icon: React.ReactNode; label: string; value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400 flex items-center gap-1.5">{icon}{label}</span>
        <span className="text-white font-bold">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function AlertRow({ icon, text, active }: { icon: React.ReactNode; text: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? 'text-orange-300' : 'text-gray-500'}`}>
      <span className={active ? 'text-orange-400' : 'text-gray-600'}>{icon}</span>{text}
    </div>
  );
}
