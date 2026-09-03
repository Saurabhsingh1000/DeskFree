import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/sound';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAudioEnabled, setIsAudioEnabled] = useState(sounds.enabled);

  const toggleAudio = () => {
    sounds.enabled = !sounds.enabled;
    setIsAudioEnabled(sounds.enabled);
    if (sounds.enabled) {
      sounds.playSelect();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/rooms',
      label: 'Browse',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      to: '/my-bookings',
      label: 'Bookings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    ...(isAdmin
      ? [
          {
            to: '/admin',
            label: 'Admin',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-surface-800/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <Link to="/rooms" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold tracking-tight gradient-text">DeskFree</span>
                <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
              {navItems.map(({ to, label }) => {
                const active = location.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    id={`nav-${label.toLowerCase()}`}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-surface-600/50'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Controls: Audio Toggle, User Profile & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sound FX Toggle */}
              <button
                onClick={toggleAudio}
                className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1 ${
                  isAudioEnabled
                    ? 'bg-surface-700/80 border-white/10 text-brand-300 hover:text-white'
                    : 'bg-surface-800 border-white/5 text-gray-500 hover:text-gray-400'
                }`}
                title={isAudioEnabled ? 'Sound Effects Enabled (Click to Mute)' : 'Sound Effects Muted (Click to Unmute)'}
                aria-label="Toggle Sound Effects"
              >
                <span>{isAudioEnabled ? '🔊' : '🔇'}</span>
              </button>

              {user && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-700/60 border border-white/5 rounded-full">
                  <div className="w-7 h-7 bg-brand-600/40 border border-brand-500/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-300">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left pr-1">
                    <p className="text-xs font-semibold text-white leading-tight truncate max-w-[100px]">{user.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{user.role.toLowerCase()}</p>
                  </div>
                </div>
              )}

              <button
                id="nav-logout-btn"
                onClick={handleLogout}
                className="btn-ghost text-xs sm:text-sm px-2.5 sm:px-3.5 py-2 flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Log out"
                title="Log out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (App-Style Thumb Navigation) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-800/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2 flex items-center justify-around shadow-2xl safe-area-bottom"
        aria-label="Mobile Bottom Navigation"
      >
        {navItems.map(({ to, label, icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl text-xs font-medium transition-all duration-200 active:scale-90 ${
                active
                  ? 'text-brand-400 font-semibold scale-105'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${active ? 'bg-brand-500/15 text-brand-400' : ''}`}>
                {icon}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
