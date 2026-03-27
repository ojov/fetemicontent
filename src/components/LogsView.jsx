import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

function LogsView({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        // Calculate timestamp for 3 hours ago
        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
        const isoThreshold = threeHoursAgo.toISOString();

        const { data, error: sbError } = await supabase
          .from('job_logs')
          .select('*')
          .gte('created_at', isoThreshold)
          .order('created_at', { ascending: false });

        if (sbError) {
          throw sbError;
        }

        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  // Format date helper
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="card card-lg fade-in" style={{ margin: '0 auto', maxWidth: '1000px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>System Logs (Last 3 Hours)</h2>
        <button className="btn btn-outline" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>

      {error && <div className="error-text mb-4">{error}</div>}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Fetching logs from Supabase...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No logs found in the last 3 hours.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Time</th>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Level</th>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Job ID</th>
                  <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ 
                        backgroundColor: log.level === 'error' ? 'var(--error)' : 
                                       log.level === 'warn' ? '#F59E0B' : 'var(--primary)' 
                      }}>
                        {log.level}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--secondary)' }}>
                      {log.job_id}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {log.message}
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

export default LogsView;
