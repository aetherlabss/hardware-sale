import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { logEvent } from './lib/analytics';
import { useEffect, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Lazy load components to optimize initial bundle size
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Products = lazy(() => import('./pages/Products').then(module => ({ default: module.Products })));
const Builder = lazy(() => import('./pages/Builder').then(module => ({ default: module.Builder })));
const Checkout = lazy(() => import('./pages/Checkout').then(module => ({ default: module.Checkout })));
const Upgrade = lazy(() => import('./pages/Upgrade').then(module => ({ default: module.Upgrade })));
const BuildOfTheMonth = lazy(() => import('./pages/BuildOfTheMonth').then(module => ({ default: module.BuildOfTheMonth })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const ClientHub = lazy(() => import('./pages/ClientHub').then(module => ({ default: module.ClientHub })));

function AnalyticsTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    logEvent('pageview', location.pathname);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); // Scroll to top on navigation
  }, [location]);

  return <>{children}</>;
}

// Premium cyberpunk themed loading fallback
function MatrixLoader() {
  return (
    <div className="min-h-screen bg-[#020204] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,241,149,0.08)_0%,#020204_70%)] pointer-events-none" />
      <div className="relative flex flex-col items-center gap-4 z-10">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-brand-neon/20 rounded-full animate-ping duration-1000" />
          <div className="w-12 h-12 border-2 border-t-brand-neon border-r-brand-magenta border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] animate-pulse">A carregar...</span>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <BrowserRouter>
      <AnalyticsTracker>
        <Suspense fallback={<MatrixLoader />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="builder" element={<Builder />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="upgrade" element={<Upgrade />} />
              <Route path="build-of-the-month" element={<BuildOfTheMonth />} />
              <Route path="hub" element={<ClientHub />} />
            </Route>
            {/* Admin routes outside Layout so they take over the entire screen natively */}
            {/* New canonical path: /console. /admin kept temporarily as an alias
                 so existing bookmarks don't 404 — remove this alias once everyone
                 has migrated. */}
            <Route path="/console" element={<AdminDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </AnalyticsTracker>
    </BrowserRouter>
  );
}

