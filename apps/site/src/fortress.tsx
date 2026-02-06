import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FortressPage } from './pages/Fortress';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FortressPage />
  </StrictMode>
);
