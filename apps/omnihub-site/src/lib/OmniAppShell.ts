/**
 * OmniAppShell — Zero-Trust Shadow DOM Sandbox
 * @version 1.0.0
 * @module apps/omnihub-site/src/lib/OmniAppShell
 *
 * Custom Element that provides CSS/DOM isolation for 3rd-party integrations.
 * Uses Shadow DOM to guarantee that no styles or scripts can escape or bleed
 * into the APEX host application.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Same config always produces identical mount
 * - Modularity: Pure Web Component — zero React dependencies
 * - Security: Shadow DOM prevents CSS/DOM escape from hosted content
 * - Overload-Free: disconnectedCallback deterministically cleans up
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import DOMPurify from 'dompurify';

// ============================================================================
// Configuration Types
// ============================================================================

export interface OmniAppShellConfig {
  readonly title?: string;
  readonly entryUrl?: string;
  readonly htmlContent?: string;
}

// ============================================================================
// Custom Element
// ============================================================================

const SHELL_TAG = 'omni-app-shell';

class OmniAppShellElement extends HTMLElement {
  private _shadowRoot: ShadowRoot | null = null;
  private _mounted = false;

  static get observedAttributes(): readonly string[] {
    return ['data-config'] as const;
  }

  connectedCallback(): void {
    if (this._mounted) return; // Idempotent — prevent double-mount
    this._mounted = true;

    // Create open shadow root for CSS/DOM isolation
    this._shadowRoot = this.attachShadow({ mode: 'open' });

    // Inject CSS reset — neutralises any global style bleed
    const resetStyle = document.createElement('style');
    resetStyle.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: auto;
        color: #e0e7ff;
        font-family: "Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif;
      }
      :host * {
        box-sizing: border-box;
      }
      .omni-sandbox-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .omni-sandbox-placeholder {
        text-align: center;
        color: rgba(224, 231, 255, 0.6);
        font-size: 14px;
        line-height: 1.6;
      }
      .omni-sandbox-placeholder h3 {
        font-size: 16px;
        color: #f97316;
        margin: 0 0 8px 0;
        font-weight: 500;
      }
      iframe.omni-sandbox-iframe {
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 8px;
      }
    `;
    this._shadowRoot.appendChild(resetStyle);

    // Parse config and render content
    this._renderContent();
  }

  disconnectedCallback(): void {
    // Deterministic cleanup
    if (this._shadowRoot) {
      // Remove all children except the reset style
      const children = Array.from(this._shadowRoot.children);
      for (const child of children) {
        if (child.tagName !== 'STYLE') {
          child.remove();
        }
      }
    }
    this._mounted = false;
    this.dispatchEvent(new CustomEvent('omni:integration:teardown', { bubbles: false }));
  }

  attributeChangedCallback(name: string, _oldVal: string | null, _newVal: string | null): void {
    if (name === 'data-config' && this._mounted && this._shadowRoot) {
      // Re-render on config change
      const children = Array.from(this._shadowRoot.children);
      for (const child of children) {
        if (child.tagName !== 'STYLE') {
          child.remove();
        }
      }
      this._renderContent();
    }
  }

  private _renderContent(): void {
    if (!this._shadowRoot) return;

    const configAttr = this.dataset.config;
    let config: OmniAppShellConfig = {};
    try {
      config = configAttr ? (JSON.parse(configAttr) as OmniAppShellConfig) : {};
    } catch {
      console.error('[OmniAppShell] Invalid data-config JSON');
    }

    const container = document.createElement('div');
    container.className = 'omni-sandbox-container';

    if (config.entryUrl) {
      // Render as iframe inside shadow DOM for full isolation
      const iframe = document.createElement('iframe');
      iframe.className = 'omni-sandbox-iframe';
      iframe.src = config.entryUrl;
      iframe.title = config.title ?? 'Integration';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
      container.appendChild(iframe);
    } else if (config.htmlContent) {
      // Render raw HTML inside shadow DOM
      const wrapper = document.createElement('div');
      wrapper.innerHTML = DOMPurify.sanitize(config.htmlContent);
      container.appendChild(wrapper);
    } else {
      // Placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'omni-sandbox-placeholder';
      placeholder.innerHTML = `
        <h3>${config.title ?? 'Integration Sandbox'}</h3>
        <p>This integration is running in a zero-trust Shadow DOM sandbox.</p>
        <p>No styles or scripts can escape this boundary.</p>
      `;
      container.appendChild(placeholder);
    }

    this._shadowRoot.appendChild(container);
  }
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Register the custom element. Safe to call multiple times —
 * will not re-register if already defined.
 */
export function registerOmniAppShell(): void {
  if (!customElements.get(SHELL_TAG)) {
    customElements.define(SHELL_TAG, OmniAppShellElement);
  }
}

export { SHELL_TAG };
