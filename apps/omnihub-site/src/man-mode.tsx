import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ManModePage } from './pages/ManMode';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ManModePage />
  </StrictMode>
);
