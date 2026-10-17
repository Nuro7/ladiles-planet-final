import { useState, useEffect, useCallback } from 'react';
import { getLooks } from '../api/tryOn';

// Fallback demo looks for when API is unavailable
const DEMO_LOOKS = [
  { id: 'l1',  name: 'Celestial Bloom',       style: 'Ball Gown',    tag: 'Classic',     src: null, aiSuggested: true },
  { id: 'l2',  name: 'Ethereal Drift',         style: 'A-Line',       tag: 'Minimalist',  src: null, aiSuggested: true },
  { id: 'l3',  name: 'Golden Mirage',          style: 'Mermaid',      tag: 'Modern',      src: null, aiSuggested: false },
  { id: 'l4',  name: 'Ivory Reverie',          style: 'Sheath',       tag: 'Classic',     src: null, aiSuggested: false },
  { id: 'l5',  name: 'Lotus Empress',          style: 'Lehenga',      tag: 'Indo-Fusion', src: null, aiSuggested: false },
  { id: 'l6',  name: 'Pearl Cascade',          style: 'Ball Gown',    tag: 'Classic',     src: null, aiSuggested: false },
  { id: 'l7',  name: 'Moonveil Grace',         style: 'A-Line',       tag: 'Modern',      src: null, aiSuggested: false },
  { id: 'l8',  name: 'Crimson Dusk',           style: 'Saree',        tag: 'Indo-Fusion', src: null, aiSuggested: false },
  { id: 'l9',  name: 'Velvet Whisper',         style: 'Trumpet',      tag: 'Minimalist',  src: null, aiSuggested: false },
  { id: 'l10', name: 'Sakura Dream',           style: 'Tea-Length',   tag: 'Modern',      src: null, aiSuggested: false },
  { id: 'l11', name: 'Maharani Splendour',     style: 'Lehenga',      tag: 'Indo-Fusion', src: null, aiSuggested: false },
  { id: 'l12', name: 'Diamond Horizon',        style: 'Ball Gown',    tag: 'Classic',     src: null, aiSuggested: false },
];

const FILTER_OPTIONS = ['All', 'Modern', 'Classic', 'Indo-Fusion', 'Minimalist'];

/**
 * useLooks — fetches bridal looks from API, falls back to demo data.
 */
export function useLooks() {
  const [looks, setLooks]       = useState(DEMO_LOOKS);
  const [filter, setFilter]     = useState('All');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const fetchLooks = useCallback(async (activeFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLooks({ style: activeFilter });
      if (data.looks && data.looks.length > 0) {
        setLooks(data.looks);
      } else {
        setLooks(DEMO_LOOKS);
      }
    } catch {
      // Silently fall back to demo data — API may not be wired yet
      setLooks(DEMO_LOOKS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLooks(filter);
  }, [filter, fetchLooks]);

  const setFilterAndFetch = useCallback((newFilter) => {
    setFilter(newFilter);
  }, []);

  const filteredLooks = filter === 'All'
    ? looks
    : looks.filter(l => l.tag === filter);

  const aiSuggested = looks.filter(l => l.aiSuggested);

  return {
    looks: filteredLooks,
    allLooks: looks,
    aiSuggested,
    filter,
    setFilter: setFilterAndFetch,
    filters: FILTER_OPTIONS,
    loading,
    error,
  };
}

export default useLooks;
