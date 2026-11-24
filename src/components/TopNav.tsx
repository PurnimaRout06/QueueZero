import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { UserProfile } from '../types';

export type AppView = 'landing' | 'auth' | 'dashboard' | 'new-case' | 'case-detail' | 'settings';

interface TopNavProps {
  currentView: AppView;
  user: UserProfile | null;
  onNavigate: (view: AppView) => void;
  onStartDemo: () => void;
  onSignOut: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  user,
  onNavigate,
  onStartDemo,
  onSignOut,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ label: string; action: () => void; active?: boolean }> = user
    ? [
        {
          label: 'Dashboard',
          action: () => onNavigate('dashboard'),
          active: currentView === 'dashboard',
        },
        {
          label: 'New Case',
          action: () => onNavigate('new-case'),
          active: currentView === 'new-case',
        },
        {
          label: 'Privacy & MCP',
          action: () => onNavigate('settings'),
          active: currentView === 'settings',
        },
        {
          label: 'Sign Out',
          action: onSignOut,
        },
      ]
    : [
        {
          label: 'How It Works',
          action: () => {
            onNavigate('landing');
            setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 50);
          },
        },
        {
          label: 'Sample Case',
          action: () => {
            onNavigate('landing');
            setTimeout(() => document.getElementById('sample-case')?.scrollIntoView({ behavior: 'smooth' }), 50);
          },
        },
        {
          label: 'Trust & Privacy',
          action: () => {
            onNavigate('landing');
            setTimeout(() => document.getElementById('trust-privacy')?.scrollIntoView({ behavior: 'smooth' }), 50);
          },
        },
        {
          label: 'Sign In',
          action: () => onNavigate('auth'),
          active: currentView === 'auth',
        },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single clean wordmark */}
        <button
          type="button"
          onClick={() => onNavigate(user ? 'dashboard' : 'landing')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          QueueZero
        </button>

        {/* Zone 2: 4 single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1 py-1 ${
                item.active ? 'text-slate-900 underline decoration-blue-700 decoration-2 underline-offset-8' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Single primary CTA */}
        <div className="hidden md:flex items-center shrink-0">
          <button
            type="button"
            onClick={() => (user ? onNavigate('new-case') : onStartDemo())}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {user ? 'Start New Case' : 'Resolve My Issue'}
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                item.action();
              }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              if (user) onNavigate('new-case');
              else onStartDemo();
            }}
            className="w-full mt-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {user ? 'Start New Case' : 'Resolve My Issue'}
          </button>
        </div>
      )}
    </header>
  );
};
