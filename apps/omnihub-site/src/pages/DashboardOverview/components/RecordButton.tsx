import { memo } from 'react';

interface RecordButtonProps {
  readonly isRecording: boolean;
  readonly duration: number;
  readonly onToggle: () => void;
}

export const RecordButton = memo(function RecordButton({
  isRecording,
  duration,
  onToggle,
}: RecordButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isRecording ? 'Stop recording' : 'Record voice message'}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: isRecording
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(194,80,31,0.08)',
        border: `1px solid ${
          isRecording
            ? 'rgba(239,68,68,0.4)'
            : 'rgba(194,80,31,0.2)'
        }`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: isRecording
          ? '0 0 16px rgba(239,68,68,0.3)'
          : 'none',
        transition: 'all 0.2s',
      }}
    >
      {isRecording ? (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: '#ef4444',
          }}
        />
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
      {isRecording && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            fontSize: 9.63,
            fontWeight: 700,
            color: '#ef4444',
            background: '#0f172a',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 6,
            padding: '1px 4px',
          }}
        >
          {duration}s
        </span>
      )}
    </button>
  );
});
