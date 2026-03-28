import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

function AdminDashboard({ onBack }) {
  const [adaptations, setAdaptations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('desc'); // 'desc' or 'asc'

  useEffect(() => {
    fetchAdaptations();
  }, [statusFilter, dateFilter]);

  async function fetchAdaptations() {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('adaptations')
        .select('*');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order('created_at', { ascending: dateFilter === 'asc' });

      const { data, error: sbError } = await query;

      if (sbError) throw sbError;
      setAdaptations(data || []);
    } catch (err) {
      console.error('Error fetching adaptations:', err);
      setError('Failed to load adaptations.');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="card card-lg fade-in" style={{ margin: '0 auto', width: '100%', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Admin Dashboard - Adaptations</h2>
        <button className="btn btn-outline" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap',
        padding: '1rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)'
      }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
          <label className="form-label">Status Filter</label>
          <select 
            className="form-control" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="saved">Saved</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
          <label className="form-label">Sort by Date</label>
          <select 
            className="form-control" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-outline" onClick={fetchAdaptations} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-text mb-4">{error}</div>}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading adaptations...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {adaptations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No adaptations found matching the criteria.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Created At</th>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Platform</th>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Title/Subject</th>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {adaptations.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ backgroundColor: item.platform === 'linkedin' ? '#0077b5' : '#ff4500' }}>
                        {item.platform}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title || '(No Title)'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ 
                        backgroundColor: item.status === 'published' ? 'var(--success)' : 
                                       item.status === 'scheduled' ? 'var(--secondary)' : 
                                       'var(--text-muted)' 
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '300px' }}>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: 'var(--text-muted)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {item.content}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
