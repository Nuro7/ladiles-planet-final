import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './pwaStatus.css';

// A tablet can stay open for days, so look for a new deploy every hour.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Registers the service worker and shows two small banners: "update ready" and "offline". */
export default function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_MS);
    },
  });

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  if (!online) {
    return <div className="pwa-banner" role="status">No internet connection. The studio needs a connection to create.</div>;
  }
  if (needRefresh) {
    return <div className="pwa-banner" role="status">
      <span>A new version of the studio is ready.</span>
      <button type="button" className="pwa-banner__primary" onClick={() => updateServiceWorker(true)}>Refresh</button>
      <button type="button" onClick={() => setNeedRefresh(false)}>Later</button>
    </div>;
  }
  return null;
}
