import { useEffect, useState } from 'react';
import { analyzeResume, getApiErrorMessage, getHistory } from '../services/api';

export default function useResumeAnalysis() {
  const [history, setHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError) || 'Unable to load analysis history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const submitResume = async (file, jobDescription) => {
    setLoading(true);
    setError('');
    try {
      console.log('[useResumeAnalysis] Submitting resume:', file.name, file.size, 'bytes');
      const data = await analyzeResume(file, jobDescription);
      console.log('[useResumeAnalysis] Analysis complete:', data);
      setCurrentAnalysis(data);
      await refreshHistory();
      return data;
    } catch (requestError) {
      let message = 'Resume analysis failed';
      try {
        if (requestError?.response) {
          const resp = requestError.response;
          const detail = getApiErrorMessage(requestError);
          message = `Request failed: ${resp.status} ${resp.statusText || ''} - ${detail}`;
        } else if (requestError?.message) {
          message = `Network error: ${requestError.message}`;
        }
      } catch (e) {
        message = 'Resume analysis failed (unable to parse error)';
      }
      console.error('[useResumeAnalysis] Error:', message, requestError);
      setError(message);
      const err = new Error(message);
      err.original = requestError;
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    history,
    currentAnalysis,
    loading,
    historyLoading,
    error,
    submitResume,
    refreshHistory,
    setCurrentAnalysis,
  };
}
