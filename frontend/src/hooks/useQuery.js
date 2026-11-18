import { useState, useCallback } from 'react';
import { askQuestion as apiAskQuestion } from '../api/client';

/**
 * Hook for submitting questions and managing RAG answers.
 * @returns {{ answer: string, sources: Array, loading: boolean, error: string|null, hasResult: boolean, submit: Function, reset: Function }}
 */
export function useQuery() {
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasResult, setHasResult] = useState(false);

  const submit = useCallback(async (question) => {
    if (!question?.trim()) return;
    setLoading(true);
    setError(null);
    setHasResult(false);
    try {
      const data = await apiAskQuestion(question);
      setAnswer(data.answer ?? '');
      setSources(data.sources ?? []);
      setHasResult(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnswer('');
    setSources([]);
    setLoading(false);
    setError(null);
    setHasResult(false);
  }, []);

  return { answer, sources, loading, error, hasResult, submit, reset };
}
