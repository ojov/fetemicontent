import React, { useState, useEffect } from 'react';
import DraftCard from './DraftCard';
import PublishView from './PublishView';

// The messages to cycle through while polling
const LOADING_MESSAGES = [
  "Parsing your request...",
  "Searching for similar content...",
  "Analyzing target audience...",
  "Structuring the content outline...",
  "Generating creative angles...",
  "Drafting initial versions...",
  "Applying SEO optimization...",
  "Refining tone and style...",
  "Finalizing your drafts..."
];

function Dashboard({ username, onLogout }) {
  const [type, setType] = useState('idea');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [error, setError] = useState('');

  // Cycle the loading message every 12 seconds
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingMessageIdx(0);
      interval = setInterval(() => {
        setLoadingMessageIdx((prev) => {
          if (prev < LOADING_MESSAGES.length - 1) {
            return prev + 1;
          }
          return prev; // Stay on the last message if taking longer
        });
      }, 12000); 
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      setError('Input must not be empty');
      return;
    }

    if (type === 'url') {
      if (!/^https?:\/\//i.test(trimmedContent)) {
        setError('URL must begin with http:// or https://');
        return;
      }
    } else if (type === 'idea') {
      if (trimmedContent.length < 15) {
        setError('Content idea must be at least 15 characters long');
        return;
      }
    }

    setError('');
    setLoading(true);
    setDrafts([]);
    setSelectedDraft(null);

    const payload = {
      username,
      type,
      input: content,
    };

    try {
      // 1. Initial Webhook Call (Triggers n8n to start the slow job)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      let initResponse;
      try {
        initResponse = await fetch('/api/webhook-test/content-input', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('The initial request timed out after 30 seconds waiting for a Job ID.');
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      let initData;
      try {
        initData = await initResponse.json();
      } catch (jsonErr) {
        if (!initResponse.ok) {
          throw new Error(`Server returned ${initResponse.status} ${initResponse.statusText}`);
        }
        throw new Error('Server returned invalid JSON or empty response.');
      }

      if (!initResponse.ok) {
        const serverError = initData?.message || initData?.error || `Server returned ${initResponse.status} ${initResponse.statusText}`;
        throw new Error(serverError);
      }

      // If n8n happens to be fast enough to respond immediately with drafts, skip polling:
      if (initData && initData.status === 'done' && Array.isArray(initData.drafts) && initData.drafts.length > 0) {
        setDrafts(initData.drafts);
        setLoading(false);
        return;
      }

      // 2. Polling Logic
      // We expect the first webhook to return a jobId
      const jobId = initData?.jobId || initData?.id || initData?.sessionId;
      
      if (!jobId) {
         throw new Error('No job ID returned from the server to track this request.');
      }

      let isDone = false;
      let pollCount = 0;
      const MAX_POLLS = 60; // 60 polls @ 6 seconds = up to 6 minutes waiting
      const POLLING_INTERVAL_MS = 6000;

      while (!isDone && pollCount < MAX_POLLS) {
        // Wait 6 seconds before asking n8n for an status update
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
        pollCount++;

        try {
          // This calls your SECOND n8n Webhook which handles the status check
          const pollResponse = await fetch('/api/webhook-test/poll-job-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jobId })
          });
          
          if (pollResponse.ok) {
            const pollData = await pollResponse.json();
            console.log('Poll response:', pollData);
          
            // Webhook 2 should return { "status": "pending" } OR { "status": "done", "drafts": [...] }
            // Support n8n payload format where status="success" and jobStatus="done"
            const isFinished = pollData.status === 'done' || pollData.status === 'success' || (pollData.jobStatus && pollData.jobStatus.includes('done'));
            if (pollData && isFinished && Array.isArray(pollData.drafts) && pollData.drafts.length > 0) {
              setDrafts(pollData.drafts);
              isDone = true;
              break;
            } else if (pollData && pollData.error) {
              // If the workflow failed and returned an error state
              throw new Error(pollData.error);
            }
          }
        } catch (pollErr) {
           console.warn(`Polling attempt ${pollCount} failed (expected if webhook drops connection):`, pollErr);
           // We do not throw here so the loop can retry next time, unless it's a fatal application error.
        }
      }

      if (!isDone) {
        throw new Error('Draft generation timed out. Please try again.');
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating drafts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (draft) => {
    const textToCopy = `${draft.title || 'Draft'}\n\n${draft.content}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('Draft copied to clipboard!'))
      .catch((err) => console.error('Failed to copy: ', err));
  };

  return (
    <div className="dashboard-container fade-in">
      <header className="header">
        <div>
          <h1 style={{ marginBottom: 0 }}>Fetemi Content Studios</h1>
          <p style={{ color: 'var(--text-muted)' }}>Logged in as <strong style={{color: '#fff'}}>{username}</strong></p>
        </div>
        <button onClick={onLogout} className="btn btn-outline">Logout</button>
      </header>

      {!selectedDraft && (
        <div className="card card-lg fade-in" style={{ margin: '0 auto' }}>
          <h2>Create New Content</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Input Type</label>
            <select 
              className="form-control" 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              disabled={loading}
            >
              <option value="idea">Idea</option>
              <option value="url">URL</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {type === 'idea' ? 'Content Idea' : 'Content URL'}
            </label>
            <textarea 
              className="form-control" 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder={type === 'idea' ? 'Enter your content idea...' : 'Paste a URL...'}
              disabled={loading}
              required
            />
          </div>

          {error && <div className="error-text mb-4">{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary w-full" 
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Generate Drafts'}
          </button>
        </form>
      </div>
      )}

      {loading && (
        <div className="loading-container fade-in">
          <div className="spinner"></div>
          {/* Dynamically rotating loading messages hidden from the actual network state */}
          <h3 className="fade-in" key={loadingMessageIdx}>
            {LOADING_MESSAGES[loadingMessageIdx]}
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>This may take up to 6 minutes. Please do not refresh the page.</p>
        </div>
      )}

      {!selectedDraft && !loading && drafts.length > 0 && (
        <div className="fade-in">
          <h2 style={{ marginTop: '3rem', textAlign: 'center' }}>Generated Drafts</h2>
          <div className="drafts-grid">
            {drafts.map((draft, idx) => (
              <DraftCard 
                key={idx} 
                draft={draft}
                isSelected={selectedDraft === draft}
                onSelect={setSelectedDraft}
                onCopy={handleCopy}
              />
            ))}
          </div>
        </div>
      )}

      {selectedDraft && (
        <div style={{ marginTop: '2rem' }}>
          <PublishView 
            draft={selectedDraft} 
            username={username}
            onBack={() => setSelectedDraft(null)} 
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
