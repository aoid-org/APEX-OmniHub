/**
 * OmniMobileDrawer — Slide-up sheet for right panel content on mobile/tablet
 *
 * Renders Security, Analytics, OmniTrace, OpsControls in a scrollable sheet.
 * Backdrop blur overlay, accessible dialog pattern, Escape to close.
 */
import { useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";

interface OmniMobileDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
}

export function OmniMobileDrawer({ isOpen, onClose, title, children }: OmniMobileDrawerProps) {
  const drawerRef = useRef<HTMLDialogElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    // Focus trap — focus the drawer on open
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="omni-drawer-overlay"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <dialog
        open
        ref={drawerRef}
        className="omni-drawer"
        aria-label={title}
        tabIndex={-1}
      >
        {/* Handle bar — iOS sheet indicator */}
        <div className="omni-drawer__handle-bar">
          <div className="omni-drawer__handle" />
        </div>

        {/* Header */}
        <div className="omni-drawer__header">
          <span className="omni-drawer__title">{title}</span>
          <button
            type="button"
            className="omni-drawer__close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="omni-drawer__content">
          {children}
        </div>
      </dialog>
    </div>
  );
}
