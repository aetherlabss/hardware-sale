import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Builder } from './pages/Builder';
import { Checkout } from './pages/Checkout';
import { AdminDashboard } from './pages/AdminDashboard';
import { Upgrade } from './pages/Upgrade';
import { logEvent } from './lib/analytics';
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

function AnalyticsTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    logEvent('pageview', location.pathname);
  }, [location]);

  return <>{children}</>;
}

import { BuildOfTheMonth } from './pages/BuildOfTheMonth';

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
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="builder" element={<Builder />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="upgrade" element={<Upgrade />} />
            <Route path="build-of-the-month" element={<BuildOfTheMonth />} />
          </Route>
          {/* Admin routes outside Layout so they take over the entire screen natively */}
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </AnalyticsTracker>
    </BrowserRouter>
  );
}
