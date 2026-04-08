import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiHome, FiPlusCircle } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand">
          <div className="logo-icon">💰</div>
          <span>EquiSplit</span>
        </Link>

        <div className="navbar-links">
          <Link to="/dashboard" className={isActive('/dashboard')}>
            <FiHome style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Dashboard
          </Link>
          <Link to="/groups/create" className={isActive('/groups/create')}>
            <FiPlusCircle style={{ marginRight: 4, verticalAlign: 'middle' }} />
            New Group
          </Link>

          <div className="nav-user">
            <div className="nav-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button className="nav-logout" onClick={logout} title="Logout">
              <FiLogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
