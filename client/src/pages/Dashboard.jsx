import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FiUsers, FiDollarSign, FiTrendingUp, FiPlus } from 'react-icons/fi';

const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch (error) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = groups.reduce((sum, g) => sum + (g.totalExpenses || 0), 0);
  const totalMembers = new Set(groups.flatMap(g => g.members?.map(m => m._id) || [])).size;

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Hello, {user?.name?.split(' ')[0]}! 👋</h1>
        <p>Manage your shared expenses and settle up with ease</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <FiUsers />
          </div>
          <div className="stat-value">{groups.length}</div>
          <div className="stat-label">Active Groups</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <FiDollarSign />
          </div>
          <div className="stat-value">₹{totalExpenses.toLocaleString()}</div>
          <div className="stat-label">Total Expenses</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <FiTrendingUp />
          </div>
          <div className="stat-value">{groups.reduce((sum, g) => sum + (g.expenseCount || 0), 0)}</div>
          <div className="stat-label">Transactions</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <FiUsers />
          </div>
          <div className="stat-value">{totalMembers}</div>
          <div className="stat-label">People Involved</div>
        </div>
      </div>

      {/* Groups */}
      <div className="section-header">
        <h2>Your Groups</h2>
        <Link to="/groups/create" className="btn btn-primary">
          <FiPlus /> New Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No groups yet</h3>
          <p>Create your first group to start splitting expenses with friends, roommates, or teammates.</p>
          <Link to="/groups/create" className="btn btn-primary btn-lg">
            <FiPlus /> Create Your First Group
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {groups.map((group) => (
            <Link to={`/groups/${group._id}`} key={group._id} style={{ textDecoration: 'none' }}>
              <div className="group-card animate-in">
                <div className="group-card-header">
                  <div className="group-card-title">{group.name}</div>
                  <span className="badge badge-primary">{group.expenseCount || 0} expenses</span>
                </div>
                {group.description && (
                  <div className="group-card-desc">{group.description}</div>
                )}
                <div className="group-card-meta">
                  <span><FiUsers size={12} /> {group.members?.length || 0} members</span>
                  <span><FiDollarSign size={12} /> ₹{(group.totalExpenses || 0).toLocaleString()}</span>
                </div>
                <div className="member-avatars">
                  {group.members?.slice(0, 5).map((member) => (
                    <div key={member._id} className="member-avatar" title={member.name}>
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {group.members?.length > 5 && (
                    <div className="member-avatar" style={{ background: 'var(--bg-glass-hover)', color: 'var(--text-muted)' }}>
                      +{group.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
