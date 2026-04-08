import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FiSearch, FiX, FiArrowLeft } from 'react-icons/fi';

const CreateGroup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (email) => {
    setSearchEmail(email);
    if (email.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data } = await api.get(`/auth/users/search?email=${email}`);
      // Filter out already added members
      const filtered = data.filter(u => !members.some(m => m._id === u._id));
      setSearchResults(filtered);
    } catch {
      // Silently fail search
    } finally {
      setSearching(false);
    }
  };

  const addMember = (member) => {
    setMembers([...members, member]);
    setSearchEmail('');
    setSearchResults([]);
  };

  const removeMember = (memberId) => {
    setMembers(members.filter(m => m._id !== memberId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/groups', {
        name: name.trim(),
        description: description.trim(),
        members: members.map(m => m._id)
      });
      toast.success('Group created! 🎉');
      navigate(`/groups/${data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: 600, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 'var(--space-4)' }}>
        <FiArrowLeft /> Back
      </button>

      <div className="card-glass animate-in">
        <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
          <h1>Create New Group</h1>
          <p>Add members by searching their email</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="group-name">Group Name *</label>
            <input
              id="group-name"
              type="text"
              className="form-input"
              placeholder="e.g., Weekend Trip, Apartment Rent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="group-desc">Description</label>
            <textarea
              id="group-desc"
              className="form-textarea"
              placeholder="What's this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Members</label>
            
            {/* Current user chip */}
            <div className="member-chips" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="member-chip">
                {user?.name} (You)
              </div>
              {members.map(member => (
                <div key={member._id} className="member-chip">
                  {member.name}
                  <button type="button" onClick={() => removeMember(member._id)}>
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="search-container">
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search members by email..."
                  value={searchEmail}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
                <FiSearch style={{ 
                  position: 'absolute', 
                  left: 12, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)', 
                  fontSize: 16 
                }} />
              </div>

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(u => (
                    <div key={u._id} className="search-result-item" onClick={() => addMember(u)}>
                      <div>
                        <div className="user-name">{u.name}</div>
                        <div className="user-email">{u.email}</div>
                      </div>
                      <span className="badge badge-primary">Add</span>
                    </div>
                  ))}
                </div>
              )}
              
              {searching && (
                <div className="search-results" style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Searching...
                </div>
              )}

              {searchEmail.length >= 2 && searchResults.length === 0 && !searching && (
                <div className="search-results" style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                  No users found. They need to register first.
                </div>
              )}
            </div>
            <div className="form-hint">Members must have an account. They can register and you can add them later.</div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
