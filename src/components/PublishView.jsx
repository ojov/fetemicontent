import React, { useState } from 'react';

function PublishView({ draft, onBack, username }) {
  const [editedTitle, setEditedTitle] = useState(draft.title || '');
  const [editedContent, setEditedContent] = useState(draft.content || '');
  const [destination, setDestination] = useState('linkedin');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishStatus(null);
    setErrorMessage('');

    const payload = {
      username,
      originalDraft: draft,
      title: editedTitle,
      content: editedContent,
      destination: destination
    };

    try {
      // Placeholder webhook URL - update this to your actual n8n publish webhook
      const response = await fetch('/api/webhook-test/publish-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      setPublishStatus('success');
    } catch (err) {
      console.error(err);
      setPublishStatus('error');
      setErrorMessage(err.message || 'Failed to publish content.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="card card-lg fade-in" style={{ margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Preview & Publish</h2>
        <button className="btn btn-outline" onClick={onBack} disabled={isPublishing}>
          ← Back to Drafts
        </button>
      </div>

      {publishStatus === 'success' ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '4rem', color: 'var(--success)' }}>✓</div>
          <h3 style={{ marginTop: '1rem' }}>Successfully sent to {destination === 'linkedin' ? 'LinkedIn' : 'Newsletter'}!</h3>
          <p style={{ color: 'var(--text-muted)' }}>Your content has been queued for publishing.</p>
          <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={onBack}>
            Return to Dashboard
          </button>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">Publishing Destination</label>
            <select 
              className="form-control" 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)}
              disabled={isPublishing}
            >
              <option value="linkedin">LinkedIn</option>
              <option value="newsletter">Newsletter (Email)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Draft Title</label>
            <input 
              type="text"
              className="form-control" 
              value={editedTitle} 
              onChange={(e) => setEditedTitle(e.target.value)}
              disabled={isPublishing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Draft Content (You can edit this before publishing)</label>
            <textarea 
              className="form-control" 
              style={{ minHeight: '300px' }}
              value={editedContent} 
              onChange={(e) => setEditedContent(e.target.value)}
              disabled={isPublishing}
            />
          </div>

          {publishStatus === 'error' && (
            <div className="error-text mb-4">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          <button 
            className="btn btn-primary w-full" 
            onClick={handlePublish}
            disabled={isPublishing || !editedContent.trim()}
          >
            {isPublishing ? 'Publishing...' : `Publish to ${destination === 'linkedin' ? 'LinkedIn' : 'Newsletter'}`}
          </button>
        </>
      )}
    </div>
  );
}

export default PublishView;
