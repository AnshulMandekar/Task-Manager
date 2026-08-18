import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';

export default function Layout() {
  const { user, logoutUser } = useAuth();

  return (
    <div className="app">
      <div className="app-content">
        <div className="page-header">
          <div></div>
          <button
            className="user-menu-btn"
            onClick={logoutUser}
            title={`Logged in as ${user?.username}. Click to logout.`}
            id="user-menu-btn"
          >
            {user?.username?.[0] || '?'}
          </button>
        </div>
        <Outlet />
      </div>
      <BottomNav />
      <Toast />
    </div>
  );
}
