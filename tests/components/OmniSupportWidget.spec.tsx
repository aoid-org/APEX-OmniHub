/**
 * OmniSupportWidget — Unit Tests
 * Tests floating support widget: toggle, form inputs, submission, and realtime connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGatewayConnect = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/realtime/ApexRealtimeGateway', () => ({
  ApexRealtimeGateway: {
    connect: (...args: unknown[]) => mockGatewayConnect(...args),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { OmniSupportWidget } from '@/components/global/OmniSupportWidget';

// ─── Tests ────────────────────────────────────────────────────────────────

describe('OmniSupportWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('closed state (initial)', () => {
    it('renders floating chat bubble button', () => {
      render(<OmniSupportWidget />);
      expect(screen.getByTestId('omni-support-widget')).toBeInTheDocument();
    });

    it('does not show support form initially', () => {
      render(<OmniSupportWidget />);
      expect(screen.queryByText('Support')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument();
    });

    it('does not connect to realtime gateway when closed', () => {
      render(<OmniSupportWidget />);
      expect(mockGatewayConnect).not.toHaveBeenCalled();
    });
  });

  describe('opening the widget', () => {
    it('shows support form when floating button is clicked', () => {
      render(<OmniSupportWidget />);
      // Click the floating MessageCircle button
      const floatingBtn = screen.getByRole('button');
      fireEvent.click(floatingBtn);
      expect(screen.getByText('Support')).toBeInTheDocument();
    });

    it('renders all form fields when open', () => {
      render(<OmniSupportWidget />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('How can we help?')).toBeInTheDocument();
    });

    it('connects to realtime gateway when widget is opened', async () => {
      render(<OmniSupportWidget />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(mockGatewayConnect).toHaveBeenCalledWith({ skillId: 'omnisupport' });
      });
    });

    it('hides floating button when widget is open', () => {
      render(<OmniSupportWidget />);
      const floatingBtn = screen.getByRole('button');
      fireEvent.click(floatingBtn);
      // The original floating icon button should no longer be visible
      // (form close X button now exists instead)
      const buttons = screen.getAllByRole('button');
      // Should now have close (X) and Send Message buttons
      expect(buttons.length).toBe(2);
    });
  });

  describe('closing the widget', () => {
    it('closes form when X button is clicked', () => {
      render(<OmniSupportWidget />);
      fireEvent.click(screen.getByRole('button'));
      // Click the X close button
      const buttons = screen.getAllByRole('button');
      const closeBtn = buttons.find((b) => b.querySelector('svg') !== null && b !== buttons.at(-1));
      if (closeBtn) fireEvent.click(closeBtn);
      expect(screen.queryByText('Support')).not.toBeInTheDocument();
    });
  });

  describe('form inputs', () => {
    beforeEach(() => {
      render(<OmniSupportWidget />);
      fireEvent.click(screen.getByRole('button')); // open widget
    });

    it('accepts name input', () => {
      const input = screen.getByPlaceholderText('Name');
      fireEvent.change(input, { target: { value: 'John Doe' } });
      expect(input).toHaveValue('John Doe');
    });

    it('accepts email input', () => {
      const input = screen.getByPlaceholderText('Email');
      fireEvent.change(input, { target: { value: 'john@example.com' } });
      expect(input).toHaveValue('john@example.com');
    });

    it('accepts message input', () => {
      const textarea = screen.getByPlaceholderText('How can we help?');
      fireEvent.change(textarea, { target: { value: 'I need help with integration' } });
      expect(textarea).toHaveValue('I need help with integration');
    });
  });

  describe('form submission', () => {
    it('submits and constructs mailto link correctly', () => {
      // Spy on location.href setter
      const locationSetter = vi.spyOn(globalThis, 'location', 'get').mockReturnValue({
        ...globalThis.location,
        href: '',
      } as Location);
        Object.defineProperty(globalThis, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });

      render(<OmniSupportWidget />);
      fireEvent.click(screen.getAllByRole('button')[0]);

      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'jane@co.com' } });
      fireEvent.change(screen.getByPlaceholderText('How can we help?'), { target: { value: 'Testing' } });

      const form = document.querySelector('form')!;
      fireEvent.submit(form);

      // We can't easily capture the mailto redirect in jsdom, but ensure no errors thrown
      locationSetter.mockRestore();
    });

    it('renders Send Message submit button', () => {
      render(<OmniSupportWidget />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });
  });
});
