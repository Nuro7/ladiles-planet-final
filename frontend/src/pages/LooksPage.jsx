import { LooksGallery } from '../components/LooksGallery';
import Footer from '../components/Footer';

export function LooksPage() {
  return (
    <main style={{ minHeight: '100vh', paddingTop: 72 }}>
      <LooksGallery compact={false} />
      <Footer />
    </main>
  );
}

export default LooksPage;
