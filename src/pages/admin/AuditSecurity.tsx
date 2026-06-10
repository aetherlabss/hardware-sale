import { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { timeAgo, tsToMillis } from '../../lib/adminFormat';
import { ShieldCheck, ShieldAlert, Search, Activity, ChevronDown, RefreshCw } from 'lucide-react';

interface AuditEntry { id: string; action: string; targetId?: string; data?: any; actorUid?: string; actorEmail?: string; at?: any; }
type Health = Record<string, boolean | string>;

const HEALTH_LABELS: { key: string; label: string; critical?: boolean; hint: string }[] = [
  { key: 'serviceAccount', label: 'Service Account (Admin SDK)', critical: true, hint: 'Sem isto os pagamentos não confirmam nem as recompensas aplicam.' },
  { key: 'paymentCallbackSecret', label: 'Segredo do callback de pagamento', critical: true, hint: 'Protege o webhook contra chamadas forjadas.' },
  { key: 'aiKey', label: 'Chave Vertex AI (servidor)', hint: 'Necessária para as features de IA.' },
  { key: 'mpesa', label: 'M-Pesa configurado', hint: 'Host + service provider code.' },
  { key: 'emola', label: 'e-Mola configurado', hint: 'URL + merchant code.' },
  { key: 'upstashRateLimit', label: 'Rate-limit distribuído (Upstash)', hint: 'Opcional, mas recomendado em produção.' },
  { key: 'allowedOrigins', label: 'Origens permitidas (CORS)', hint: 'Restringe quem chama as APIs.' },
];

export function AuditSecurity() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [health, setHealth] = useState<Health | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admin_audit'), (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }, (err) => { console.error('audit listen failed', err); setLoading(false); });
    return () => unsub();
  }, []);

  const loadHealth = async () => {
    setHealthLoading(true); setHealthErr(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sem sessão.');
      const res = await fetch('/api/security-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setHealth(await res.json());
    } catch (e: any) {
      setHealthErr(e?.message || 'Falha ao verificar.');
    } finally {
      setHealthLoading(false);
    }
  };
  useEffect(() => { loadHealth(); /* once on mount */ }, []);

  const actions = useMemo(() => ['all', ...Array.from(new Set(entries.map(e => e.action))).sort()], [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter(e => actionFilter === 'all' || e.action === actionFilter)
      .filter(e => !q || `${e.actorEmail || ''} ${e.targetId || ''} ${e.action}`.toLowerCase().includes(q))
      .sort((a, b) => tsToMillis(b.at) - tsToMillis(a.at));
  }, [entries, search, actionFilter]);

  const criticalMissing = health
    ? HEALTH_LABELS.filter(h => h.critical && health[h.key] === false).length
    : 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Auditoria & Segurança</h2>
        <p className="text-gray-400">Trilho forense das ações de admin e estado de configuração do backend.</p>
      </div>

      {/* Security health */}
      <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {criticalMissing > 0
              ? <ShieldAlert className="text-red-400" size={20} />
              : <ShieldCheck className="text-brand-neon" size={20} />}
            <h3 className="font-bold text-white">Saúde de Segurança {criticalMissing > 0 && <span className="text-red-400">({criticalMissing} crítico(s) em falta)</span>}</h3>
          </div>
          <button onClick={loadHealth} disabled={healthLoading} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={healthLoading ? 'animate-spin' : ''} /> Reverificar
          </button>
        </div>

        {healthErr ? (
          <div className="text-sm text-red-400">{healthErr}</div>
        ) : !health ? (
          <div className="text-sm text-gray-500">A verificar configuração…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HEALTH_LABELS.map(h => {
              const ok = health[h.key] === true;
              return (
                <div key={h.key} className={`flex items-start gap-3 p-3 rounded-xl border ${ok ? 'bg-green-500/5 border-green-500/20' : h.critical ? 'bg-red-500/5 border-red-500/30' : 'bg-white/[0.02] border-white/10'}`}>
                  <span className={`mt-0.5 ${ok ? 'text-green-400' : h.critical ? 'text-red-400' : 'text-gray-500'}`}>
                    {ok ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${ok ? 'text-white' : h.critical ? 'text-red-300' : 'text-gray-300'}`}>{h.label}</div>
                    {!ok && <div className="text-[11px] text-gray-500">{h.hint}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit log */}
      <div className="bg-[#0a0a14] border border-white/5 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2"><Activity size={18} className="text-brand-neon" /><h3 className="font-bold text-white">Registo de Auditoria</h3><span className="text-xs text-gray-500">({filtered.length})</span></div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar…" aria-label="Pesquisar auditoria"
              className="bg-black/40 border border-white/10 rounded-xl h-9 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-brand-neon/50 w-40 sm:w-56" />
          </div>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} aria-label="Filtrar por ação" className="bg-black/40 border border-white/10 rounded-xl h-9 px-3 text-sm text-white">
            {actions.map(a => <option key={a} value={a} className="bg-[#0a0a14]">{a === 'all' ? 'Todas as ações' : a}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><span className="w-7 h-7 rounded-full border-2 border-brand-neon border-t-transparent animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Sem registos de auditoria.</div>
        ) : (
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {filtered.map(e => (
              <div key={e.id} className="rounded-xl bg-black/40 border border-white/5 overflow-hidden">
                <button onClick={() => setExpanded(x => x === e.id ? null : e.id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors">
                  <span className="font-mono text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-brand-neon shrink-0">{e.action}</span>
                  <span className="text-sm text-gray-300 truncate flex-1 min-w-0">{e.actorEmail || e.actorUid || 'sistema'}{e.targetId && <span className="text-gray-600"> · {e.targetId.slice(0, 12)}</span>}</span>
                  <span className="text-[11px] text-gray-500 shrink-0">{timeAgo(e.at)}</span>
                  {e.data && <ChevronDown size={14} className={`text-gray-500 transition-transform ${expanded === e.id ? 'rotate-180' : ''}`} />}
                </button>
                {expanded === e.id && e.data && (
                  <pre className="text-[11px] text-gray-400 bg-black/40 border-t border-white/5 p-3 overflow-x-auto">{JSON.stringify(e.data, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
