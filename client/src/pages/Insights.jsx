import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiZap, FiRefreshCw } from 'react-icons/fi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316'
];

const Insights = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [group, setGroup] = useState(null);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [groupRes, insightsRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.post(`/ai/insights/${groupId}`)
      ]);
      setGroup(groupRes.data);
      setInsights(insightsRes.data.insights || []);
      setStats(insightsRes.data.stats || null);
    } catch (error) {
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  // Chart data
  const categoryData = stats?.categoryBreakdown ? {
    labels: Object.keys(stats.categoryBreakdown),
    datasets: [{
      data: Object.values(stats.categoryBreakdown),
      backgroundColor: CHART_COLORS.slice(0, Object.keys(stats.categoryBreakdown).length),
      borderColor: 'transparent',
      borderWidth: 0,
    }]
  } : null;

  const memberData = stats?.memberSpending ? {
    labels: Object.keys(stats.memberSpending),
    datasets: [{
      label: 'Amount Paid (₹)',
      data: Object.values(stats.memberSpending),
      backgroundColor: CHART_COLORS.slice(0, Object.keys(stats.memberSpending).length).map(c => c + '40'),
      borderColor: CHART_COLORS.slice(0, Object.keys(stats.memberSpending).length),
      borderWidth: 2,
      borderRadius: 8,
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: (ctx) => `₹${ctx.parsed.toLocaleString() || ctx.raw.toLocaleString()}`
        }
      }
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter' } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { 
          color: '#94a3b8', 
          font: { family: 'Inter' },
          callback: (val) => `₹${val}`
        }
      }
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <button onClick={() => navigate(`/groups/${groupId}`)} className="btn btn-ghost">
          <FiArrowLeft />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <FiZap style={{ WebkitTextFillColor: 'initial', color: '#f59e0b' }} /> AI Spending Insights
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{group?.name} — powered by AI analytics</p>
        </div>
        <button onClick={() => fetchData(true)} className="btn btn-secondary" disabled={refreshing}>
          <FiRefreshCw className={refreshing ? 'spinning' : ''} /> Refresh
        </button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid-3" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="stat-card animate-in">
            <div className="stat-value">₹{(stats.totalAmount || 0).toLocaleString()}</div>
            <div className="stat-label">Total Spending</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-value">₹{(stats.avgExpense || 0).toLocaleString()}</div>
            <div className="stat-label">Average Expense</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-value">{stats.expenseCount || 0}</div>
            <div className="stat-label">Total Transactions</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
          {categoryData && (
            <div className="chart-container animate-in">
              <h3>Category Breakdown</h3>
              <div style={{ maxWidth: 300, margin: '0 auto' }}>
                <Pie data={categoryData} options={chartOptions} />
              </div>
            </div>
          )}
          {memberData && (
            <div className="chart-container animate-in">
              <h3>Member Contributions</h3>
              <Bar data={memberData} options={barOptions} />
            </div>
          )}
        </div>
      )}

      {/* AI Insights */}
      <div className="section-header">
        <h2><FiZap style={{ color: '#f59e0b', verticalAlign: 'middle' }} /> AI-Generated Insights</h2>
      </div>

      {insights.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h3>No insights yet</h3>
          <p>Add more expenses to get AI-powered spending insights and recommendations.</p>
        </div>
      ) : (
        insights.map((insight, i) => (
          <div key={i} className="insight-card animate-in">
            <p>{insight}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default Insights;
