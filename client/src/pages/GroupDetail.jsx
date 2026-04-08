import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FiPlus, FiArrowLeft, FiTrash2, FiDollarSign, FiUsers, FiTrendingUp, FiBarChart2, FiWifi } from 'react-icons/fi';

const CATEGORY_ICONS = {
  Food: '🍕',
  Travel: '✈️',
  Rent: '🏠',
  Entertainment: '🎬',
  Utilities: '💡',
  Shopping: '🛍️',
  Healthcare: '🏥',
  Other: '📦'
};

const CATEGORY_COLORS = {
  Food: 'rgba(245, 158, 11, 0.15)',
  Travel: 'rgba(59, 130, 246, 0.15)',
  Rent: 'rgba(139, 92, 246, 0.15)',
  Entertainment: 'rgba(236, 72, 153, 0.15)',
  Utilities: 'rgba(16, 185, 129, 0.15)',
  Shopping: 'rgba(244, 63, 94, 0.15)',
  Healthcare: 'rgba(20, 184, 166, 0.15)',
  Other: 'rgba(100, 116, 139, 0.15)'
};

const GroupDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, joinGroup, leaveGroup } = useSocket();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
    // Join this group's socket room
    joinGroup(id);
    return () => leaveGroup(id);
  }, [id]);

  // Real-time socket listeners for expense events
  useEffect(() => {
    if (!socket) return;

    const handleExpenseCreated = (data) => {
      toast.info(`💰 ${data.message}`, { icon: false });
      fetchAll();
    };

    const handleExpenseUpdated = (data) => {
      toast.info(`✏️ ${data.message}`, { icon: false });
      fetchAll();
    };

    const handleExpenseDeleted = (data) => {
      toast.info(`🗑️ ${data.message}`, { icon: false });
      fetchAll();
    };

    const handleGroupUpdated = (data) => {
      toast.info(`📝 ${data.message}`, { icon: false });
      fetchAll();
    };

    socket.on('expense:created', handleExpenseCreated);
    socket.on('expense:updated', handleExpenseUpdated);
    socket.on('expense:deleted', handleExpenseDeleted);
    socket.on('group:updated', handleGroupUpdated);

    return () => {
      socket.off('expense:created', handleExpenseCreated);
      socket.off('expense:updated', handleExpenseUpdated);
      socket.off('expense:deleted', handleExpenseDeleted);
      socket.off('group:updated', handleGroupUpdated);
    };
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [groupRes, expensesRes, balancesRes, settlementsRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/expenses/group/${id}`),
        api.get(`/balances/${id}`),
        api.get(`/balances/${id}/settlements`)
      ]);
      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      setBalances(balancesRes.data);
      setSettlements(settlementsRes.data.settlements);
    } catch (error) {
      toast.error('Failed to load group details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success('Expense deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group and all its expenses? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/groups/${id}`);
      toast.success('Group deleted');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to delete group');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  if (!group) return null;

  const isCreator = group.createdBy?._id === user?._id;

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost">
          <FiArrowLeft />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {group.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {group.description || 'Group expenses'}
            {socket?.connected && <FiWifi size={12} color="#34d399" title="Real-time updates active" />}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={`/groups/${id}/insights`} className="btn btn-secondary">
            <FiBarChart2 /> Insights
          </Link>
          <Link to={`/groups/${id}/add-expense`} className="btn btn-primary">
            <FiPlus /> Add Expense
          </Link>
          {isCreator && (
            <button onClick={handleDeleteGroup} className="btn btn-danger btn-sm" disabled={deleting}>
              <FiTrash2 />
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <FiDollarSign />
          </div>
          <div className="stat-value">₹{(balances?.totalExpenses || 0).toLocaleString()}</div>
          <div className="stat-label">Total Expenses</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <FiTrendingUp />
          </div>
          <div className="stat-value">{balances?.expenseCount || 0}</div>
          <div className="stat-label">Transactions</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <FiUsers />
          </div>
          <div className="stat-value">{group.members?.length || 0}</div>
          <div className="stat-label">Members</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <FiDollarSign />
          </div>
          <div className="stat-value">{settlements?.length || 0}</div>
          <div className="stat-label">Settlements Needed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
          Expenses ({expenses.length})
        </button>
        <button className={`tab ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>
          Balances
        </button>
        <button className={`tab ${activeTab === 'settlements' ? 'active' : ''}`} onClick={() => setActiveTab('settlements')}>
          Settlements ({settlements.length})
        </button>
        <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          Members ({group.members?.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <div>
          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <h3>No expenses yet</h3>
              <p>Add your first expense to start tracking shared costs.</p>
              <Link to={`/groups/${id}/add-expense`} className="btn btn-primary">
                <FiPlus /> Add First Expense
              </Link>
            </div>
          ) : (
            expenses.map(expense => (
              <div key={expense._id} className="expense-item animate-in">
                <div className="expense-icon" style={{ background: CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other }}>
                  {CATEGORY_ICONS[expense.category] || '📦'}
                </div>
                <div className="expense-info">
                  <div className="expense-desc">{expense.description}</div>
                  <div className="expense-meta">
                    Paid by <strong>{expense.paidBy?.name}</strong> • {new Date(expense.date).toLocaleDateString()} • 
                    <span className="category-tag" style={{ marginLeft: 4 }}>{expense.category}</span>
                  </div>
                </div>
                <div className="expense-amount">
                  <div className="amount">₹{expense.amount.toLocaleString()}</div>
                  <div className="split-info">{expense.splitType} split • {expense.splits?.length} people</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteExpense(expense._id)} title="Delete">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div>
          {balances?.balances?.map(b => (
            <div key={b.user._id} className="balance-card animate-in">
              <div className="balance-user">
                <div className="member-avatar" style={{ marginLeft: 0 }}>
                  {b.user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{b.user.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{b.user.email}</div>
                </div>
              </div>
              <div className={`balance-amount ${b.balance > 0 ? 'balance-positive' : b.balance < 0 ? 'balance-negative' : 'balance-zero'}`}>
                {b.balance > 0 ? '+' : ''}₹{b.balance.toLocaleString()}
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>
                  {b.balance > 0 ? 'gets back' : b.balance < 0 ? 'owes' : 'settled up'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'settlements' && (
        <div>
          {settlements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>All settled up!</h3>
              <p>Everyone is even. No payments needed.</p>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>
                Optimized to minimize the number of transactions needed:
              </p>
              {settlements.map((s, i) => (
                <div key={i} className="settlement-item animate-in">
                  <div className="settlement-from">
                    <div className="member-avatar" style={{ marginLeft: 0, margin: '0 auto var(--space-2)' }}>
                      {s.from?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 600 }}>{s.from?.name}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>pays</div>
                  </div>
                  <div className="settlement-arrow">
                    <div style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--primary-400)' }}>
                      ₹{s.amount.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ height: 2, width: 60, background: 'var(--gradient-primary)' }}></div>
                      <span style={{ color: 'var(--primary-400)' }}>→</span>
                    </div>
                  </div>
                  <div className="settlement-to">
                    <div className="member-avatar" style={{ marginLeft: 0, margin: '0 auto var(--space-2)', background: 'var(--gradient-accent)' }}>
                      {s.to?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 600 }}>{s.to?.name}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>receives</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          {group.members?.map(member => (
            <div key={member._id} className="balance-card animate-in">
              <div className="balance-user">
                <div className="member-avatar" style={{ marginLeft: 0 }}>
                  {member.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {member.name} 
                    {member._id === group.createdBy?._id && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Creator</span>}
                    {member._id === user?._id && <span className="badge badge-success" style={{ marginLeft: 8 }}>You</span>}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{member.email}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
