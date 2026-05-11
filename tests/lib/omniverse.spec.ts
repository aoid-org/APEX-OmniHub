import { describe, it, expect } from 'bun:test';
import { isAgentEvent, isApexStructuredResponse } from '../../src/lib/types/omniverse';

describe('OmniVerse Type Guards', () => {
  describe('isAgentEvent', () => {
    const validEvent = {
      id: 'evt_123',
      type: 'goal_received',
      payload: {},
      timestamp: '2026-01-25T12:00:00Z',
      session_id: 'sess_456',
      sequence_id: 1,
    };

    it('should return true for a valid AgentEvent', () => {
      expect(isAgentEvent(validEvent)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isAgentEvent(null)).toBe(false);
      expect(isAgentEvent(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isAgentEvent('string')).toBe(false);
      expect(isAgentEvent(123)).toBe(false);
      expect(isAgentEvent(true)).toBe(false);
    });

    it('should return false if required fields are missing', () => {
      const { id: _, ...missingId } = validEvent;
      expect(isAgentEvent(missingId)).toBe(false);

      const { type: __, ...missingType } = validEvent;
      expect(isAgentEvent(missingType)).toBe(false);

      const { timestamp: ___, ...missingTimestamp } = validEvent;
      expect(isAgentEvent(missingTimestamp)).toBe(false);

      const { session_id: ____, ...missingSessionId } = validEvent;
      expect(isAgentEvent(missingSessionId)).toBe(false);

      const { sequence_id: _____, ...missingSequenceId } = validEvent;
      expect(isAgentEvent(missingSequenceId)).toBe(false);
    });

    it('should return false if field types are incorrect', () => {
      expect(isAgentEvent({ ...validEvent, id: 123 })).toBe(false);
      expect(isAgentEvent({ ...validEvent, type: {} })).toBe(false);
      expect(isAgentEvent({ ...validEvent, timestamp: true })).toBe(false);
      expect(isAgentEvent({ ...validEvent, session_id: null })).toBe(false);
      expect(isAgentEvent({ ...validEvent, sequence_id: '1' })).toBe(false);
    });
  });

  describe('isApexStructuredResponse', () => {
    const validResponse = {
      summary: ['Done'],
      details: [{ n: 1, finding: 'All good', source_url: 'https://apex.ai' }],
      next_actions: ['Keep going'],
      sources_used: ['Source A'],
    };

    it('should return true for a valid ApexStructuredResponse', () => {
      expect(isApexStructuredResponse(validResponse)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isApexStructuredResponse(null)).toBe(false);
      expect(isApexStructuredResponse(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isApexStructuredResponse('string')).toBe(false);
      expect(isApexStructuredResponse(123)).toBe(false);
    });

    it('should return false if required arrays are missing', () => {
      const { summary: _, ...missingSummary } = validResponse;
      expect(isApexStructuredResponse(missingSummary)).toBe(false);

      const { details: __, ...missingDetails } = validResponse;
      expect(isApexStructuredResponse(missingDetails)).toBe(false);

      const { next_actions: ___, ...missingNextActions } = validResponse;
      expect(isApexStructuredResponse(missingNextActions)).toBe(false);

      const { sources_used: ____, ...missingSourcesUsed } = validResponse;
      expect(isApexStructuredResponse(missingSourcesUsed)).toBe(false);
    });

    it('should return false if fields are not arrays', () => {
      expect(isApexStructuredResponse({ ...validResponse, summary: 'not an array' })).toBe(false);
      expect(isApexStructuredResponse({ ...validResponse, details: {} })).toBe(false);
      expect(isApexStructuredResponse({ ...validResponse, next_actions: null })).toBe(false);
      expect(isApexStructuredResponse({ ...validResponse, sources_used: 123 })).toBe(false);
    });
  });
});
