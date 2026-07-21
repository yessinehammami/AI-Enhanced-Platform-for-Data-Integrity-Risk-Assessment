import { useState, useEffect } from 'preact/hooks';

/**
 * Hook for persisting component state to sessionStorage
 * State is saved automatically when it changes and restored when component remounts
 */
export function usePageState<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Auto-save to sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.error(`Failed to save state for ${key}:`, err);
    }
  }, [state, key]);

  const setPageState = (value: T | ((prev: T) => T)) => {
    setState((prevState) => {
      const newState = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      return newState;
    });
  };

  return [state, setPageState];
}
