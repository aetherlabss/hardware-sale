import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Builder } from './pages/Builder';
import { Checkout } from './pages/Checkout';
import { AdminDashboard } from './pages/AdminDashboard';
import { Upgrade } from './pages/Upgrade';
import { logEvent } from './lib/analytics';
import { useEffect } from 'react';

function AnalyticsTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    logEvent('pageview', location.pathname);
  }, [location]);

  return <>{children}</>;
}

import { BuildOfTheMonth } from './pages/BuildOfTheMonth';

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="builder" element={<Builder />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="upgrade" element={<Upgrade />} />
            <Route path="build-of-the-month" element={<BuildOfTheMonth />} />
          </Route>
        </Routes>
      </AnalyticsTracker>
    </BrowserRouter>
  );
}
