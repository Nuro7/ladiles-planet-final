import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PwaStatus from './pwa/PwaStatus';

// ── Public landing (eager: it's the entry point, must paint instantly) ──
import LandingPage from './pages/LandingPage';
import { HIGGSFIELD_STUDIO_URL } from './landing/data';

// ── Everything else is code-split so the cinematic landing stays lean ──
const PricingPage        = lazy(() => import('./pages/PricingPage'));
const TypeLab            = lazy(() => import('./landing/TypeLab'));
const MobileUpload       = lazy(() => import('./pages/MobileUpload'));

const HomePage           = lazy(() => import('./pages/HomePage'));
const DressManagementPage = lazy(() => import('./pages/DressManagementPage'));
const BrideManagementPage = lazy(() => import('./pages/BrideManagementPage'));

/** Minimal dark fallback while a route chunk loads. */
function RouteFallback() {
  return <div style={{ minHeight: '100svh', background: '#320004' }} aria-hidden />;
}

/**
 * Keeps the Vercel PWA as the top-level browsing context while presenting the
 * Higgsfield-hosted Studio edge to edge. A top-level cross-origin redirect
 * makes Chromium show its out-of-scope origin bar; an embedded Studio does not.
 */
function StudioFrame() {
  return (
    <iframe
      src={HIGGSFIELD_STUDIO_URL}
      title="Ladies Planet Studio"
      allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100dvh',
        border: 0,
        background: '#4A0008',
      }}
    />
  );
}

function App() {
    return (
        <AuthProvider>
            <PwaStatus />
            <Router>
                <Suspense fallback={<RouteFallback />}>
                    <Routes>
                        {/* ── Public: AI Bridal Wall ── */}
                        <Route path="/"           element={<LandingPage />} />
                        <Route path="/seedance-test" element={<StudioFrame />} />
                        <Route path="/pricing"    element={<PricingPage />} />
                        <Route path="/type-lab"   element={<TypeLab />} />
                        {/* Phone-side of the studio's "scan to upload" QR */}
                        <Route path="/m/upload/:sessionId" element={<MobileUpload />} />

                        {/* Studio remains on Higgsfield, embedded inside this PWA. */}
                        <Route path="/studio/*"     element={<StudioFrame />} />
                        <Route path="/image-studio" element={<StudioFrame />} />

                        {/* ── Login removed: auth paths go straight to the studio ── */}
                        <Route path="/login"  element={<StudioFrame />} />
                        <Route path="/signup" element={<StudioFrame />} />

                        {/* ── Protected admin routes (moved to /admin/*) ── */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/admin"         element={<HomePage />} />
                            <Route path="/admin/dresses" element={<DressManagementPage />} />
                            <Route path="/admin/brides"  element={<BrideManagementPage />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </Router>
        </AuthProvider>
    );
}

export default App;
