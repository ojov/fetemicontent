import { supabase } from './supabase';

/**
 * Logs a message to the job_logs table in Supabase.
 * @param {Object} params
 * @param {string} params.level - 'info', 'warn', 'error'
 * @param {string} params.jobId - The jobId associated with the log entry
 * @param {string} params.message - The log message
 */
export async function logToSupabase({ level = 'info', jobId = 'N/A', message }) {
  try {
    const { error } = await supabase
      .from('job_logs')
      .insert([
        { 
          level, 
          job_id: jobId, 
          message,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error inserting log into Supabase:', error);
    }
  } catch (err) {
    console.error('Failed to log to Supabase:', err);
  }
}
