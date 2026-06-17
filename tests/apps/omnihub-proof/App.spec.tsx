import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../../../apps/omnihub-proof/src/App'

describe('OmniHub Proof App', () => {
  it('renders the hero, navigation, and primary calls to action', () => {
    render(<App />)

    expect(screen.getByLabelText('APEX OmniHub home')).toHaveAttribute('href', '#top')
    expect(screen.getByText('Connect anything.')).toBeInTheDocument()
    expect(screen.getByText('Orchestrate everything.')).toBeInTheDocument()
    expect(screen.getByText('Stay in control.')).toBeInTheDocument()
    expect(screen.getByText(/governed automation control plane/i)).toBeInTheDocument()

    const bookingLinks = screen.getAllByRole('link', { name: /book/i })
    expect(bookingLinks).toHaveLength(3)
    bookingLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://calendly.com/apex-jr-REPLACE')
    })
    expect(screen.getByRole('link', { name: 'See How It Works' })).toHaveAttribute('href', '#proof')
  })

  it('renders proof metrics and orchestration capability cards', () => {
    render(<App />)

    const proofSection = document.querySelector('#proof')
    expect(proofSection).not.toBeNull()
    const proof = within(proofSection as HTMLElement)
    expect(proof.getByText('93,000+')).toBeInTheDocument()
    expect(proof.getByText('Lines of Production Code')).toBeInTheDocument()
    expect(proof.getByText('3,120')).toBeInTheDocument()
    expect(proof.getByText('Automated Tests')).toBeInTheDocument()
    expect(proof.getByText('26')).toBeInTheDocument()
    expect(proof.getByText('Release Gates Tracked')).toBeInTheDocument()
    expect(proof.getByText('Evidence')).toBeInTheDocument()
    expect(proof.getByText('Security · Reliability · Maintainability Signals')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Orchestrate' })).toBeInTheDocument()
    expect(screen.getByText(/OmniRoute dispatches every action/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Govern' })).toBeInTheDocument()
    expect(screen.getByText(/Guardian PDP enforces policy/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prove' })).toBeInTheDocument()
    expect(screen.getByText(/Release evidence is tracked through CI/i)).toBeInTheDocument()
  })

  it('renders live deployment proof, tags, and contact link', () => {
    render(<App />)

    expect(screen.getByText('Live Deployment')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Operational proof under review.' })).toBeInTheDocument()
    expect(screen.getByText('A focused proof package for reviewing deployment, payments, entitlement, and operational-readiness evidence.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'SBBL HQ' })).toBeInTheDocument()
    expect(screen.getByText('Evidence Review')).toBeInTheDocument()
    expect(screen.getByText(/Basketball operations reference architecture/i)).toBeInTheDocument()

    for (const tag of ['Cloudflare Workers', 'Supabase', 'Stripe', 'PWA', 'Operational Evidence']) {
      expect(screen.getByText(tag)).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: 'jr@apexbiz.ca-REPLACE' })).toHaveAttribute(
      'href',
      'mailto:jr@apexbiz.ca-REPLACE',
    )
  })
})
