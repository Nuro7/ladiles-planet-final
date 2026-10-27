import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PwaStatus from './pwa/PwaStatus';

// ── Public landing (eager: it's the entry point, must paint instantly) ──
import LandingPage from './pages/LandingPage';

// ── Everything else is code-split so the cinematic landing stays lean ──
const PricingPage        = lazy(() => import('./pages/PricingPage'));
const TypeLab            = lazy(() => import('./landing/TypeLab'));
const MobileUpload       = lazy(() => import('./pages/MobileUpload'));

const StudioApp          = lazy(() => import('./studio/StudioApp'));
const CinematicStudio    = lazy(() => import('./studio/modules/CinematicStudio'));
const HistoryModule      = lazy(() => import('./studio/modules/HistoryModule'));
const Templates          = lazy(() => import('./studio/modules/Templates'));
const Collections        = lazy(() => import('./studio/modules/Collections'));
const StudioSettings     = lazy(() => import('./studio/modules/Settings'));

const HomePage            = lazy(() => import('./pages/HomePage'));
const DressManagementPage = lazy(() => import('./pages/DressManagementPage'));
const BrideManagementPage = lazy(() => import('./pages/BrideManagementPage'));

/** Minimal dark fallback while a route chunk loads. */
function RouteFallback() {
  return <div style={{ minHeight: '100svh', background: '#320004' }} aria-hidden />;
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
                        <Route path="/seedance-test" element={<Navigate to="/studio/cinematic" replace />} />
                        <Route path="/pricing"    element={<PricingPage />} />
                        <Route path="/type-lab"   element={<TypeLab />} />
                        {/* Phone-side of the studio's "scan to upload" QR */}
                        <Route path="/m/upload/:sessionId" element={<MobileUpload />} />

                        {/* ── AI Studio — premium creative shell with nested modules ── */}
                        <Route path="/studio" element={<StudioApp />}>
                            <Route index                element={<Navigate to="/studio/cinematic" replace />} />
                            <Route path="poster"        element={<Navigate to="/studio/cinematic?output=image" replace />} />
                            <Route path="cinematic"     element={<CinematicStudio />} />
                            <Route path="history"       element={<HistoryModule />} />
                            <Route path="templates"     element={<Templates />} />
                            <Route path="collections"   element={<Collections />} />
                            <Route path="settings"      element={<StudioSettings />} />
                        </Route>
                        {/* Legacy image-studio path → new Poster Studio */}
                        <Route path="/image-studio" element={<Navigate to="/studio/cinematic?output=image" replace />} />

                        {/* ── Login removed: auth paths go straight to the studio ── */}
                        <Route path="/login"  element={<Navigate to="/studio/cinematic" replace />} />
                        <Route path="/signup" element={<Navigate to="/studio/cinematic" replace />} />

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
