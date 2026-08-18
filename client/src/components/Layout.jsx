import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import {
  HomeIcon,
  CollegeIcon,
  JobIcon,
  StudyIcon,
  ChatIcon,
  MoonIcon,
  SunIcon,
  LogoutIcon
} from './Icons';

export default function Layout() {
  const { user, logoutUser } = useAuth();

  // Dark Mode State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const navItems = [
    { to: '/', icon: <HomeIcon size={20} />, label: 'Home' },
    { to: '/college', icon: <CollegeIcon size={20} />, label: 'College' },
    { to: '/job', icon: <JobIcon size={20} />, label: 'Job' },
    { to: '/study', icon: <StudyIcon size={20} />, label: 'Study' },
    { to: '/chat', icon: <ChatIcon size={20} />, label: 'AI Chat', isChat: true },
  ];

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div className="logo-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span className="logo-text">TaskFlow</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''} ${item.isChat ? 'chat-item' : ''}`
              }
              end={item.to === '/'}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
            <span className="theme-toggle-label">
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>

          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">User</span>
            </div>
            <button
              className="sidebar-logout"
              onClick={logoutUser}
              title="Logout"
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Mobile Header (hidden on desktop) */}
        <header className="mobile-header">
          <div className="mobile-logo">
            <div className="logo-badge-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="logo-text-sm">TaskFlow</span>
          </div>

          <div className="mobile-header-actions">
            <button
              className="mobile-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
            </button>
            <button
              className="mobile-user-avatar"
              onClick={logoutUser}
              title={`Logged in as ${user?.username}. Click to logout.`}
            >
              {user?.username?.[0]?.toUpperCase() || '?'}
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav (Mobile only, hidden on desktop) */}
      <BottomNav />
      <Toast />
    </div>
  );
}
