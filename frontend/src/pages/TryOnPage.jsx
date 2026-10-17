import { Suspense, lazy } from 'react';
import Footer from '../components/Footer';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';

const TryOnPanel = lazy(() => import('../components/TryOnPanel'));

export function TryOnPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <Suspense fallback={
        <div style={{ padding: '120px 24px 80px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <SkeletonLoader height="700px" radius={24} />
          </div>
        </div>
      }>
        <TryOnPanel />
      </Suspense>
      <Footer />
    </main>
  );
}

export default TryOnPage;
