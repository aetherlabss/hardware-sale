import { useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { logAuditEvent } from '../../lib/audit';
import { formatMT } from '../../lib/adminFormat';
import { Package, Search, Download, AlertTriangle, Boxes, Layers, CheckSquare, Square } from 'lucide-react';

const LOW_STOCK = 3;

type StockState = 'all' | 'in' | 'low' | 'out' | 'untracked' | 'dead';

export function Inventory({ products }: { products: any[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockState>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Bulk controls
  const [priceMode, setPriceMode] = useState<'none' | 'set' | 'inc' | 'dec'>('none');
  const [priceVal, setPriceVal] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [applying, setApplying] = useState(false);

  const stockStateOf = (p: any): Exclude<StockState, 'all'> => {
    if (typeof p.stockQty !== 'number') return 'untracked';
    if (p.stockQty <= 0) return 'out';
    if (p.stockQty <= LOW_STOCK) return 'low';
    return 'in';
  };
  const isDead = (p: any) => (Number(p.soldCount) || 0) === 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (q && !(`${p.name} ${p.category}`.toLowerCase().includes(q))) return false;
      if (filter === 'all') return true;
      if (filter === 'dead') return isDead(p);
      return stockStateOf(p) === filter;
    });
  }, [products, search, filter]);

  const stats = useMemo(() => {
    let value = 0, units = 0, low = 0, out = 0, tracked = 0;
    for (const p of products) {
      if (typeof p.stockQty === 'number') {
        tracked++;
        units += Math.max(0, p.stockQty);
        value += Math.max(0, p.stockQty) * (Number(p.price) || 0);
        if (p.stockQty <= 0) out++;
        else if (p.stockQty <= LOW_STOCK) low++;
      }
    }
    return { value, units, low, out, tracked, dead: products.filter(isDead).length };
  }, [products]);

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)));

  const saveStock = async (p: any, value: string) => {
    const n = Math.max(0, Math.floor(Number(value)));
    if (!Number.isFinite(n)) return;
    setSavingId(p.id);
    try {
      await updateDoc(doc(db, 'products', p.id), { stockQty: n });
      await logAuditEvent({ action: 'inventory.update', targetId: p.id, data: { name: p.name, stockQty: n } });
    } catch (err) { console.error(err); alert('Erro ao guardar stock.'); }
    finally { setSavingId(null); }
  };

  const applyBulk = async () => {
    if (selected.size === 0) return;
    if (priceMode === 'none' && !bulkStock && !bulkStatus) { alert('Escolhe pelo menos uma alteração.'); return; }
    const summary = [
      priceMode !== 'none' ? `preço ${priceMode === 'set' ? '=' : priceMode === 'inc' ? '+' : '-'}${priceVal}${priceMode === 'set' ? ' MT' : '%'}` : '',
      bulkStock !== '' ? `stock = ${bulkStock}` : '',
      bulkStatus ? `estado = ${bulkStatus}` : '',
    ].filter(Boolean).join(', ');
    if (!window.confirm(`Aplicar a ${selected.size} produto(s): ${summary}?`)) return;

    setApplying(true);
    try {
      const batch = writeBatch(db);
      const ids = [...selected];
      for (const id of ids) {
        const p = products.find(x => x.id === id);
        if (!p) continue;
        const patch: any = {};
        if (priceMode !== 'none' && priceVal !== '') {
          const v = Number(priceVal);
          const base = Number(p.price) || 0;
          if (priceMode === 'set') patch.price = Math.max(0, Math.round(v));
          if (priceMode === 'inc') patch.price = Math.max(0, Math.round(base * (1 + v / 100)));
          if (priceMode === 'dec') patch.price = Math.max(0, Math.round(base * (1 - v / 100)));
        }
        if (bulkStock !== '') patch.stockQty = Math.max(0, Math.floor(Number(bulkStock)));
        if (bulkStatus) patch.status = bulkStatus;
        if (Object.keys(patch).length) batch.update(doc(db, 'products', id), patch);
      }
      await batch.commit();
      await logAuditEvent({ action: 'inventory.bulk', data: { count: ids.length, changes: summary } });
      setSelected(new Set()); setPriceMode('none'); setPriceVal(''); setBulkStock(''); setBulkStatus('');
    } catch (err) { console.error(err); alert('Erro ao aplicar alterações em massa.'); }
    finally { setApplying(false); }
  };

  const exportCsv = () => {
    const head = ['id', 'name', 'category', 'price', 'discount', 'status', 'stockQty', 'soldCount'];
    const rows = filtered.map(p => head.map(h => {
      const v = h === 'stockQty' && typeof p.stockQty !== 'number' ? '' : (p[h] ?? '');
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
    const csv = [head.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Inventário & Stock</h2>
          <p className="text-gray-400">Quantidades, alertas e edição em massa.</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-sm font-bold text-white hover:bg-white/10 transition-colors">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={<Boxes size={16} />} label="Valor de inventário" value={formatMT(stats.value)} tone="neon" />
        <Stat icon={<Layers size={16} />} label="Unidades em stock" value={stats.units.toLocaleString()} tone="magenta" />
        <Stat icon={<AlertTriangle size={16} />} label="Stock baixo" value={String(stats.low)} tone={stats.low ? 'orange' : 'neutral'} />
        <Stat icon={<AlertTriangle size={16} />} label="Esgotados" value={String(stats.out)} tone={stats.out ? 'red' : 'neutral'} />
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar produto…" aria-label="Pesquisar produto"
            className="w-full bg-black/40 border border-white/10 rounded-xl h-10 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-neon/50" />
        </div>
        <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 overflow-x-auto">
          {([['all', 'Todos'], ['in', 'Em stock'], ['low', 'Baixo'], ['out', 'Esgotado'], ['untracked', 'Sem controlo'], ['dead', 'Dead-stock']] as [StockState, string][]).map(([k, lbl]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filter === k ? 'bg-white/10 text-white' : 'hover:text-white'}`}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="bg-brand-neon/[0.06] border border-brand-neon/30 rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-brand-neon">{selected.size} selecionado(s)</span>
          <div className="flex items-center gap-1">
            <select value={priceMode} onChange={e => setPriceMode(e.target.value as any)} className="bg-black/40 border border-white/10 rounded-lg h-9 px-2 text-xs text-white">
              <option value="none" className="bg-[#0a0a14]">Preço…</option>
              <option value="set" className="bg-[#0a0a14]">Definir (MT)</option>
              <option value="inc" className="bg-[#0a0a14]">Aumentar %</option>
              <option value="dec" className="bg-[#0a0a14]">Baixar %</option>
            </select>
            {priceMode !== 'none' && <input value={priceVal} onChange={e => setPriceVal(e.target.value)} type="number" placeholder="valor" className="w-24 bg-black/40 border border-white/10 rounded-lg h-9 px-2 text-xs text-white" />}
          </div>
          <input value={bulkStock} onChange={e => setBulkStock(e.target.value)} type="number" placeholder="Stock =" className="w-24 bg-black/40 border border-white/10 rounded-lg h-9 px-2 text-xs text-white" />
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg h-9 px-2 text-xs text-white">
            <option value="" className="bg-[#0a0a14]">Estado…</option>
            <option value="stock" className="bg-[#0a0a14]">Em stock</option>
            <option value="encomenda" className="bg-[#0a0a14]">Por encomenda</option>
            <option value="na_box" className="bg-[#0a0a14]">Na box</option>
          </select>
          <button onClick={applyBulk} disabled={applying} className="bg-brand-neon text-black font-bold h-9 px-4 rounded-lg text-xs hover:bg-brand-magenta hover:text-white transition-colors disabled:opacity-60">
            {applying ? 'A aplicar…' : 'Aplicar'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-white text-xs">Limpar</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0a0a14] border border-white/5 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center"><Package className="w-12 h-12 text-gray-600 mb-3" /><p className="text-gray-400">Nenhum produto.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                  <th className="p-3 text-left"><button onClick={toggleAll} aria-label="Selecionar todos">{selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} className="text-brand-neon" /> : <Square size={16} />}</button></th>
                  <th className="p-3 text-left font-bold">Produto</th>
                  <th className="p-3 text-right font-bold">Preço</th>
                  <th className="p-3 text-center font-bold">Estado</th>
                  <th className="p-3 text-center font-bold">Stock</th>
                  <th className="p-3 text-right font-bold">Vendidos</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const st = stockStateOf(p);
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3"><button onClick={() => toggle(p.id)} aria-label={`Selecionar ${p.name}`}>{selected.has(p.id) ? <CheckSquare size={16} className="text-brand-neon" /> : <Square size={16} className="text-gray-500" />}</button></td>
                      <td className="p-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c'} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10 bg-white/5 shrink-0" />
                          <div className="min-w-0"><div className="text-white font-medium truncate max-w-[220px]">{p.name}</div><div className="text-[10px] text-gray-500">{p.category}</div></div>
                        </div>
                      </td>
                      <td className="p-3 text-right text-white whitespace-nowrap">{formatMT(p.price)}{p.discount > 0 && <span className="block text-[10px] text-brand-magenta">-{p.discount}%</span>}</td>
                      <td className="p-3 text-center"><span className="text-[10px] uppercase font-bold text-gray-400">{String(p.status || '—').replace('_', ' ')}</span></td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number" min={0}
                            defaultValue={typeof p.stockQty === 'number' ? p.stockQty : ''}
                            placeholder="∞"
                            onBlur={(e) => { if (e.target.value !== '' && Number(e.target.value) !== p.stockQty) saveStock(p, e.target.value); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            aria-label={`Stock de ${p.name}`}
                            className={`w-20 bg-black/40 border rounded-lg h-8 px-2 text-center text-xs text-white focus:outline-none focus:border-brand-neon/50 ${st === 'out' ? 'border-red-500/40' : st === 'low' ? 'border-orange-500/40' : 'border-white/10'}`}
                          />
                          {savingId === p.id && <span className="w-3 h-3 rounded-full border-2 border-brand-neon border-t-transparent animate-spin" />}
                          {st === 'out' && <span className="text-[9px] font-bold text-red-400 uppercase">esgotado</span>}
                          {st === 'low' && <span className="text-[9px] font-bold text-orange-400 uppercase">baixo</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right text-gray-400">{Number(p.soldCount) || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-600 mt-3">Deixa o stock vazio (∞) para produtos sem controlo de inventário. O stock é decrementado automaticamente quando uma encomenda é paga.</p>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'neon' | 'magenta' | 'orange' | 'red' | 'neutral' }) {
  const tones: Record<string, string> = { neon: 'text-brand-neon', magenta: 'text-brand-magenta', orange: 'text-orange-400', red: 'text-red-400', neutral: 'text-gray-300' };
  return (
    <div className="bg-[#0a0a14] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2"><span className={tones[tone]}>{icon}</span><span className="truncate">{label}</span></div>
      <div className={`text-xl font-black ${tones[tone]}`}>{value}</div>
    </div>
  );
}
