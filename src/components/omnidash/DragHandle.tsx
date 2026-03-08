/**
 * Shared drag handle for react-grid-layout widget cards.
 *
 * Uses the `.custom-drag-handle` CSS selector required by
 * `draggableHandle=".custom-drag-handle"` in every ResponsiveGridLayout.
 *
 * Pass `className` to override the default size (h-10/w-10) or text-colour
 * ramp used in different grid contexts.
 */
interface DragHandleProps {
  /** Tailwind classes for padding, size and text-colour.
   *  Defaults to the standard 40 × 40 px handle with fade-in-on-hover. */
  className?: string;
}

export const DragHandle = ({
  className = 'p-3 h-10 w-10 text-white/0 group-hover:text-white/30 hover:text-white/60',
}: DragHandleProps) => (
  <div
    className={`custom-drag-handle absolute top-0 right-0 cursor-grab active:cursor-grabbing transition-colors z-20 ${className}`}
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  </div>
);
