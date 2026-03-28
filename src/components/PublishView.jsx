import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import useStickyState from '../utils/useStickyState';

function PublishView({ draft, onBack, onStartOver, username }) {
  const dId = draft.id || draft.draftId || 'unknown';

  // Phase 1 (Adaptation) states
  const [step, setStep] = useStickyState('adapt', `fetemi_pv_step_${dId}`); // 'adapt' | 'review'
  const [editedTitle, setEditedTitle] = useStickyState(draft.title || '', `fetemi_pv_title_${dId}`);
  const [editedContent, setEditedContent] = useStickyState(draft.content || '', `fetemi_pv_content_${dId}`);
  const [intendedAction, setIntendedAction] = useStickyState('publish', `fetemi_pv_action_${dId}`);
  
  // Phase 2 (Review) states
  const [adaptedLinkedIn, setAdaptedLinkedIn] = useStickyState('', `fetemi_pv_ali_${dId}`);
  const [adaptedNewsletter, setAdaptedNewsletter] = useStickyState('', `fetemi_pv_anl_${dId}`);
  const [linkedinAdaptationId, setLinkedinAdaptationId] = useStickyState(null, `fetemi_pv_laid_${dId}`);
  const [newsletterAdaptationId, setNewsletterAdaptationId] = useStickyState(null, `fetemi_pv_naid_${dId}`);
  const [newsletterSubject, setNewsletterSubject] = useStickyState('', `fetemi_pv_nsub_${dId}`);
  const [newsletterPreview, setNewsletterPreview] = useStickyState('', `fetemi_pv_nprev_${dId}`);
  const [newsletterEmails, setNewsletterEmails] = useStickyState('', `fetemi_pv_nemails_${dId}`);
  const [activeTab, setActiveTab] = useStickyState('linkedin', `fetemi_pv_tab_${dId}`); // 'linkedin' | 'newsletter'
  const [scheduledAt, setScheduledAt] = useStickyState('', `fetemi_pv_sch_${dId}`);

  // Loading & Error states
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdapt = async () => {
    setIsProcessing(true);
    setStatus(null);
    setErrorMessage('');

    const payload = {
      username,
      jobId: draft.jobId || 'unknown_job',
      draftId: draft.id || draft.draftId || 'unknown_id',
      title: editedTitle,
      content: editedContent,
      action: intendedAction // 'publish' or 'schedule'
    };

    try {
      // 1. Send the draft to be adapted for platforms
      const n8nBaseUrl = import.meta.env.VITE_N8N_BASE_URL;
      if (!n8nBaseUrl) throw new Error('VITE_N8N_BASE_URL environment variable is not defined.');
      const response = await fetch(`${n8nBaseUrl}/webhook/draft-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      console.log(response);
      
      let data = await response.json();
      
      // Some n8n webhooks double-stringify their JSON bodies
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.warn('Could not parse inner stringified JSON.');
        }
      }
      
      let linkedinData = 'No LinkedIn adaptation returned.';
      let newsletterData = 'No Newsletter adaptation returned.';

      // Support direct array, or nested array inside { adaptations: [...] }
      const adaptationsArray = Array.isArray(data) ? data : (data?.adaptations || []);

      if (adaptationsArray.length > 0) {
        const li = adaptationsArray.find(d => d.platform === 'linkedin');
        const nl = adaptationsArray.find(d => d.platform === 'newsletter');

        if (li) {
          if (li.id) setLinkedinAdaptationId(li.id);
          if (li.content) linkedinData = li.content;
        }
        
        if (nl) {
          if (nl.id) setNewsletterAdaptationId(nl.id);
          if (nl.title || nl.subject) setNewsletterSubject(nl.title || nl.subject);
          if (nl.preview_text) setNewsletterPreview(nl.preview_text);
          if (nl.emails) setNewsletterEmails(Array.isArray(nl.emails) ? nl.emails.join(', ') : nl.emails);
          if (nl.content) newsletterData = nl.content;
        }
      } else {
        // Fallback just in case it's in the old flat format
        if (data?.linkedin) {
          linkedinData = data.linkedin;
          if (data?.linkedin_id) setLinkedinAdaptationId(data.linkedin_id);
        }
        if (data?.newsletter) {
          newsletterData = data.newsletter;
          if (data?.newsletter_id) setNewsletterAdaptationId(data.newsletter_id);
          if (data?.newsletter_subject) setNewsletterSubject(data.newsletter_subject);
          if (data?.newsletter_preview) setNewsletterPreview(data.newsletter_preview);
          if (data?.newsletter_emails) setNewsletterEmails(Array.isArray(data.newsletter_emails) ? data.newsletter_emails.join(', ') : data.newsletter_emails);
        }
      }
      
      setAdaptedLinkedIn(linkedinData);
      setAdaptedNewsletter(newsletterData);
      
      // Move to review step
      setStep('review');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to adapt content.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalAction = async (finalActionType) => {
    // finalActionType: 'publish_immediately' | 'schedule' | 'save'
    setIsProcessing(true);
    setStatus(null);
    setErrorMessage('');

    // Send the currently active platform and its adaptation
    const payload = {
      username,
      jobId: draft.jobId || 'unknown_job',
      draftId: draft.id || draft.draftId || 'unknown_id',
      adaptationId: activeTab === 'linkedin' ? linkedinAdaptationId : newsletterAdaptationId,
      platform: activeTab,
      editedContent: activeTab === 'linkedin' ? adaptedLinkedIn : adaptedNewsletter,
      action: finalActionType
    };

    if (activeTab === 'newsletter') {
      const emailList = newsletterEmails.split(/[,\s\t]+/).map(e => e.trim()).filter(Boolean);
      
      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emailList.filter(email => !emailRegex.test(email));

      if (finalActionType !== 'save' && emailList.length === 0) {
        setIsProcessing(false);
        setStatus('error');
        setErrorMessage('Please provide at least one email address for the newsletter.');
        return;
      }

      if (invalidEmails.length > 0) {
        setIsProcessing(false);
        setStatus('error');
        setErrorMessage(`Invalid email(s) found: ${invalidEmails.join(', ')}`);
        return;
      }

      payload.subject = newsletterSubject;
      payload.preview_text = newsletterPreview;
      payload.emails = emailList;
    }

    if (finalActionType === 'schedule') {
      payload.scheduled_at = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    }

    try {
      if (finalActionType === 'save') {
        const adaptationRow = {
          draft_id: draft.id || draft.draftId || 'unknown_id',
          platform: activeTab,
          title: activeTab === 'newsletter' ? newsletterSubject || null : editedTitle || null,
          preview_text: activeTab === 'newsletter' ? newsletterPreview || null : null,
          content: activeTab === 'linkedin' ? adaptedLinkedIn : adaptedNewsletter,
          status: 'saved',
          updated_at: new Date().toISOString()
        };

        const adaptationId = activeTab === 'linkedin' ? linkedinAdaptationId : newsletterAdaptationId;

        let saveError;

        if (adaptationId) {
          const { error } = await supabase
            .from('adaptations')
            .update(adaptationRow)
            .eq('id', adaptationId);

          saveError = error;
        } else {
          const { data, error } = await supabase
            .from('adaptations')
            .insert(adaptationRow)
            .select('id')
            .single();

          if (!error && data?.id) {
            if (activeTab === 'linkedin') {
              setLinkedinAdaptationId(data.id);
            } else {
              setNewsletterAdaptationId(data.id);
            }
          }

          saveError = error;
        }

        if (saveError) {
          throw saveError;
        }

        setStatus('success');
        setIsProcessing(false);
        return;
      }

      // Hit the n8n publish-decision webhook
      const n8nBaseUrl = import.meta.env.VITE_N8N_BASE_URL;
      if (!n8nBaseUrl) throw new Error('VITE_N8N_BASE_URL environment variable is not defined.');
      const response = await fetch(`${n8nBaseUrl}/webhook/publish-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to complete action.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card card-lg fade-in" style={{ margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>{step === 'adapt' ? 'Adapt Content' : 'Review Adaptations'}</h2>
        <button className="btn btn-outline" onClick={step === 'review' ? () => { setStep('adapt'); setStatus(null); } : onBack} disabled={isProcessing}>
          ← {step === 'review' ? 'Back to Editor' : 'Back to Drafts'}
        </button>
      </div>

      {status === 'success' ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '4rem', color: 'var(--success)' }}>✓</div>
          <h3 style={{ marginTop: '1rem' }}>Success!</h3>
          <p style={{ color: 'var(--text-muted)' }}>Action completed for {activeTab === 'linkedin' ? 'LinkedIn' : 'Newsletter'}.</p>
          <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={onStartOver}>
            Return to Dashboard
          </button>
        </div>
      ) : (
        <>
          {step === 'adapt' && (
            <div className="fade-in">
              <div className="form-group">
                <label className="form-label">Intended Action</label>
                <select 
                  className="form-control" 
                  value={intendedAction} 
                  onChange={(e) => setIntendedAction(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="publish">Publish</option>
                  <option value="schedule">Schedule</option>
                </select>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                  The AI uses this to adapt phrasing appropriately.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Draft Title</label>
                <input 
                  type="text"
                  className="form-control" 
                  value={editedTitle} 
                  onChange={(e) => setEditedTitle(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Base Content (Edit before adapting)</label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '300px' }}
                  value={editedContent} 
                  onChange={(e) => setEditedContent(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              {status === 'error' && (
                <div className="error-text mb-4">
                  <strong>Error:</strong> {errorMessage}
                </div>
              )}

              <button 
                className="btn btn-primary w-full" 
                onClick={handleAdapt}
                disabled={isProcessing || !editedContent.trim()}
              >
                {isProcessing ? 'Adapting for platforms...' : 'Adapt Content'}
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="fade-in">
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <button 
                  className={`btn ${activeTab === 'linkedin' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setActiveTab('linkedin')}
                >
                  LinkedIn
                </button>
                <button 
                  className={`btn ${activeTab === 'newsletter' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setActiveTab('newsletter')}
                >
                  Newsletter
                </button>
              </div>

              {activeTab === 'newsletter' && (
                <>
                  <div className="form-group mb-4" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Email Subject</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newsletterSubject} 
                      onChange={(e) => setNewsletterSubject(e.target.value)} 
                      disabled={isProcessing} 
                    />
                  </div>
                  <div className="form-group mb-4" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Preview Text</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newsletterPreview} 
                      onChange={(e) => setNewsletterPreview(e.target.value)} 
                      disabled={isProcessing} 
                    />
                  </div>
                  <div className="form-group mb-4" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Recipient Emails</label>
                    <textarea 
                      className="form-control" 
                      value={newsletterEmails} 
                      onChange={(e) => setNewsletterEmails(e.target.value)} 
                      placeholder="e.g. subscriber1@example.com, john@doe.com"
                      disabled={isProcessing} 
                    />
                    <small style={{ color: 'var(--text-muted)' }}>Separated by commas, spaces, or tabs.</small>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">
                  Review & Finalize {activeTab === 'linkedin' ? 'LinkedIn' : 'Newsletter'} Post
                </label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '350px' }}
                  value={activeTab === 'linkedin' ? adaptedLinkedIn : adaptedNewsletter} 
                  onChange={(e) => {
                    if (activeTab === 'linkedin') setAdaptedLinkedIn(e.target.value);
                    else setAdaptedNewsletter(e.target.value);
                  }}
                  disabled={isProcessing}
                />
              </div>

              {status === 'error' && (
                <div className="error-text mb-4">
                  <strong>Error:</strong> {errorMessage}
                </div>
              )}

              {intendedAction === 'schedule' && (
                <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                  <label className="form-label">Schedule Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)}
                    disabled={isProcessing} 
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => handleFinalAction('save')}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Save Adaptation'}
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleFinalAction(intendedAction === 'publish' ? 'publish_immediately' : 'schedule')}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : (intendedAction === 'publish' ? 'Publish Immediately' : 'Schedule Now')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PublishView;
