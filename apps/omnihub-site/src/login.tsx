import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import { LoginPage } from './pages/Login';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  </StrictMode>,
);
