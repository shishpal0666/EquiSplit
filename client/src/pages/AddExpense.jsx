import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiZap } from 'react-icons/fi';

const AddExpense = () => {
  const { id: groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customSplits, setCustomSplits] = useState([]);
  const [splitAmong, setSplitAmong] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(true);

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}`);
      setGroup(data);
      setPaidBy(user?._id);
      // Default: split among all members
      const memberIds = data.members.map(m => m._id);
      setSplitAmong(memberIds);
      setCustomSplits(data.members.map(m => ({ user: m._id, name: m.name, amount: 0 })));
    } catch {
      toast.error('Failed to load group');
      navigate('/dashboard');
    } finally {
      setLoadingGroup(false);
    }
  };

  // AI categorization with debounce
  const categorizeWithAI = useCallback(async (desc) => {
    if (desc.length < 3) return;
    setAiCategorizing(true);
    try {
      const { data } = await api.post('/ai/categorize', { description: desc });
      setCategory(data.category);
    } catch {
      // Silently fail
    } finally {
      setAiCategorizing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (description.length >= 3) {
        categorizeWithAI(description);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [description, categorizeWithAI]);

  const handleSplitAmongToggle = (memberId) => {
    setSplitAmong(prev => {
      if (prev.includes(memberId)) {
        if (prev.length <= 1) return prev; // At least one
        return prev.filter(id => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const handleCustomSplitChange = (userId, value) => {
    setCustomSplits(prev => prev.map(s => 
      s.user === userId ? { ...s, amount: parseFloat(value) || 0 } : s
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim() || !amount || !paidBy) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description: description.trim(),
        amount: parseFloat(amount),
        group: groupId,
        paidBy,
        splitType,
        category,
        date,
        splitAmong
      };

      if (splitType === 'custom') {
        const activeSplits = customSplits.filter(s => s.amount > 0);
        payload.splits = activeSplits.map(s => ({ user: s.user, amount: s.amount }));
      }

      await api.post('/expenses', payload);
      toast.success('Expense added! 💰');
      navigate(`/groups/${groupId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const equalSplitAmount = splitAmong.length > 0 && amount 
    ? (parseFloat(amount) / splitAmong.length).toFixed(2) 
    : '0.00';

  const customTotal = customSplits.reduce((sum, s) => sum + s.amount, 0).toFixed(2);

  if (loadingGroup) {
    return (
      <div className="main-content">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: 600, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 'var(--space-4)' }}>
        <FiArrowLeft /> Back to {group?.name}
      </button>

      <div className="card-glass animate-in">
        <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
          <h1>Add Expense</h1>
          <p>Split costs with your group members</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Description with AI */}
          <div className="form-group">
            <label className="form-label" htmlFor="expense-desc">
              Description *
              {aiCategorizing && (
                <span style={{ marginLeft: 8, color: 'var(--primary-400)', fontSize: 'var(--font-xs)' }}>
                  <FiZap style={{ verticalAlign: 'middle' }} /> AI categorizing...
                </span>
              )}
            </label>
            <input
              id="expense-desc"
              type="text"
              className="form-input"
              placeholder="e.g., Dinner at restaurant, Uber ride..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={200}
            />
            <div className="form-hint">✨ AI will auto-categorize based on your description</div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label" htmlFor="expense-amount">Amount (₹) *</label>
            <input
              id="expense-amount"
              type="number"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
            />
          </div>

          {/* Paid By */}
          <div className="form-group">
            <label className="form-label" htmlFor="expense-paidby">Paid By *</label>
            <select
              id="expense-paidby"
              className="form-select"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {group?.members?.map(m => (
                <option key={m._id} value={m._id}>
                  {m.name} {m._id === user?._id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="expense-category">
              Category
              {category !== 'Other' && (
                <span className="badge badge-primary" style={{ marginLeft: 8 }}>AI suggested</span>
              )}
            </label>
            <select
              id="expense-category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {['Food', 'Travel', 'Rent', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Other'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="expense-date">Date</label>
            <input
              id="expense-date"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Split Type */}
          <div className="form-group">
            <label className="form-label">Split Type</label>
            <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
              <button type="button" className={`tab ${splitType === 'equal' ? 'active' : ''}`} onClick={() => setSplitType('equal')}>
                Equal Split
              </button>
              <button type="button" className={`tab ${splitType === 'custom' ? 'active' : ''}`} onClick={() => setSplitType('custom')}>
                Custom Split
              </button>
            </div>
          </div>

          {/* Equal Split */}
          {splitType === 'equal' && (
            <div className="form-group">
              <label className="form-label">Split Among</label>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                {group?.members?.map(m => (
                  <div key={m._id} className="split-row">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={splitAmong.includes(m._id)}
                        onChange={() => handleSplitAmongToggle(m._id)}
                        style={{ accentColor: 'var(--primary-500)' }}
                      />
                      <span className="user-info">{m.name} {m._id === user?._id ? '(You)' : ''}</span>
                    </label>
                    <span style={{ color: splitAmong.includes(m._id) ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                      ₹{splitAmong.includes(m._id) ? equalSplitAmount : '0.00'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Split */}
          {splitType === 'custom' && (
            <div className="form-group">
              <label className="form-label">
                Custom Amounts
                <span style={{ 
                  marginLeft: 8, 
                  color: Math.abs(parseFloat(customTotal) - parseFloat(amount || 0)) < 0.02 ? 'var(--accent-400)' : 'var(--danger-400)',
                  fontSize: 'var(--font-xs)'
                }}>
                  (₹{customTotal} / ₹{parseFloat(amount || 0).toFixed(2)})
                </span>
              </label>
              {customSplits.map(split => (
                <div key={split.user} className="split-row">
                  <span className="user-info">{split.name} {split.user === user?._id ? '(You)' : ''}</span>
                  <input
                    type="number"
                    className="form-input split-input"
                    value={split.amount || ''}
                    onChange={(e) => handleCustomSplitChange(split.user, e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
