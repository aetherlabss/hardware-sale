import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useClientProfile, LEVELS, XP_REWARDS, getLevelFromXP, ClientProfile } from '../hooks/useClientProfile';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  Crown, Star, Trophy, Users, Copy, CheckCircle2, Gift, ShoppingBag,
  ArrowRight, Sparkles, Shield, Zap, TrendingUp, Package, Calendar,
  ChevronRight, UserCircle2, Flame, Crosshair, Home as HomeIcon,
  type LucideIcon
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

type TabId = 'perfil' | 'encomendas' | 'lealdade' | 'missoes' | 'afiliacao';

interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: { name: string; price: number; quantity?: number }[];
  total: number;
  status: 'pendente' | 'pago' | 'entregue';
  paymentMethod: string;
  createdAt: any;
}

interface AffStats { totalReferrals: number; conversions: number; commission: number; }

interface MissionDef {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: LucideIcon;
  category: 'daily' | 'social' | 'shopping' | 'level';
  completed: (profile: ClientProfile, stats: AffStats) => boolean;
  progress?: (profile: ClientProfile) => { current: number; total: number };
}

const MISSIONS: MissionDef[] = [
  {
    id: 'daily_checkin',
    title: 'Check-in de Hoje',
    description: 'Faz check-in diário para acumular XP.',
    xpReward: 25,
    icon: Calendar,
    category: 'daily',
    completed: (p) => !!p.lastCheckIn && Date.now() - p.lastCheckIn < 24 * 60 * 60 * 1000,
  },
  {
    id: 'streak_3',
    title: 'Sequência de 3 Dias',
    description: 'Check-in 3 dias seguidos para bónus.',
    xpReward: 75,
    icon: Flame,
    category: 'daily',
    completed: (p) => (p.checkInStreak || 0) >= 3,
    progress: (p) => ({ current: Math.min(p.checkInStreak || 0, 3), total: 3 }),
  },
  {
    id: 'complete_profile',
    title: 'Perfil Completo',
    description: 'Adiciona o teu nome e número de telefone.',
    xpReward: 100,
    icon: UserCircle2,
    category: 'social',
    completed: (p) => !!(p.name && p.phone),
  },
  {
    id: 'first_purchase',
    title: 'Primeira Compra',
    description: 'Realiza a tua primeira encomenda.',
    xpReward: 500,
    icon: ShoppingBag,
    category: 'shopping',
    completed: (p) => (p.purchaseCount || 0) >= 1,
  },
  {
    id: 'five_purchases',
    title: '5 Compras Completadas',
    description: 'Atinge 5 encomendas na loja.',
    xpReward: 500,
    icon: TrendingUp,
    category: 'shopping',
    completed: (p) => (p.purchaseCount || 0) >= 5,
    progress: (p) => ({ current: Math.min(p.purchaseCount || 0, 5), total: 5 }),
  },
  {
    id: 'first_referral',
    title: 'Primeiro Referral',
    description: 'Convida um amigo que usa o teu código.',
    xpReward: 300,
    icon: Users,
    category: 'social',
    completed: (_p, stats) => stats.totalReferrals >= 1,
  },
  {
    id: 'reach_level_4',
    title: 'Alcança Commander',
    description: 'Sobe ao nível 4 — Commander.',
    xpReward: 0,
    icon: Crown,
    category: 'level',
    completed: (p) => p.level >= 4,
    progress: (p) => ({ current: Math.min(p.level, 4), total: 4 }),
  },
];

const STATUS_STYLE: Record<string, string> = {
  pendente: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  pago:     'bg-brand-neon/15 text-brand-neon border-brand-neon/30',
  entregue: 'bg-green-500/15 text-green-400 border-green-500/30',
};
const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', pago: 'Pago', entregue: 'Entregue' };
const CAT_LABEL: Record<string, string> = { daily: 'Diário', social: 'Social', shopping: 'Compras', level: 'Progresso' };
const CAT_COLOR: Record<string, string> = {
  daily:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
  social:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  shopping: 'text-brand-neon bg-brand-neon/10 border-brand-neon/20',
  level:    'text-brand-magenta bg-brand-magenta/10 border-brand-magenta/20',
};

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'perfil',     label: 'Perfil',     icon: UserCircle2 },
  { id: 'encomendas', label: 'Encomendas', icon: Package },
  { id: 'lealdade',   label: 'Lealdade',   icon: Trophy },
  { id: 'missoes',    label: 'Missões',    icon: Crosshair },
  { id: 'afiliacao',  label: 'Afiliação',  icon: Users },
];

function CheckInCountdown({ lastCheckIn }: { lastCheckIn: number }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = lastCheckIn + 24 * 60 * 60 * 1000 - Date.now();
      if (diff <= 0) { setRemaining(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [lastCheckIn]);
  return <>{remaining}</>;
}

export function ClientHub() {
  const { profile, loading, sessionId, getAffiliateStats, updateProfile, dailyCheckIn } = useClientProfile();
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [affiliateStats, setAffiliateStats] = useState<AffStats>({ totalReferrals: 0, conversions: 0, commission: 0 });
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInXP, setCheckInXP] = useState<number | false>(false);
  const [levelUpData, setLevelUpData] = useState<{ show: boolean; levelName: string }>({ show: false, levelName: '' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const prevLevelRef = useRef<number>(0);
  const xpCounterRef = useRef<HTMLSpanElement>(null);
  const xpBarRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const affiliateLoadedRef = useRef(false);

  // Level-up detection
  useEffect(() => {
    if (!profile) return;
    if (prevLevelRef.current > 0 && profile.level > prevLevelRef.current) {
      const levelInfo = LEVELS.find(l => l.level === profile.level);
      setLevelUpData({ show: true, levelName: levelInfo?.name || '' });
      setTimeout(() => setLevelUpData(d => ({ ...d, show: false })), 4000);
    }
    prevLevelRef.current = profile.level;
  }, [profile?.level]);

  // Load affiliate stats on first visit to affiliate or missions tab
  useEffect(() => {
    if (!profile || affiliateLoadedRef.current) return;
    if (activeTab === 'afiliacao' || activeTab === 'missoes') {
      affiliateLoadedRef.current = true;
      getAffiliateStats().then(setAffiliateStats);
    }
  }, [profile, activeTab]);

  const loadOrders = useCallback(async () => {
    if (!profile) return;
    setLoadingOrders(true);
    try {
      const results: Order[] = [];
      const seen = new Set<string>();
      const snap1 = await getDocs(query(collection(db, 'checkouts'), where('sessionId', '==', sessionId), orderBy('createdAt', 'desc')));
      snap1.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() } as Order); } });
      if (profile.phone) {
        const snap2 = await getDocs(query(collection(db, 'checkouts'), where('customerPhone', '==', profile.phone), orderBy('createdAt', 'desc')));
        snap2.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() } as Order); } });
      }
      results.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setOrders(results);
    } catch { setOrders([]); }
    finally { setLoadingOrders(false); }
  }, [profile, sessionId]);

  useEffect(() => { if (activeTab === 'encomendas') loadOrders(); }, [activeTab, loadOrders]);

  // GSAP: sidebar entry
  useGSAP(() => {
    if (!sidebarRef.current) return;
    gsap.fromTo(sidebarRef.current, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' });
  }, { scope: sidebarRef });

  // GSAP: XP counter + bar
  useGSAP(() => {
    if (!profile || activeTab !== 'perfil') return;
    const cl = getLevelFromXP(profile.xp);
    const nl = LEVELS.find(l => l.level === cl.level + 1);
    const xpIn = profile.xp - cl.minXP;
    const xpFor = (nl ? nl.minXP : cl.minXP + 10000) - cl.minXP;
    const pct = Math.min(100, Math.round((xpIn / xpFor) * 100));
    if (xpCounterRef.current) {
      const obj = { val: 0 };
      gsap.to(obj, { val: profile.xp, duration: 1.4, ease: 'power2.out', onUpdate: () => { if (xpCounterRef.current) xpCounterRef.current.textContent = Math.round(obj.val).toLocaleString(); } });
    }
    if (xpBarRef.current) gsap.fromTo(xpBarRef.current, { width: '0%' }, { width: `${pct}%`, duration: 1.4, ease: 'power2.out' });
  }, { dependencies: [profile?.xp, activeTab] });

  // GSAP: tab switch
  useEffect(() => {
    if (!tabContentRef.current) return;
    gsap.fromTo(tabContentRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' });
  }, [activeTab]);

  const copyReferralLink = () => {
    if (!profile) return;
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${profile.referralCode}`);
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
  };
  const copyReferralCode = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.referralCode);
    setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000);
  };
  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSavingProfile(true);
    await updateProfile(editName.trim(), editPhone.trim());
    setSavingProfile(false); setProfileSaved(true); setShowEditForm(false);
    setTimeout(() => setProfileSaved(false), 3000);
  };
  const handleCheckIn = async () => {
    setCheckingIn(true);
    const result = await dailyCheckIn();
    setCheckingIn(false);
    if (typeof result === 'number') setCheckInXP(result);
    setTimeout(() => setCheckInXP(false), 3000);
  };

  const canCheckIn = !profile?.lastCheckIn || Date.now() - profile.lastCheckIn >= 24 * 60 * 60 * 1000;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-t-brand-neon border-r-brand-magenta border-b-transparent border-l-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] animate-pulse">A carregar perfil...</span>
        </div>
      </div>
    );
  }
  if (!profile) return null;

  const currentLevel = getLevelFromXP(profile.xp);
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  const xpInLevel = profile.xp - currentLevel.minXP;
  const xpForLevel = (nextLevel ? nextLevel.minXP : currentLevel.minXP + 10000) - currentLevel.minXP;
  const progressPercent = Math.min(100, Math.round((xpInLevel / xpForLevel) * 100));
  const initials = profile.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : sessionId.substring(5, 7).toUpperCase();
  const completedMissions = MISSIONS.filter(m => m.completed(profile, affiliateStats)).length;

  return (
    <>
      {/* Level-up overlay */}
      {levelUpData.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-[#0a0a14]/95 border border-brand-neon/40 rounded-[3rem] px-12 py-10 text-center shadow-[0_0_80px_rgba(168,85,247,0.4)] animate-in zoom-in-75 duration-500">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-brand-neon text-xs font-black uppercase tracking-widest mb-2">Subiste de nível!</div>
            <div className="text-4xl font-black text-white">{levelUpData.levelName}</div>
          </div>
        </div>
      )}

      {/* XP toast */}
      {checkInXP !== false && (
        <div className="fixed top-24 right-6 z-[99] bg-brand-neon text-black font-black px-5 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.5)] animate-in slide-in-from-right duration-300 flex items-center gap-2 text-sm">
          <Zap size={14} /> +{checkInXP} XP — Check-in diário!
        </div>
      )}

      {/* Portal layout */}
      <div className="flex min-h-[calc(100vh-80px)]">

        {/* ── Sidebar ── */}
        <aside
          ref={sidebarRef}
          className="hidden lg:flex flex-col sticky top-20 h-[calc(100vh-80px)] w-64 xl:w-72 shrink-0 border-r border-white/[0.07] bg-[#060612] overflow-y-auto"
        >
          {/* Brand */}
          <div className="p-5 border-b border-white/[0.07]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-neon/15 to-brand-magenta/10 border border-brand-neon/25 mb-4">
              <Crown size={11} className="text-brand-neon" />
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-neon">HW Members</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-brand-neon to-brand-magenta flex items-center justify-center text-base font-black text-black shadow-[0_0_18px_rgba(168,85,247,0.3)] shrink-0 ${currentLevel.level >= 4 ? 'ring-2 ring-brand-magenta/50 ring-offset-2 ring-offset-[#060612]' : ''}`}>
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-sm truncate leading-tight">
                  {profile.name || `Agente ${sessionId.substring(5, 11).toUpperCase()}`}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${currentLevel.color}`}>{currentLevel.name}</div>
              </div>
            </div>
            <div className="mt-3.5">
              <div className="flex justify-between text-[9px] font-bold text-gray-600 mb-1">
                <span>{profile.xp.toLocaleString()} XP</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-neon to-brand-magenta rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 px-3 py-2">Navegação</div>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                  <tab.icon size={15} className={isActive ? 'text-brand-neon' : ''} />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tab.id === 'missoes' && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-brand-neon/20 text-brand-neon' : 'bg-white/8 text-gray-500'}`}>
                      {completedMissions}/{MISSIONS.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-white/[0.07] space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[{ label: 'Compras', value: profile.purchaseCount || 0 }, { label: 'Badges', value: (profile.badges || []).length }].map(s => (
                <div key={s.label} className="bg-black/40 rounded-xl p-2.5 text-center">
                  <div className="text-white font-black text-lg leading-none">{s.value}</div>
                  <div className="text-[8px] font-bold text-gray-600 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all">
              <HomeIcon size={13} /> Voltar à Loja
            </Link>
            <p className="text-[9px] text-gray-700 text-center font-semibold">© 2026 Hardware Sale MZ</p>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 pb-24 lg:pb-12">

          {/* Sticky portal header */}
          <div className="sticky top-20 z-20 bg-[#050510]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
            <div>
              <div className="lg:hidden text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-0.5 flex items-center gap-1.5">
                <Crown size={8} className="text-brand-neon" /> HW Members
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Área de Membro &mdash; {TABS.find(t => t.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button onClick={handleCheckIn} disabled={!canCheckIn || checkingIn} title={canCheckIn ? 'Check-in diário' : 'Já fizeste check-in hoje'}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${canCheckIn ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25 hover:bg-orange-400 hover:text-black' : 'bg-white/5 text-gray-600 border border-white/8 cursor-not-allowed'}`}
              >
                <Flame size={11} />
                {checkingIn ? '...' : canCheckIn ? 'Check-in' : <CheckInCountdown lastCheckIn={profile.lastCheckIn!} />}
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-neon to-brand-magenta flex items-center justify-center text-xs font-black text-black">{initials}</div>
            </div>
          </div>

          {/* Tab content */}
          <div ref={tabContentRef} className="px-4 sm:px-8 py-6 sm:py-8">

            {/* Nudge banner for incomplete profile (on non-perfil tabs) */}
            {!profile.name && activeTab !== 'perfil' && (
              <div className="mb-5 bg-gradient-to-r from-brand-neon/10 to-brand-magenta/10 border border-brand-neon/20 rounded-2xl px-5 py-3.5 flex items-center gap-3">
                <UserCircle2 size={16} className="text-brand-neon shrink-0" />
                <p className="text-sm text-gray-300 flex-1">Completa o teu perfil para activar mais funcionalidades.</p>
                <button onClick={() => setActiveTab('perfil')} className="text-xs font-bold text-brand-neon hover:underline shrink-0">Ir →</button>
              </div>
            )}

            {/* ===== PERFIL ===== */}
            {activeTab === 'perfil' && (
              <div className="space-y-5 max-w-3xl">
                {/* Profile setup banner */}
                {!profile.name && (
                  <div className="bg-gradient-to-r from-brand-neon/10 to-brand-magenta/10 border border-brand-neon/20 rounded-2xl p-5">
                    <h4 className="text-white font-bold mb-1 flex items-center gap-2 text-sm">
                      <Sparkles size={14} className="text-brand-neon" /> Completa o teu perfil
                    </h4>
                    <p className="text-gray-400 text-xs mb-3.5">Adiciona nome e telefone para activar o histórico de encomendas.</p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome completo"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-neon/50" />
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Telefone (84/85/86...)" maxLength={9}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-neon/50" />
                      <button onClick={handleSaveProfile} disabled={savingProfile || !editName.trim()}
                        className="px-5 py-2.5 rounded-xl bg-brand-neon text-black font-bold text-sm disabled:opacity-50 hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0">
                        {profileSaved ? <><CheckCircle2 size={13} /> Guardado!</> : savingProfile ? 'A guardar...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Profile card */}
                <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-52 h-52 bg-brand-neon/6 blur-[80px] rounded-full pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-magenta/6 blur-[60px] rounded-full pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-brand-neon to-brand-magenta flex items-center justify-center text-2xl font-black text-black shadow-[0_0_25px_rgba(168,85,247,0.3)] shrink-0 ${currentLevel.level >= 4 ? 'ring-4 ring-brand-magenta/50 ring-offset-4 ring-offset-[#0a0a14]' : ''}`}>
                      {initials}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center gap-2 mb-1.5">
                        <h2 className="text-xl font-black text-white">{profile.name || `Agente ${sessionId.substring(5, 13)}`}</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${currentLevel.level >= 4 ? 'bg-brand-magenta/20 border-brand-magenta/40 text-brand-magenta' : currentLevel.level >= 3 ? 'bg-brand-neon/20 border-brand-neon/40 text-brand-neon' : 'bg-white/10 border-white/20 text-gray-300'}`}>{currentLevel.name}</span>
                      </div>
                      <p className="text-sm text-gray-400">{currentLevel.benefit}</p>
                      {profile.phone && <p className="text-xs text-gray-600 mt-1">{profile.phone}</p>}
                    </div>
                    <div className="text-center shrink-0">
                      <span ref={xpCounterRef} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta">{profile.xp.toLocaleString()}</span>
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">XP Total</div>
                    </div>
                  </div>
                  <div className="mt-5 relative z-10">
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                      <span>Nível {currentLevel.level}: {currentLevel.name}</span>
                      <span className={currentLevel.color}>{progressPercent}%</span>
                    </div>
                    <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-white/5">
                      <div ref={xpBarRef} className="h-full bg-gradient-to-r from-brand-neon to-brand-magenta shadow-[0_0_10px_rgba(168,85,247,0.4)] relative" style={{ width: `${progressPercent}%` }}>
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-[shine_2s_infinite]" />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1.5">
                      <span>{xpInLevel.toLocaleString()} XP neste nível</span>
                      <span>{nextLevel ? `${(xpForLevel - xpInLevel).toLocaleString()} para ${nextLevel.name}` : 'Nível máximo!'}</span>
                    </div>
                  </div>
                </div>

                {/* Edit profile (when name exists) */}
                {profile.name && (
                  <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3.5">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2"><UserCircle2 size={14} className="text-brand-neon" /> Dados do Perfil</h3>
                      <button onClick={() => { setEditName(profile.name || ''); setEditPhone(profile.phone || ''); setShowEditForm(!showEditForm); }}
                        className="text-xs font-bold text-brand-neon hover:underline">{showEditForm ? 'Cancelar' : 'Editar'}</button>
                    </div>
                    {showEditForm ? (
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome completo"
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-neon/50" />
                        <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Telefone" maxLength={9}
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-neon/50" />
                        <button onClick={handleSaveProfile} disabled={savingProfile}
                          className="px-5 py-2.5 rounded-xl bg-brand-neon text-black font-bold text-sm disabled:opacity-50 hover:scale-[1.02] transition-all shrink-0">
                          {profileSaved ? 'Guardado!' : savingProfile ? '...' : 'Guardar'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {[{ label: 'Nome', val: profile.name }, { label: 'Telefone', val: profile.phone || '—' }].map(f => (
                          <div key={f.label} className="bg-black/30 rounded-xl p-3">
                            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">{f.label}</div>
                            <div className="text-sm font-semibold text-white">{f.val}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Check-in */}
                <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                        <Flame size={17} className="text-orange-400" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">Check-in Diário</div>
                        <div className="text-xs text-gray-500">
                          {profile.checkInStreak ? <span className="text-orange-400 font-bold">{profile.checkInStreak} dias seguidos 🔥</span> : 'Acumula XP todos os dias'}
                        </div>
                      </div>
                    </div>
                    <button onClick={handleCheckIn} disabled={!canCheckIn || checkingIn}
                      className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${canCheckIn ? 'bg-orange-400 text-black hover:scale-[1.03] shadow-[0_0_18px_rgba(251,146,60,0.3)]' : 'bg-white/5 text-gray-500 border border-white/8 cursor-not-allowed'}`}
                    >
                      <Calendar size={13} />
                      {checkingIn ? 'A processar...' : canCheckIn
                        ? `+${Math.min(25 + (profile.checkInStreak || 0) * 5, 75)} XP`
                        : <><span>Disponível em </span><CheckInCountdown lastCheckIn={profile.lastCheckIn!} /></>}
                    </button>
                  </div>
                </div>

                {/* Levels grid */}
                <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Star size={14} className="text-brand-neon" /> Sistema de Níveis</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {LEVELS.map(level => {
                      const isCurrent = currentLevel.level === level.level;
                      const isUnlocked = profile.xp >= level.minXP;
                      return (
                        <div key={level.level} className={`p-3 rounded-2xl border text-center transition-all ${isCurrent ? 'bg-brand-neon/10 border-brand-neon/35 shadow-[0_0_12px_rgba(168,85,247,0.1)]' : isUnlocked ? 'bg-white/4 border-white/8' : 'bg-black/40 border-white/4 opacity-40'}`}>
                          <div className={`text-xl font-black mb-0.5 ${isCurrent ? level.color : isUnlocked ? 'text-white' : 'text-gray-600'}`}>{level.level}</div>
                          <div className={`text-[8px] font-black uppercase tracking-wider mb-1 ${level.color}`}>{level.name}</div>
                          <div className="text-[8px] text-gray-500">{level.minXP >= 1000 ? `${level.minXP / 1000}k` : level.minXP}+</div>
                          {isCurrent && <div className="mt-1 text-[7px] bg-brand-neon text-black px-1.5 py-0.5 rounded-full font-black uppercase inline-block">Actual</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* XP Sources */}
                <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Zap size={14} className="text-brand-magenta" /> Como Ganhar XP</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(XP_REWARDS).map(([key, reward]) => (
                      <div key={key} className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-2xl p-3.5 hover:border-brand-neon/15 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-brand-neon/10 flex items-center justify-center text-brand-neon font-black text-xs shrink-0">+{reward.amount}</div>
                        <div>
                          <div className="text-white font-bold text-sm">{reward.label}</div>
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider">por acção</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 bg-black/40 border border-orange-500/10 rounded-2xl p-3.5">
                      <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-black text-xs shrink-0">+25</div>
                      <div>
                        <div className="text-white font-bold text-sm flex items-center gap-1">Check-in Diário <Flame size={10} className="text-orange-400" /></div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider">+5 bónus por dia consecutivo</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== ENCOMENDAS ===== */}
            {activeTab === 'encomendas' && (
              <div className="space-y-4 max-w-3xl">
                {!profile.phone && (
                  <div className="flex justify-end">
                    <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                      Adiciona telefone para ver mais
                    </span>
                  </div>
                )}
                {loadingOrders && (
                  <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-2 border-t-brand-neon border-r-brand-magenta border-b-transparent border-l-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!loadingOrders && orders.length === 0 && (
                  <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-12 text-center shadow-xl">
                    <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400 font-semibold">Ainda não tens encomendas.</p>
                    <p className="text-gray-600 text-sm mt-1">As tuas compras aparecem aqui após confirmação.</p>
                    <Link to="/products" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-brand-neon/15 border border-brand-neon/25 text-brand-neon text-xs font-bold hover:bg-brand-neon hover:text-black transition-all">
                      <Package size={13} /> Ver Produtos
                    </Link>
                  </div>
                )}
                {!loadingOrders && orders.map(order => {
                  const date = order.createdAt?.seconds
                    ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  return (
                    <div key={order.id} className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl hover:border-white/14 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-3.5">
                        <div>
                          <div className="text-white font-bold">{order.customerName}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{date}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_STYLE[order.status] || STATUS_STYLE.pendente}`}>
                            {STATUS_LABEL[order.status] || order.status}
                          </span>
                          <div className="text-right">
                            <div className="text-brand-neon font-extrabold text-sm">{order.total.toLocaleString()} MT</div>
                            <div className="text-[9px] text-gray-600 uppercase tracking-wider">{order.paymentMethod}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 border-t border-white/5 pt-3">
                        {order.items.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <ChevronRight size={9} className="text-brand-neon/50" />
                              {item.name}
                              {(item.quantity || 1) > 1 && <span className="text-gray-700">×{item.quantity}</span>}
                            </span>
                            <span>{item.price.toLocaleString()} MT</span>
                          </div>
                        ))}
                        {order.items.length > 3 && <div className="text-[10px] text-gray-600 ml-4">+{order.items.length - 3} mais itens</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== LEALDADE ===== */}
            {activeTab === 'lealdade' && (
              <div className="space-y-5 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: ShoppingBag, value: profile.purchaseCount || 0, label: 'Compras', color: 'text-brand-neon' },
                    { icon: TrendingUp, value: `${(profile.totalSpent || 0).toLocaleString()} MT`, label: 'Total Gasto', color: 'text-brand-magenta' },
                    { icon: Gift, value: (profile.badges || []).length, label: 'Badges', color: 'text-yellow-400' },
                  ].map(({ icon: Icon, value, label, color }, i) => (
                    <div key={i} className="bg-[#0a0a14] border border-white/8 rounded-3xl p-6 text-center shadow-xl">
                      <Icon className={`w-7 h-7 ${color} mx-auto mb-2.5`} />
                      <div className={`text-3xl font-black ${color}`}>{value}</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Gift size={14} className="text-yellow-400" /> Marcos de Lealdade</h3>
                  <div className="space-y-2.5">
                    {[
                      { purchases: 3, reward: 'Cupão de 5% automático' },
                      { purchases: 5, reward: 'Badge "Entusiasta" + Frete grátis por 1 mês' },
                      { purchases: 10, reward: 'Cupão 10% exclusivo + Badge "Veterano"' },
                      { purchases: 20, reward: 'Status VIP permanente + Descontos prioritários' },
                    ].map((m, i) => {
                      const unlocked = (profile.purchaseCount || 0) >= m.purchases;
                      const pct = Math.min(100, Math.round(((profile.purchaseCount || 0) / m.purchases) * 100));
                      return (
                        <div key={i} className={`p-4 rounded-2xl border transition-all ${unlocked ? 'bg-brand-neon/8 border-brand-neon/20' : 'bg-black/40 border-white/5'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${unlocked ? 'bg-brand-neon text-black' : 'bg-white/5 text-gray-600'}`}>
                              {unlocked ? <CheckCircle2 size={15} /> : <Shield size={15} />}
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-bold text-sm">{m.reward}</div>
                              <div className="text-[9px] text-gray-500 uppercase tracking-wider">
                                {unlocked ? 'Desbloqueado!' : `${m.purchases - (profile.purchaseCount || 0)} compras em falta`}
                              </div>
                            </div>
                            <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${unlocked ? 'bg-brand-neon/20 text-brand-neon' : 'bg-white/5 text-gray-600'}`}>{m.purchases}×</span>
                          </div>
                          {!unlocked && (
                            <div className="h-1 bg-black/60 rounded-full overflow-hidden ml-12">
                              <div className="h-full bg-gradient-to-r from-brand-neon/60 to-brand-neon rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Trophy size={14} className="text-brand-magenta" /> Badges</h3>
                  <div className="flex flex-wrap gap-2">
                    {(profile.badges || []).length === 0 ? (
                      <p className="text-gray-500 text-sm">Nenhum badge ainda. Continua a comprar!</p>
                    ) : (profile.badges || []).map((badge: string, i: number) => (
                      <div key={i} className="px-3.5 py-1.5 bg-gradient-to-r from-brand-neon/10 to-brand-magenta/10 border border-brand-neon/20 rounded-full text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={10} className="text-brand-neon" />{badge.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== MISSÕES ===== */}
            {activeTab === 'missoes' && (
              <div className="space-y-5 max-w-3xl">
                {/* Summary card */}
                <div className="bg-gradient-to-br from-[#0a0a14] to-[#0e0b1a] border border-brand-neon/15 rounded-3xl p-5 shadow-xl flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center shrink-0">
                    <Crosshair size={26} className="text-brand-neon" />
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-black text-white">{completedMissions} <span className="text-gray-500 text-lg">/ {MISSIONS.length}</span></div>
                    <div className="text-xs text-gray-400 font-semibold mb-2">Missões concluídas</div>
                    <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-neon to-brand-magenta rounded-full transition-all duration-700" style={{ width: `${Math.round((completedMissions / MISSIONS.length) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Missions by category */}
                {(['daily', 'social', 'shopping', 'level'] as const).map(cat => {
                  const catMissions = MISSIONS.filter(m => m.category === cat);
                  return (
                    <div key={cat}>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border mb-2.5 ${CAT_COLOR[cat]}`}>
                        {CAT_LABEL[cat]}
                      </div>
                      <div className="space-y-2.5">
                        {catMissions.map(mission => {
                          const done = mission.completed(profile, affiliateStats);
                          const prog = mission.progress?.(profile);
                          const progPct = prog ? Math.round((prog.current / prog.total) * 100) : 0;
                          return (
                            <div key={mission.id} className={`p-4 rounded-2xl border transition-all ${done ? 'bg-brand-neon/8 border-brand-neon/20' : 'bg-[#0a0a14] border-white/8 hover:border-white/14'}`}>
                              <div className="flex items-center gap-3.5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-brand-neon text-black' : 'bg-white/5 text-gray-500'}`}>
                                  {done ? <CheckCircle2 size={17} /> : <mission.icon size={17} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-sm font-bold ${done ? 'text-white' : 'text-gray-300'}`}>{mission.title}</span>
                                    {done && <span className="text-[8px] font-black uppercase tracking-widest text-brand-neon bg-brand-neon/10 px-1.5 py-0.5 rounded-full">Concluído</span>}
                                  </div>
                                  <p className="text-xs text-gray-500">{mission.description}</p>
                                  {prog && !done && (
                                    <div className="mt-1.5">
                                      <div className="flex justify-between text-[9px] font-bold text-gray-600 mb-1">
                                        <span>{prog.current} / {prog.total}</span>
                                        <span>{progPct}%</span>
                                      </div>
                                      <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-neon/60 rounded-full transition-all" style={{ width: `${progPct}%` }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {mission.xpReward > 0 && (
                                  <div className={`shrink-0 text-xs font-black px-2.5 py-1.5 rounded-xl ${done ? 'bg-brand-neon/20 text-brand-neon' : 'bg-white/5 text-gray-500'}`}>
                                    +{mission.xpReward}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== AFILIAÇÃO ===== */}
            {activeTab === 'afiliacao' && (
              <div className="space-y-5 max-w-3xl">
                <div className="bg-gradient-to-br from-[#0a0a14] to-[#110e1b] border border-brand-magenta/15 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-52 h-52 bg-brand-magenta/6 blur-[80px] rounded-full pointer-events-none" />
                  <div className="relative z-10 mb-6">
                    <h2 className="text-2xl font-black text-white mb-1.5">Programa de Afiliação</h2>
                    <p className="text-gray-400 text-sm">Partilha o teu código e ganha <span className="text-brand-magenta font-bold">5% de comissão</span> por cada venda referida.</p>
                  </div>
                  <div className="bg-black/50 border border-white/8 rounded-2xl p-5 relative z-10">
                    <div className="text-center mb-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">O teu código</span>
                      <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-magenta mt-1 tracking-wider">{profile.referralCode}</div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button onClick={copyReferralCode} className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 hover:border-brand-neon/30 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        {codeCopied ? <><CheckCircle2 size={13} className="text-brand-neon" /> Copiado!</> : <><Copy size={13} /> Copiar Código</>}
                      </button>
                      <button onClick={copyReferralLink} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-brand-neon to-brand-magenta text-black font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg">
                        {linkCopied ? <><CheckCircle2 size={13} /> Copiado!</> : <><ArrowRight size={13} /> Copiar Link</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Users, value: affiliateStats.totalReferrals, label: 'Referrals', color: 'text-brand-neon' },
                    { icon: CheckCircle2, value: affiliateStats.conversions, label: 'Conversões', color: 'text-brand-magenta' },
                    { icon: TrendingUp, value: `${affiliateStats.commission.toLocaleString()} MT`, label: 'Comissão', color: 'text-yellow-400' },
                  ].map(({ icon: Icon, value, label, color }, i) => (
                    <div key={i} className="bg-[#0a0a14] border border-white/8 rounded-3xl p-6 text-center shadow-xl">
                      <Icon className={`w-7 h-7 ${color} mx-auto mb-2.5`} />
                      <div className={`text-3xl font-black ${color}`}>{value}</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0a0a14] border border-white/8 rounded-3xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2"><Sparkles size={14} className="text-brand-neon" /> Como Funciona</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                      { step: 1, title: 'Partilha', desc: 'Envia o código ou link para amigos, grupos ou redes sociais.', icon: Copy },
                      { step: 2, title: 'Amigo Compra', desc: 'Quando acedem via link e compram, fica registado.', icon: ShoppingBag },
                      { step: 3, title: 'Ganhas 5%', desc: 'Recebes 5% de comissão sobre cada venda gerada.', icon: TrendingUp },
                    ].map(item => (
                      <div key={item.step} className="text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-neon/15 to-brand-magenta/10 border border-white/8 flex items-center justify-center mx-auto mb-3">
                          <item.icon size={18} className="text-brand-neon" />
                        </div>
                        <div className="text-[9px] font-black text-brand-magenta uppercase tracking-widest mb-1">Passo {item.step}</div>
                        <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#060612]/95 backdrop-blur-xl border-t border-white/[0.07] z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-14">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${isActive ? 'text-brand-neon' : 'text-gray-600 hover:text-gray-400'}`}
              >
                {isActive && <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-brand-neon rounded-b-full" />}
                <tab.icon size={16} />
                <span className="text-[8px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
