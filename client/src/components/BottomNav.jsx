import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/college', icon: '🎓', label: 'College' },
  { to: '/job', icon: '💼', label: 'Job' },
  { to: '/study', icon: '📖', label: 'Study' },
  { to: '/chat', icon: '✨', label: 'AI Chat', isChat: true },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" id="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''} ${item.isChat ? 'chat-nav' : ''}`
          }
          end={item.to === '/'}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
