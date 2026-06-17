import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../../../apps/omnihub-proof/src/App';

describe('OmniHub Proof App', () => {
  it('renders the primary proof landing page content and calls to action', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'APEX OmniHub home' })).toHaveAttribute('href', '#top');
    expect(screen.getByRole('heading', { name: /connect anything\./i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Book a Discovery Call' })[0]).toHaveAttribute(
      'href',
      'https://calendly.com/apex-jr-REPLACE',
    );
    expect(screen.getByRole('link', { name: 'See How It Works' })).toHaveAttribute('href', '#proof');
    expect(screen.getByText('93,000+')).toBeInTheDocument();
    expect(screen.getByText('3,120')).toBeInTheDocument();
    expect(screen.getByText('26')).toBeInTheDocument();
    expect(screen.getByText('A-Grade')).toBeInTheDocument();
  });

  it('renders governance proof cards, deployment evidence, and contact email', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Orchestrate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Govern' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prove' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SBBL HQ' })).toBeInTheDocument();
    expect(screen.getByText('Live Since April 2, 2026')).toBeInTheDocument();
    expect(screen.getByText('Cloudflare Workers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'jr@apexbiz.ca-REPLACE' })).toHaveAttribute(
      'href',
      'mailto:jr@apexbiz.ca-REPLACE',
    );
  });
});
