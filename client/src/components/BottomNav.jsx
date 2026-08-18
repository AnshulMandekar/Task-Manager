import { NavLink } from 'react-router-dom';
import { HomeIcon, CollegeIcon, JobIcon, StudyIcon, ChatIcon } from './Icons';

const navItems = [
  { to: '/', icon: <HomeIcon size={20} />, label: 'Home' },
  { to: '/college', icon: <CollegeIcon size={20} />, label: 'College' },
  { to: '/job', icon: <JobIcon size={20} />, label: 'Job' },
  { to: '/study', icon: <StudyIcon size={20} />, label: 'Study' },
  { to: '/chat', icon: <ChatIcon size={20} />, label: 'AI Chat', isChat: true },
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
