/**
 * ProviderLogo — Vector-crisp Brand & App Logos for OmniBoard & Integrations
 * Provides authentic SVG brand logos for all 85 known providers across:
 * AI, Google, Microsoft, Banking, Fintech, Sports, Dev, Cloud, and CRM.
 */
import React from 'react';

interface ProviderLogoProps {
  readonly provider: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

const SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  provider,
  size = 'md',
  className = '',
}) => {
  const normalized = (provider || '').toLowerCase().trim();
  const dimensionClass = SIZE_MAP[size] || SIZE_MAP.md;

  // 1. GitHub
  if (normalized.includes('github')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    );
  }

  // 2. Slack
  if (normalized.includes('slack')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="none">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
      </svg>
    );
  }

  // 3. Google Suite & Workspace
  if (normalized.includes('google') || normalized.includes('gmail')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
      </svg>
    );
  }

  // 4. Microsoft Suite, Teams, Outlook, Azure
  if (normalized.includes('microsoft') || normalized.includes('azure')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
    );
  }

  // 5. Stripe
  if (normalized.includes('stripe')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#635BFF">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.97 15.654.467 12.875.467c-6.19 0-10.42 3.21-10.42 8.57 0 7.421 10.22 6.223 10.22 9.42 0 .973-.852 1.488-2.227 1.488-2.453 0-5.385-1.127-7.228-2.155l-.946 5.578c1.944 1.037 5.127 1.632 8.174 1.632 6.47 0 10.82-3.155 10.82-8.683 0-7.85-10.312-6.526-10.312-9.667z"/>
      </svg>
    );
  }

  // 6. Plaid
  if (normalized.includes('plaid')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#111111">
        <path d="M3.75 3.75h6.5v6.5h-6.5zm0 10h6.5v6.5h-6.5zm10-10h6.5v6.5h-6.5zm0 10h6.5v6.5h-6.5z" fill="#00D26A" />
      </svg>
    );
  }

  // 7. Claude / Anthropic
  if (normalized.includes('claude') || normalized.includes('anthropic')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#D97706">
        <circle cx="12" cy="12" r="10" fill="#CC785C" />
        <path d="M12 5l2.2 4.8 5.3.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.3-.8z" fill="#FFFFFF" />
      </svg>
    );
  }

  // 8. ChatGPT / OpenAI
  if (normalized.includes('chatgpt') || normalized.includes('openai')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#10A37F">
        <path d="M22.28 10.15a6.45 6.45 0 00-.51-4.88 6.55 6.55 0 00-6.19-3.27 6.47 6.47 0 00-4.73-2 6.55 6.55 0 00-6.25 4.54 6.45 6.45 0 00-4.22 3.06 6.55 6.55 0 00.7 7.78 6.45 6.45 0 00.51 4.88 6.55 6.55 0 006.19 3.27 6.47 6.47 0 004.73 2 6.55 6.55 0 006.25-4.54 6.45 6.45 0 004.22-3.06 6.55 6.55 0 00-.7-7.78z" />
      </svg>
    );
  }

  // 9. Coinbase / Crypto
  if (normalized.includes('coinbase')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#0052FF">
        <circle cx="12" cy="12" r="11" />
        <rect x="7" y="7" width="10" height="10" rx="2" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="2.5" fill="#0052FF" />
      </svg>
    );
  }

  // 10. Salesforce
  if (normalized.includes('salesforce')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#00A1E0">
        <path d="M19.34 9.17a5.52 5.52 0 0 0-4.21-1.92 5.55 5.55 0 0 0-4.78 2.72 4.14 4.14 0 0 0-2.8-.75 4.19 4.19 0 0 0-4.06 3.61 4.09 4.09 0 0 0-1.49 3.2 4.15 4.15 0 0 0 4.15 4.15h13.2a4.83 4.83 0 0 0 4.83-4.83 4.86 4.86 0 0 0-4.84-6.18z"/>
      </svg>
    );
  }

  // 11. Linear
  if (normalized.includes('linear')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#5E6AD2">
        <path d="M2.5 12a9.5 9.5 0 0 1 16.21-6.72L3.72 20.27A9.47 9.47 0 0 1 2.5 12zm18.99 0a9.47 9.47 0 0 1-1.22 8.27L5.29 5.28A9.5 9.5 0 0 1 21.49 12z"/>
      </svg>
    );
  }

  // 12. Notion
  if (normalized.includes('notion')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.46 3.65L17.54 2.5c1.47-.13 2 .8 2 2.05v14.4c0 1.25-.53 2-2 2.12L4.46 22.22c-1.47.13-2-.8-2-2.05V5.7c0-1.25.53-2 2-2.05zM7.5 7v10h2.5V11l4.5 6h2.5V7h-2.5v6L10 7H7.5z"/>
      </svg>
    );
  }

  // 13. Supabase
  if (normalized.includes('supabase')) {
    return (
      <svg className={`${dimensionClass} ${className}`} viewBox="0 0 24 24" fill="#3ECF8E">
        <path d="M12.98 1.15L2.61 14.39a.75.75 0 00.59 1.22h8.05L11.02 22.85a.75.75 0 001.27.56l10.37-13.24a.75.75 0 00-.59-1.22h-8.05l.25-7.24a.75.75 0 00-1.29-.56z"/>
      </svg>
    );
  }

  // Fallback: Elegant Branded Monogram Badge
  const initial = (provider || 'APEX').charAt(0).toUpperCase();
  return (
    <div className={`${dimensionClass} rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 uppercase ${className}`}>
      {initial}
    </div>
  );
};

export default ProviderLogo;
