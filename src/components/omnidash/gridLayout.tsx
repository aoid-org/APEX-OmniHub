/**
 * Shared react-grid-layout primitives for OmniDash widgets.
 *
 * Centralises the WidthProvider setup, CSS side-effects, and the reusable
 * DragHandle SVG so individual tab components don't duplicate them.
 */
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export { type Layout } from 'react-grid-layout/legacy';

/** Pre-wired responsive grid ready for use in every OmniDash tab. */
export const ResponsiveGridLayout = WidthProvider(Responsive);

interface DragHandleProps {
  /** Tailwind classes that control the initial & hover visibility of the handle.
   *  - Cards with a `group` parent can use `text-white/0 group-hover:text-white/30`
   *    (handle invisible until the card is hovered).
   *  - Cards without `group` should use `text-white/20` (always slightly visible).
   *  Defaults to the group-aware variant.
   */
  visibilityClass?: string;
}

/** Six-dot drag handle rendered in the top-right corner of every grid card. */
export const DragHandle = ({
  visibilityClass = 'text-white/0 group-hover:text-white/30',
}: DragHandleProps) => (
  <div
    className={`custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing ${visibilityClass} hover:text-white/60 transition-colors z-20`}
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
