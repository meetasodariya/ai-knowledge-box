import { useState, useEffect, useCallback } from 'react';
import { fetchItems as apiFetchItems } from '../api/client';

/**
 * Hook for fetching and managing knowledge base items.
 * @returns {{ items: Array, total: number, loading: boolean, error: string|null, refresh: Function }}
 */
export function useItems() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (limit = 20, offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchItems(limit, offset);
      setItems(data.items ?? data);
      setTotal(data.total ?? (data.items ?? data).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { items, total, loading, error, refresh };
}
