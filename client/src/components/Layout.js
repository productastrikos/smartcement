import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../services/socket';
import { MODULES } from '../services/cementKnowledge';
import NotificationsPanel from './NotificationsPanel';
import AdvisoryPanel from './AdvisoryPanel';
import CriticalBanner from './CriticalBanner';

const MODULE_ICON = 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H6.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 0011 10.172V5L8 4z';

/* ─── Navigation structure ─────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/',               icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', label: 'Dashboard' },
    ],
  },
  {
    label: 'Modules',
    items: MODULES.map((m) => ({ path: m.route, icon: MODULE_ICON, label: m.title, moduleId: m.id })),
  },
  {
    label: 'Governance',
    items: [
      { path: '/compliance',     icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Compliance & Audit' },
    ],
  },
];

/* ─── Deep search index  ──────────────────────────────────
   Each entry: { label, path, breadcrumb, keywords, icon }
   breadcrumb = ['Page', 'Section', 'Item']  (shown in results)
   keywords   = extra words matched against (not displayed)
────────────────────────────────────────────────────────── */
const SEARCH_INDEX = [
  { label:'Dashboard',             path:'/',                breadcrumb:['Dashboard'],                            icon:'📊', keywords:'overview kpi summary home main metrics plant cempulse' },
  ...MODULES.map((m) => ({
    label: m.title,
    path: m.route,
    breadcrumb: ['Modules', m.shortTitle],
    icon: '📈',
    keywords: `${m.shortTitle} ${m.whatItIs}`.toLowerCase(),
  })),
  { label:'Compliance & Audit',    path:'/compliance',      breadcrumb:['Governance','Compliance'],              icon:'👥', keywords:'compliance audit trail traceability usage analytics access security emissions permit' },
];

/* ─── Icon helper ──────────────────────────────────────── */
function SvgIcon({ d, size = 'w-4 h-4', strokeWidth = 1.6 }) {
  return (
    <svg className={`${size} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={d} />
    </svg>
  );
}

/* Maps the legacy emoji icon keys in SEARCH_INDEX to SVG path strings */
const SEARCH_ICON_PATHS = {
  '📊': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  '📈': 'M23 6l-9.5 9.5-5-5L1 18',
  '👥': 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
};

/* ─── Page title map ───────────────────────────────────── */
const PAGE_TITLES = {
  '/':            'Dashboard',
  '/compliance':  'Compliance & Audit',
};

export default function Layout({ children, user, onLogout, theme = 'dark', onThemeToggle }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { notifications, advisories, plantKpis } = useData();
  const alertCountsByModule = plantKpis?.alertCountsByModule || {};
  const [showAlerts,   setShowAlerts]   = useState(false);
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [time,         setTime]         = useState(new Date());
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [showSearch,   setShowSearch]   = useState(false);
  const profileRef   = React.useRef(null);
  const searchRef    = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!showSearch) return undefined;
    const onDocClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSearch]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    const scored = SEARCH_INDEX.map(item => {
      const haystack = [
        item.label,
        ...(item.breadcrumb || []),
        item.keywords || '',
      ].join(' ').toLowerCase();
      const matchCount = words.filter(w => haystack.includes(w)).length;
      return { item, matchCount };
    }).filter(({ matchCount }) => matchCount > 0);
    scored.sort((a, b) => {
      // Prioritise full-word matches in label, then match count
      const aLabel = a.item.label.toLowerCase().includes(q) ? 1 : 0;
      const bLabel = b.item.label.toLowerCase().includes(q) ? 1 : 0;
      if (bLabel !== aLabel) return bLabel - aLabel;
      return b.matchCount - a.matchCount;
    });
    return scored.slice(0, 10).map(({ item }) => item);
  }, [searchQuery]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!showProfile) return undefined;
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setShowProfile(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showProfile]);

  const unacknowledgedAlerts = notifications?.filter(n => !n.acknowledged)?.length || 0;
  const criticalAlerts       = notifications?.filter(n => n.type === 'critical' && !n.acknowledged)?.length || 0;
  const activeModule         = MODULES.find(m => m.route === location.pathname);
  const pageTitle            = activeModule?.title || PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className={`theme-${theme} h-screen w-screen flex overflow-hidden bg-app-darker`}>

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 overflow-hidden transition-all duration-200 bg-app-dark border-r border-app-border"
        style={{ width: sidebarOpen ? 'var(--app-sidebar-w, 244px)' : '60px' }}
      >
        {/* Logo row */}
        <div
          className="flex items-center gap-3 px-4 cursor-pointer shrink-0 border-b border-app-border"
          style={{ height: 'var(--app-header-h, 62px)' }}
          onClick={() => navigate('/')}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#0ea5e9 0%,#6366f1 60%,#8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
          }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-5h6v5" />
            </svg>
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold leading-tight tracking-tight" style={{ color: 'var(--app-text)' }}>CemPulse</div>
              <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--app-text-faint)' }}>Smart Cement Operations</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {sidebarOpen && (
                <p className="nav-section-label">{section.label}</p>
              )}
              {!sidebarOpen && <div className="h-3" />}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const badgeCount = item.moduleId ? (alertCountsByModule[item.moduleId] || 0) : 0;
                return (
                  <div key={item.path} className="px-2">
                    <button
                      onClick={() => navigate(item.path)}
                      className={`nav-item w-full ${isActive ? 'active' : ''}`}
                      title={!sidebarOpen ? item.label : undefined}
                      style={{ position: 'relative' }}
                    >
                      <SvgIcon d={item.icon} />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                      {badgeCount > 0 && (
                        <span
                          className="ml-auto shrink-0 rounded-full font-bold flex items-center justify-center"
                          style={{
                            minWidth: 16, height: 16, fontSize: 9, padding: '0 4px',
                            background: 'var(--app-danger)', color: 'var(--app-on-color)',
                            position: sidebarOpen ? 'static' : 'absolute', top: 4, right: 4,
                          }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: user + logout */}
        <div className="shrink-0 border-t border-app-border">
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-8 h-8 rounded-lg bg-app-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              >
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--app-text)' }}>{user?.fullName}</div>
                <div className="text-[10px] truncate capitalize" style={{ color: 'var(--app-text-faint)' }}>
                  {user?.roleLabel || user?.role?.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          )}
          <div className="px-2 pb-3" />
        </div>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── TOPBAR ──────────────────────────────────────────── */}
        <header
          className="shrink-0 flex items-center gap-3 px-4 border-b border-app-border"
          style={{ height: 'var(--app-header-h, 62px)', background: 'var(--app-chrome-bg)' }}
        >
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="icon-btn"
            title="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* App Command Center title */}
          <div className="hidden sm:flex flex-col ml-1">
            <span className="text-[11px] font-bold tracking-widest" style={{ color: 'var(--app-text)', letterSpacing: '0.10em' }}>CEMPULSE</span>
            <span className="text-[9px]" style={{ color: 'var(--app-text-faint)' }}>{pageTitle} · Plant Operations</span>
          </div>

          {/* Search */}
          <div className="header-search flex-1 max-w-xs ml-3" ref={searchRef} style={{ position: 'relative' }}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--app-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search anything… (Ctrl+K)"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); e.target.blur(); }
                if (e.key === 'Enter' && searchResults.length > 0) {
                  navigate(searchResults[0].path);
                  setShowSearch(false);
                  setSearchQuery('');
                  e.target.blur();
                }
              }}
            />
            {showSearch && searchQuery.trim() && (
              <div className="search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="search-dropdown-empty">No results for "{searchQuery}"</div>
                ) : searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    className="search-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(item.path);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="sdi-icon"><SvgIcon d={SEARCH_ICON_PATHS[item.icon] || item.icon} size="w-3.5 h-3.5" /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sdi-label">{item.label}</div>
                      <div className="sdi-desc">
                        {item.breadcrumb.join(' › ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Live time */}
          <div className="hidden md:block font-mono text-xs px-2 py-1 rounded-md"
            style={{ background: 'var(--app-surface-soft)', color: 'var(--app-text-muted)', border: '1px solid var(--app-border)', letterSpacing: '0.04em' }}>
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>

          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            className="icon-btn"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="-1 -1 26 26">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1012 21a8.962 8.962 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* AI Advisory — wider purple action button */}
          <button
            onClick={() => { setShowAdvisory(!showAdvisory); setShowAlerts(false); }}
            className={`app-advisory-btn ${showAdvisory ? 'active' : ''}`}
            title="AI Advisory"
            aria-label="AI Advisory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Advisory</span>
          </button>

          {/* Notifications bell */}
          <button
            onClick={() => { setShowAlerts(!showAlerts); setShowAdvisory(false); }}
            className={`icon-btn ${showAlerts ? 'active' : ''}`}
            title="Notifications"
            aria-label="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unacknowledgedAlerts > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] flex items-center justify-center font-bold px-0.5 ${criticalAlerts > 0 ? 'animate-pulse' : ''}`}
                style={{
                  background: criticalAlerts > 0 ? 'var(--app-danger)' : 'var(--app-warning)',
                  color: 'var(--app-on-color)',
                }}
              >
                {unacknowledgedAlerts}
              </span>
            )}
          </button>

          {/* User avatar — icon only with dropdown menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setShowProfile((s) => !s)}
              aria-haspopup="menu"
              aria-expanded={showProfile}
              title={user?.fullName || 'Account'}
            >
              {user?.fullName?.charAt(0) || 'U'}
            </button>
            {showProfile && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-header">
                  <div className="avatar">{user?.fullName?.charAt(0) || 'U'}</div>
                  <div className="min-w-0">
                    <div className="name truncate">{user?.fullName || 'Account'}</div>
                    <div className="status">Online</div>
                  </div>
                </div>
                <div className="profile-menu-section">
                  <button className="profile-menu-item" role="menuitem" onClick={() => { setShowProfile(false); setShowAlerts(true); setShowAdvisory(false); }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    Notifications
                  </button>
                  <button className="profile-menu-item" role="menuitem" onClick={() => { setShowProfile(false); onThemeToggle && onThemeToggle(); }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Settings
                  </button>
                </div>
                {onLogout && (
                  <div className="profile-menu-section">
                    <button className="profile-menu-item" role="menuitem" onClick={() => { setShowProfile(false); onLogout(); }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ── CONTENT ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          <main className={`h-full ${location.pathname === '/map' ? 'overflow-y-auto' : 'overflow-auto p-4'}`}>
            {children}
          </main>
        </div>
      </div>

      {/* Notifications panel — rendered outside flex flow, true fixed overlay */}
      {showAlerts && (
        <div className="w-80 overflow-hidden animate-slide-up border-l border-app-border bg-app-darker"
          style={{ position: 'fixed', top: 'var(--app-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}>
          <NotificationsPanel notifications={notifications} onClose={() => setShowAlerts(false)} />
        </div>
      )}

      {/* AI Advisory panel — rendered outside flex flow, true fixed overlay */}
      {showAdvisory && (
        <div className="app-advisory-panel w-96 overflow-hidden animate-slide-up border-2 border-app-border"
          style={{ position: 'fixed', top: 'var(--app-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}>
          <AdvisoryPanel advisories={advisories} onClose={() => setShowAdvisory(false)} />
        </div>
      )}

      <CriticalBanner />
    </div>
  );
}

