import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Cpu, Package, Home as HomeIcon, ChevronRight, MessageCircle, Mail, UserCircle2 } from 'lucide-react';

const SOCIAL = {
  whatsapp: 'https://wa.me/258840000000',
  instagram: 'https://instagram.com/hardwaresalemz',
  facebook: 'https://facebook.com/hardwaresalemz',
  email: 'mailto:suporte@hardwaresale.co.mz',
};
import { useCart } from '../store/useCart';
import { AmaniChat } from './AmaniChat';
import { useEffect } from 'react';

import gsap from 'gsap';

export function Layout() {
  const { items } = useCart();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Trigger a gentle page transition fade
    gsap.fromTo("main", 
      { opacity: 0, y: 10 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, [location.pathname]);

  const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#050510] text-[#f8f8fc] font-sans flex flex-col selection:bg-brand-neon/30 selection:text-white">
      <nav className="sticky top-0 w-full z-50 bg-[#00000080] backdrop-blur-[40px] border-b border-white/5 saturate-[1.8]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative">
          <Link to="/" className="flex items-center gap-3 md:gap-4 group h-full relative z-10 w-1/4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <img 
                src="/hardwaresaleogo.jpeg" 
                alt="Hardware Sale Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-brand-neon transition-colors hidden lg:inline-block leading-tight shrink-0 whitespace-nowrap">Hardware Sale</span>
          </Link>
          
          <div 
            className="absolute left-1/2 -translate-x-1/2 flex gap-1 items-center bg-[#1a1a2480] px-1 md:px-2 py-1 md:py-1.5 rounded-xl md:rounded-[1.2rem] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] my-auto overflow-x-auto custom-scrollbar max-w-[50vw] sm:max-w-none z-10"
            onWheel={(e) => {
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <Link to="/" className={`shrink-0 px-2 md:px-4 py-1.5 md:py-2 ${location.pathname === '/' ? 'bg-white/10 text-white rounded-lg md:rounded-xl font-semibold shadow-sm' : 'text-gray-400 hover:text-white font-medium'} text-[11px] md:text-sm transition-all flex items-center gap-1.5 md:gap-2`}><HomeIcon className="w-3.5 h-3.5 md:w-4 md:h-4"/> <span className="hidden min-[400px]:inline">Home</span></Link>
            <Link to="/products" className={`shrink-0 px-2 md:px-4 py-1.5 md:py-2 ${location.pathname === '/products' ? 'bg-white/10 text-white rounded-lg md:rounded-xl font-semibold shadow-sm' : 'text-gray-400 hover:text-white font-medium'} text-[11px] md:text-sm transition-all flex items-center gap-1.5 md:gap-2`}><Package className="w-3.5 h-3.5 md:w-4 md:h-4"/> <span className="hidden min-[400px]:inline">Montra</span></Link>
            <Link to="/builder" className={`shrink-0 px-2 md:px-4 py-1.5 md:py-2 ${location.pathname === '/builder' ? 'bg-white/10 text-white rounded-lg md:rounded-xl font-semibold shadow-sm' : 'text-gray-400 hover:text-white font-medium'} text-[11px] md:text-sm transition-all flex items-center gap-1.5 md:gap-2`}><Cpu className="w-3.5 h-3.5 md:w-4 md:h-4"/> <span className="hidden min-[400px]:inline">Builder</span></Link>
            <Link to="/upgrade" className={`shrink-0 px-2 md:px-4 py-1.5 md:py-2 ${location.pathname === '/upgrade' ? 'bg-brand-neon/20 text-brand-neon rounded-lg md:rounded-xl font-bold border border-brand-neon/30 shadow-[0_0_15px_rgba(20,241,149,0.2)]' : 'text-brand-magenta hover:text-brand-neon font-bold'} text-[11px] md:text-sm transition-all flex items-center gap-1.5 md:gap-2`}><span className="hidden min-[400px]:inline tracking-widest uppercase text-[10px]">Upgrade</span></Link>
            <Link to="/build-of-the-month" className={`shrink-0 px-2 md:px-4 py-1.5 md:py-2 ${location.pathname === '/build-of-the-month' ? 'bg-white text-black rounded-lg md:rounded-xl font-extrabold shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'text-yellow-400 hover:text-white font-bold'} text-[11px] md:text-sm transition-all flex items-center gap-1.5 md:gap-2 relative`}><span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span></span><span className="tracking-widest uppercase text-[10px]">BOM</span></Link>
          </div>

          <div className="flex items-center gap-3 relative z-10 w-1/4 justify-end">
            <Link
              to="/hub"
              aria-label="Minha Conta"
              className={`p-2.5 rounded-full border transition-all ${
                location.pathname === '/hub'
                  ? 'bg-brand-neon/15 border-brand-neon/40 text-brand-neon shadow-[0_0_14px_rgba(168,85,247,0.25)]'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/15 hover:bg-white/10'
              }`}
            >
              <UserCircle2 className="w-[1.125rem] h-[1.125rem]" />
            </Link>
            <Link to="/checkout" className="relative group p-1">
              <div className="p-2.5 bg-white/5 rounded-full border border-white/5 group-hover:border-white/10 group-hover:bg-white/10 transition-all shadow-sm">
                <ShoppingCart className="w-[1.125rem] h-[1.125rem] text-gray-300 group-hover:text-white transition-colors" />
              </div>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-neon text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.8)] border-2 border-[#050510]">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      {!location.pathname.startsWith('/admin') && <AmaniChat />}

      <footer className="bg-[#02020a] pt-20 pb-10 border-t border-white/5 mt-16 relative z-10">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10 text-gray-400">
           <div className="md:pr-8">
             <h3 className="text-white font-semibold text-xl mb-6 flex items-center gap-3 tracking-tight">
               <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                 <img
                   src="/hardwaresaleogo.jpeg"
                   alt="Logo"
                   className="w-full h-full object-cover"
                   referrerPolicy="no-referrer"
                 />
               </div>
               Hardware Sale
             </h3>
             <p className="text-sm leading-relaxed text-gray-400 font-medium tracking-wide mb-6">A sua fonte de computação em Moçambique. Equipamentos seleccionados com precisão incomparável.</p>
             <div className="space-y-2">
               <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-neon transition-colors">
                 <MessageCircle size={14} /> +258 84 000 0000
               </a>
               <a href={SOCIAL.email} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-neon transition-colors">
                 <Mail size={14} /> suporte@hardwaresale.co.mz
               </a>
             </div>
           </div>
           <div>
              <h4 className="text-white font-semibold mb-5 text-sm">Catálogo Elite</h4>
              <ul className="space-y-3 text-sm font-medium text-gray-500">
                <li><Link to="/products?cat=Desktop's" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Desktop's (RTX 30+)</Link></li>
                <li><Link to="/products?cat=Monitores" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Displays QD-OLED</Link></li>
                <li><Link to="/products?cat=Periféricos" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Periféricos Premium</Link></li>
                <li><Link to="/builder" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Smart PC Builder</Link></li>
              </ul>
           </div>
           <div>
              <h4 className="text-white font-semibold mb-5 text-sm">Minha Conta</h4>
              <ul className="space-y-3 text-sm font-medium text-gray-500">
                <li><Link to="/hub" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Área de Membro</Link></li>
                <li><Link to="/hub#encomendas" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Histórico de Encomendas</Link></li>
                <li><Link to="/hub#lealdade" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Programa de Lealdade</Link></li>
                <li><Link to="/hub#afiliacao" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Programa de Afiliação</Link></li>
              </ul>
           </div>
           <div>
              <h4 className="text-white font-semibold mb-5 text-sm">Transparência</h4>
              <ul className="space-y-3 text-sm font-medium text-gray-500">
                <li><Link to="/build-of-the-month" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Termos de Aquisição</Link></li>
                <li><Link to="/build-of-the-month" onClick={() => window.scrollTo({top: 0, behavior: 'instant'})} className="group flex items-center gap-2 hover:text-brand-neon transition-all duration-300"><ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-neon" />Dados & Privacidade</Link></li>
                <li>
                  <div className="mt-3 inline-flex items-center gap-3 border border-brand-neon/20 px-4 py-2.5 rounded-[1.2rem] bg-brand-neon/5 backdrop-blur-md hover:bg-brand-neon/10 hover:border-brand-neon/40 transition-all cursor-default group">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                    </span>
                    <span className="font-semibold text-[11px] text-gray-200 tracking-widest uppercase group-hover:text-white transition-colors">Operações Normais</span>
                  </div>
                </li>
              </ul>
           </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5">
          {/* Social icons row */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
               className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-brand-neon hover:border-brand-neon/30 hover:bg-brand-neon/10 transition-all">
              <MessageCircle size={16} />
            </a>
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
               className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-brand-magenta hover:border-brand-magenta/30 hover:bg-brand-magenta/10 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
               className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:border-blue-400/30 hover:bg-blue-400/10 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a href={SOCIAL.email} aria-label="Email"
               className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all">
              <Mail size={16} />
            </a>
          </div>
          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500 font-medium gap-4">
            <p className="text-center md:text-left">© 2026 Hardware Sale. Todos os direitos reservados. Maputo, Moçambique.</p>
            <div className="flex items-center gap-2">
              Desenvolvido por <span className="text-brand-neon font-semibold bg-brand-neon/10 px-3 py-1 rounded-full border border-brand-neon/20">Gabriel Vieira</span>
            </div>
          </div>
        </div>
      </footer>

      {/* <AmaniChat /> */}
    </div>
  );
}
