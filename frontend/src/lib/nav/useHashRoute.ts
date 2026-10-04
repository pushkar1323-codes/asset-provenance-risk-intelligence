import { useCallback, useEffect, useState } from 'react';
import { parseRoute, toHash, type Route, type ViewId } from './nav.js';

/** Minimal hash-based routing: no dependency, and reloads land on the same view. */
export const useHashRoute = (): Route & { navigate: (id: ViewId, param?: string) => void } => {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id: ViewId, param?: string) => {
    window.location.hash = toHash(id, param);
  }, []);

  return { ...route, navigate };
};
