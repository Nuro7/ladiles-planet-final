/**
 * StudioApp.jsx — the studio shell. Wraps every module route in the scoped
 * design system, mounts the top bar, sidebar, command palette, and toaster,
 * and wires the ⌘K shortcut + shared credit balance.
 */
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import './studio.css';
import TopBar from './shell/TopBar';
import Sidebar from './shell/Sidebar';
import CommandPalette from './shell/CommandPalette';
import Toaster from './shell/Toaster';
import StudioLoader from './shell/StudioLoader';
import { useUIStore, useCreditsStore } from './store';
import { getBalance } from '../api/bridalVideo';

export default function StudioApp() {
  const toggleCommand = useUIStore((s) => s.toggleCommand);
  const setBalance = useCreditsStore((s) => s.setBalance);

  // Shared credit balance (also refreshed by modules after a generation)
  useEffect(() => {
    getBalance().then(setBalance).catch(() => {});
  }, [setBalance]);

  // ⌘K / Ctrl+K command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCommand]);

  return (
    <MotionConfig reducedMotion="user"><div className="studio-root">
      <StudioLoader />
      <div className="s-app">
        <TopBar />
        <div className="s-body">
          <Sidebar />
          <Outlet />
        </div>
      </div>
      <CommandPalette />
      <Toaster />
    </div></MotionConfig>
  );
}
