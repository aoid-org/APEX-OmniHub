import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LoginPage } from './pages/Login';
import './styles/theme.css';
import './styles/components.css';

if (typeof document !== 'undefined') {
  if (typeof document !== 'undefined') {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LoginPage />
    </StrictMode>
  );
}
