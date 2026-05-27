/**
 * useAgentRecording — Hook Tests
 * @module tests/omnidash/use-agent-recording.spec
 *
 * OMNI-TEST UNIVERSAL — AAA pattern enforced.
 * Covers: initial state, startRecording success, microphone denial error,
 * stopRecording, handleToggleRecording, timer cleanup on unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAgentRecording } from '@/dashboard/components/DashboardOverview/hooks/useAgentRecording';

// ── MediaRecorder stub ────────────────────────────────────────────────────────
const mockStop = vi.fn();
const mockStart = vi.fn();

class MockMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  onstop: (() => void) | null = null;

  start() {
    this.state = 'recording';
    mockStart();
  }

  stop() {
    this.state = 'inactive';
    mockStop();
    this.onstop?.();
  }
}

// ── MediaStream stub ─────────────────────────────────────────────────────────
const mockTrackStop = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: mockTrackStop }],
};

describe('useAgentRecording', () => {
  let addTraceLog: any;

  beforeEach(() => {
    addTraceLog = vi.fn();
    mockStop.mockClear();
    mockStart.mockClear();
    mockTrackStop.mockClear();

    // Provide mediaDevices stub
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    // Provide MediaRecorder stub
    (globalThis as Record<string, unknown>).MediaRecorder = MockMediaRecorder;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('starts with isRecording=false and recordingDuration=0', () => {
      const { result } = renderHook(() => useAgentRecording(addTraceLog));
      expect(result.current.isRecording).toBe(false);
      expect(result.current.recordingDuration).toBe(0);
    });
  });

  describe('startRecording — success path', () => {
    it('sets isRecording=true after getUserMedia resolves', async () => {
      const { result } = renderHook(() => useAgentRecording(addTraceLog));

      await act(async () => {
        result.current.handleToggleRecording();
        await Promise.resolve();
      });

      expect(result.current.isRecording).toBe(true);
      expect(mockStart).toHaveBeenCalledOnce();
    });

    it('resets duration to 0 when recording starts', async () => {
      const { result } = renderHook(() => useAgentRecording(addTraceLog));

      await act(async () => {
        result.current.handleToggleRecording();
        await Promise.resolve();
      });

      expect(result.current.recordingDuration).toBe(0);
    });
  });

  describe('startRecording — permission denied', () => {
    it('calls addTraceLog with denial message when getUserMedia rejects', async () => {
      (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Permission denied'),
      );

      const { result } = renderHook(() => useAgentRecording(addTraceLog));

      await act(async () => {
        result.current.handleToggleRecording();
        await Promise.resolve();
      });

      expect(result.current.isRecording).toBe(false);
      expect(addTraceLog).toHaveBeenCalledWith(
        'Microphone access denied. Voice capture unavailable.',
      );
    });
  });

  describe('stopRecording', () => {
    it('stops recording and resets state when toggleRecording called while recording', async () => {
      const { result } = renderHook(() => useAgentRecording(addTraceLog));

      // Start recording
      await act(async () => {
        result.current.handleToggleRecording();
        await Promise.resolve();
      });
      expect(result.current.isRecording).toBe(true);

      // Stop recording
      await act(async () => {
        result.current.handleToggleRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.recordingDuration).toBe(0);
    });
  });

  describe('Cleanup on unmount', () => {
    it('cleans up timer on unmount without crashing', async () => {
      const { result, unmount } = renderHook(() => useAgentRecording(addTraceLog));

      await act(async () => {
        result.current.handleToggleRecording();
        await Promise.resolve();
      });

      // Unmount while recording — should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('stops media tracks on unmount when recording', async () => {
      const { result, unmount } = renderHook(() => useAgentRecording(addTraceLog));

      await act(async () => {
        result.current.handleToggleRecording();
        await Promise.resolve();
      });

      act(() => {
        unmount();
      });

      expect(mockTrackStop).toHaveBeenCalled();
    });
  });
});
