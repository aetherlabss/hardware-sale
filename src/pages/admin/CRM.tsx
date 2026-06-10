import { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { logAuditEvent } from '../../lib/audit';
import { askAI } from '../../lib/ai';
import { getLevelFromXP } from '../../hooks/useClientProfile';
import { formatMT, timeAgo, tsToMillis, whatsappLink } from '../../lib/adminFormat';
import { Users, Search, MessageCircle, Ticket, Crown, UserPlus, AlertTriangle, Share2, Sparkles, X } from 'lucide-react';

const VIP_SPEND = 50000;
const AT_RISK_DAYS = 45;
type Segment = 'all' | 'vip' | 'at_risk' | 'new' | 'affiliate';

interface Customer {
  id: string; sessionId: string; name?: string; phone?: string;
  xp: number; totalSpent: number; purchaseCount: number;
  referralCode?: string; referredBy?: string; joinedAt?: any;
  lastActivity: number; referrals: number; orders: any[]; segment: Exclude<Segment, 'all'>;
}

export function CRM({ checkouts }: { checkouts: any[] }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [seg, setSeg] = useState<Segment>('all');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'client_profiles'), (snap) => {
      setProfiles(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }, (err) => { console.error('CRM listen failed', err); setLoading(false); });
    return () => unsub();
  }, []);

  const ordersBySession = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const o of checkouts) {
      const sid = o.sessionId;
      if (!sid) continue;
      if (!m.has(sid)) m.set(sid, []);
      m.get(sid)!.push(o);
    }
    return m;
  }, [checkouts]);

  const referralCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of profiles) {
      if (p.referredBy) m.set(p.referredBy, (m.get(p.referredBy) || 0) + 1);
    }
    return m;
  }, [profiles]);

  const customers = useMemo<Customer[]>(() => {
    const now = Date.now();
    return profiles.map(p => {
      const orders = (ordersBySession.get(p.sessionId) || []).sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
      const lastOrder = orders[0] ? tsToMillis(orders[0].createdAt) : 0;
      const lastActivity = Math.max(lastOrder, tsToMillis(p.lastCheckIn), tsToMillis(p.joinedAt));
      const totalSpent = Number(p.totalSpent) || 0;
      const purchaseCount = Number(p.purchaseCount) || 0;
      const referrals = referralCounts.get(p.referralCode) || 0;

      let segment: Customer['segment'];
      if (totalSpent >= VIP_SPEND || purchaseCount >= 3) segment = 'vip';
      else if (referrals > 0) segment = 'affiliate';
      else if (purchaseCount > 0 && now - lastActivity > AT_RISK_DAYS * 86400000) segment = 'at_risk';
      else segment = 'new';

      return {
        id: p.id, sessionId: p.sessionId, name: p.name, phone: p.phone,
        xp: Number(p.xp) || 0, totalSpent, purchaseCount,
        referralCode: p.referralCode, referredBy: p.referredBy, joinedAt: p.joinedAt,
        lastActivity, referrals, orders, segment,
      };
    });
  }, [profiles, ordersBySession, referralCounts]);

  const counts = useMemo(() => ({
    all: customers.length,
    vip: customers.filter(c => c.segment === 'vip').length,
    at_risk: customers.filter(c => c.segment === 'at_risk').length,
    new: customers.filter(c => c.segment === 'new').length,
    affiliate: customers.filter(c => c.segment === 'affiliate').length,
  }), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter(c => seg === 'all' || c.segment === seg)
      .filter(c => !q || `${c.name || ''} ${c.phone || ''} ${c.referralCode || ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.totalSpent - a.totalSpent || b.lastActivity - a.lastActivity);
  }, [customers, search, seg]);

  const generateCoupon = async (c: Customer) => {
    const pctStr = window.prompt('Desconto do cupão dirigido (%):', '10');
    if (!pctStr) return;
    const pct = Math.max(1, Math.min(90, Math.floor(Number(pctStr)) || 10));
    const code = `${c.segment.toUpperCase().slice(0, 3)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    try {
      await setDoc(doc(db, 'coupons', code), {
        code, discountPercent: pct, maxUses: 1, usedCount: 0, usedBy: [],
        maxPerUser: 1, minOrderValue: 0, active: true,
        validUntil: Date.now() + 30 * 86400000,
        createdAt: serverTimestamp(),
      });
      await logAuditEvent({ action: 'coupon.target', targetId: code, data: { segment: c.segment, pct, customer: c.name || c.sessionId } });
      const msg = `Olá ${c.name || ''}! 🎁 Um cupão exclusivo Hardware Sale só para ti: *${code}* (${pct}% de desconto). Válido 30 dias. Usa no checkout em hardwaresale.co.mz`;
      window.open(whatsappLink(c.phone, msg), '_blank');
    } catch (err) { console.error(err); alert('Erro ao gerar cupão.'); }
  };

  const generateSegmentInsight = async () => {
    setAiLoading(true);
    try {
      const segCustomers = seg === 'all' ? customers : customers.filter(c => c.segment === seg);
      const totalLtv = segCustomers.reduce((s, c) => s + c.totalSpent, 0);
      const prompt = `És estratega de CRM da Hardware Sale (hardware, Moçambique).
Segmento: ${seg === 'all' ? 'todos' : seg} — ${segCustomers.length} clientes, LTV total ${formatMT(totalLtv)}.
Distribuição: VIP ${counts.vip}, em-risco ${counts.at_risk}, novos ${counts.new}, afiliados ${counts.affiliate}.
Dá 3-4 ações concretas de retenção/crescimento para este segmento, com tom directo e prático.`;
      const { text } = await askAI({ prompt });
      setAiText(text || 'Sem resposta.');
    } catch { setAiText('Erro ao contactar a IA.'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-1">CRM 360 do Cliente</h2>
        <p className="text-gray-400">Perfis reais, LTV, segmentos e targeting — leitura restrita a admin.</p>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <SegCard active={seg === 'all'} onClick={() => setSeg('all')} icon={<Users size={16} />} label="Todos" value={counts.all} tone="neutral" />
        <SegCard active={seg === 'vip'} onClick={() => setSeg('vip')} icon={<Crown size={16} />} label="VIP" value={counts.vip} tone="neon" />
        <SegCard active={seg === 'at_risk'} onClick={() => setSeg('at_risk')} icon={<AlertTriangle size={16} />} label="Em risco" value={counts.at_risk} tone="orange" />
        <SegCard active={seg === 'new'} onClick={() => setSeg('new')} icon={<UserPlus size={16} />} label="Novos" value={counts.new} tone="blue" />
        <SegCard active={seg === 'affiliate'} onClick={() => setSeg('affiliate')} icon={<Share2 size={16} />} label="Afiliados" value={counts.affiliate} tone="magenta" />
      </div>

      {/* AI insight + search */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome, telefone ou código…" aria-label="Pesquisar clientes"
            className="w-full bg-black/40 border border-white/10 rounded-xl h-11 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon/50" />
        </div>
        <button onClick={generateSegmentInsight} disabled={aiLoading} className="flex items-center justify-center gap-2 bg-white/5 border border-brand-magenta/30 text-white rounded-xl h-11 px-4 text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-60">
          {aiLoading ? <span className="w-4 h-4 rounded-full border-2 border-brand-magenta border-t-transparent animate-spin" /> : <Sparkles size={16} className="text-brand-magenta" />}
          Insight do segmento
        </button>
      </div>
      {aiText && <div className="bg-gradient-to-b from-[#1a1025] to-[#0a0a14] border border-brand-magenta/20 rounded-2xl p-4 mb-4 text-sm text-gray-300 whitespace-pre-wrap">{aiText}</div>}

      {/* List */}
      <div className="bg-[#0a0a14] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><span className="w-7 h-7 rounded-full border-2 border-brand-neon border-t-transparent animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center"><Users className="w-12 h-12 text-gray-600 mb-3" /><p className="text-gray-400">Nenhum cliente neste segmento.</p></div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {filtered.map(c => {
              const lvl = getLevelFromXP(c.xp);
              return (
                <button key={c.id} onClick={() => setSelected(c)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-neon/15 border border-brand-neon/30 flex items-center justify-center text-brand-neon font-bold shrink-0">
                    {(c.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{c.name || 'Sem nome'}</span>
                      <SegBadge segment={c.segment} />
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">{c.phone || 'sem contacto'} · {lvl.name} · {timeAgo(c.lastActivity)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand-neon">{formatMT(c.totalSpent)}</div>
                    <div className="text-[10px] text-gray-500">{c.purchaseCount} compra(s)</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-[120] flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full sm:w-[440px] h-full bg-[#0a0a14] border-l border-white/10 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/5 flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-brand-neon/15 border border-brand-neon/30 flex items-center justify-center text-brand-neon font-bold text-lg shrink-0">{(selected.name || '?')[0]?.toUpperCase()}</div>
                <div className="min-w-0">
                  <div className="text-white font-bold truncate">{selected.name || 'Sem nome'}</div>
                  <div className="text-xs text-gray-500 truncate">{selected.phone || 'sem contacto'}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Fechar" className="p-2 text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Mini label="LTV" value={formatMT(selected.totalSpent)} />
                <Mini label="Compras" value={String(selected.purchaseCount)} />
                <Mini label="Nível" value={`${getLevelFromXP(selected.xp).name} · ${selected.xp} XP`} />
                <Mini label="Referrals" value={String(selected.referrals)} />
              </div>

              <div className="flex gap-2">
                <a href={whatsappLink(selected.phone, `Olá ${selected.name || ''}! 👋`)} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-xl h-10 text-sm font-bold hover:bg-green-500/25 transition-colors">
                  <MessageCircle size={16} /> WhatsApp
                </a>
                <button onClick={() => generateCoupon(selected)}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30 rounded-xl h-10 text-sm font-bold hover:bg-brand-magenta/25 transition-colors">
                  <Ticket size={16} /> Cupão dirigido
                </button>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Histórico de encomendas ({selected.orders.length})</div>
                {selected.orders.length === 0 ? (
                  <div className="text-sm text-gray-500">Sem encomendas registadas.</div>
                ) : (
                  <div className="space-y-2">
                    {selected.orders.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="min-w-0">
                          <div className="text-sm text-white">{o.status || 'pendente'}</div>
                          <div className="text-[10px] text-gray-500">{timeAgo(o.createdAt)} · {(o.items?.length || 0)} item(s)</div>
                        </div>
                        <div className="text-sm font-bold text-brand-neon shrink-0">{formatMT(o.total)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selected.referralCode && (
                <div className="text-[11px] text-gray-500">Código de afiliado: <span className="font-mono text-gray-300">{selected.referralCode}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SegCard({ active, onClick, icon, label, value, tone }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; value: number; tone: 'neon' | 'magenta' | 'orange' | 'blue' | 'neutral' }) {
  const tones: Record<string, string> = { neon: 'text-brand-neon', magenta: 'text-brand-magenta', orange: 'text-orange-400', blue: 'text-blue-400', neutral: 'text-gray-300' };
  return (
    <button onClick={onClick} className={`text-left bg-[#0a0a14] border rounded-2xl p-4 transition-colors ${active ? 'border-brand-neon/50 bg-brand-neon/[0.04]' : 'border-white/5 hover:border-white/15'}`}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2"><span className={tones[tone]}>{icon}</span><span className="truncate">{label}</span></div>
      <div className={`text-2xl font-black ${tones[tone]}`}>{value}</div>
    </button>
  );
}

function SegBadge({ segment }: { segment: Customer['segment'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    vip: { label: 'VIP', cls: 'bg-brand-neon/15 text-brand-neon border-brand-neon/30' },
    at_risk: { label: 'Em risco', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
    new: { label: 'Novo', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    affiliate: { label: 'Afiliado', cls: 'bg-brand-magenta/15 text-brand-magenta border-brand-magenta/30' },
  };
  const s = map[segment];
  return <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${s.cls}`}>{s.label}</span>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-xl p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}
