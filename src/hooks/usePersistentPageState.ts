import { useEffect, useMemo, useState } from 'react';

function getStorageKey(pageKey: string, obraId?: string | null) {
  return obraId ? `obra-ui-state:${obraId}:${pageKey}` : `ui-state:${pageKey}`;
}

export function usePersistentPageState<T>(
  pageKey: string,
  initialState: T,
  obraId?: string | null
) {
  const storageKey = useMemo(
    () => getStorageKey(pageKey, obraId),
    [pageKey, obraId]
  );

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initialState;
      return JSON.parse(raw) as T;
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // noop
    }
  }, [storageKey, state]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setState(initialState);
        return;
      }
      setState(JSON.parse(raw) as T);
    } catch {
      setState(initialState);
    }
  }, [storageKey, initialState]);

  return [state, setState] as const;
}
