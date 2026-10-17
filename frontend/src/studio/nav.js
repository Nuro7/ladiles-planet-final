/**
 * nav.js — single source of truth for studio modules.
 * Shared by the Sidebar, the Command Palette, and routing.
 */
import {
  Film,
  History, LayoutTemplate, Library, Settings,
} from 'lucide-react';

export const MODULES = [
  { id: 'cinematic',   path: 'cinematic',   label: 'Creation Studio',      group: 'Bridal Studio', icon: Film,           desc: 'AI wedding films with camera motion' },
  { id: 'history',     path: 'history',     label: 'History',          group: 'Library',       icon: History,        desc: 'Every generation you have made' },
  { id: 'templates',   path: 'templates',   label: 'Scene Library',        group: 'Library',       icon: LayoutTemplate, desc: 'Royal, editorial, traditional & more' },
  { id: 'collections', path: 'collections', label: 'Dress Gallery',      group: 'Library',       icon: Library,        desc: 'Saved brides, dresses, themes & looks' },
  { id: 'settings',    path: 'settings',    label: 'Settings',         group: 'System',        icon: Settings,       desc: 'Workspace, models & preferences' },
];

export const GROUPS = ['Bridal Studio', 'Library', 'System'];

export const moduleByPath = (p) => MODULES.find((m) => m.path === p);
