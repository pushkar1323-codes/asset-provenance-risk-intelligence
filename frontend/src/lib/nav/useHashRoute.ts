import { useCallback, useEffect, useState } from 'react';
import { parseHash, toHash, type ViewId } from './nav.js';

/** Minimal hash-based routing: no dependency, and reloads land on the same view. */
export const useHashRoute = (): { view: ViewId; navigate: (id: ViewId) => void } => {
  const [view, setView] = useState<ViewId>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setView(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id: ViewId) => {
    window.location.hash = toHash(id);
  }, []);

  return { view, navigate };
};
