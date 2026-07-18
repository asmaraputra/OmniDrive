import { lazy } from 'react';

// ponytail: auto-reload once when a lazy chunk 404s after a new deploy.
// sessionStorage flag prevents infinite reload loops.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    importFn().catch((err: Error) => {
      if (!sessionStorage.getItem('chunk-retry')) {
        sessionStorage.setItem('chunk-retry', '1');
        window.location.reload();
      }
      throw err;
    }),
  );
}
