import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { createDebugLogger } from './lib/debug-logger';
import { OmniDashLayout } from '../apps/omnihub-site/src/layouts/OmniDashLayout';

const log = createDebugLogger('main.tsx', 'A');

log('App render entry', {
  hasRoot: !!document.getElementById('root'),
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  log('Root element not found');
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

root.render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <BrowserRouter>
      <Routes>
        <Route path="/omnidash/*" element={<OmniDashLayout />} />
        <Route path="*" element={<Navigate to="/omnidash" replace />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>,
);

log('App render complete');
