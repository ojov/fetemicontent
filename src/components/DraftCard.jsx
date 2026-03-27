import React from 'react';
import ReactMarkdown from 'react-markdown';

function DraftCard({ draft, isSelected, onSelect, onCopy }) {
  return (
    <div className={`card draft-card fade-in ${isSelected ? 'selected' : ''}`}>
      {draft.angle && (
        <div style={{ marginBottom: '0.5rem' }}>
          <span className="badge">{draft.angle} Angle</span>
        </div>
      )}
      <h3>{draft.title || 'Generated Draft'}</h3>
      <div className="draft-content markdown-body">
        <ReactMarkdown>
          {draft.preview ? draft.preview : draft.content}
        </ReactMarkdown>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
          onClick={() => onSelect(draft)}
        >
          {isSelected ? 'Selected' : 'Select Draft'}
        </button>
        <button 
          className="btn btn-outline"
          onClick={() => onCopy(draft)}
          title="Copy to clipboard"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

export default DraftCard;
