// API client hooks for plugin data
import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/plugin/product-autopilot';

interface UseApiOptions<T> {
  params?: Record<string, string>;
  skip?: boolean;
}

export function useApi<T>(endpoint: string, options: UseApiOptions<T> = {}): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const refetch = useCallback(() => setKey(k => k + 1), []);

  useEffect(() => {
    if (options.skip) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(endpoint, API_BASE);
        if (options.params) {
          Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [endpoint, key, options.skip]);

  return { data, loading, error, refetch };
}

// Hook for calling plugin tools
export function usePluginTool<TInput, TResult>(
  toolName: string
): {
  call: (input: TInput) => Promise<TResult>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (input: TInput): Promise<TResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Tool error: ${res.status}`);
      return await res.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toolName]);

  return { call, loading, error };
}
