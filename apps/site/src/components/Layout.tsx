import { ReactNode, useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/content/site';
import { ReferenceOverlay } from './ReferenceOverlay';

type LayoutProps = Readonly<{
  children: ReactNode;
  title?: string;
}>;

function getInitialTheme(): boolean {
  if (globalThis.window === undefined) return false;
  const saved = globalThis.localStorage.getItem('theme');
  const prefersDark =
    globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches;
  return saved === 'dark' || (!saved && prefersDark);
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(getInitialTheme);
  const isLight = !isDark;

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const setTheme = (dark: boolean) => {
    const newTheme = dark ? 'dark' : 'light';
    setIsDark(dark);
    globalThis.localStorage.setItem('theme', newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  return (
    <div className="theme-toggle-segmented" aria-label="Theme selection">
      <label
        className={`theme-toggle-segmented__option ${isLight ? 'theme-toggle-segmented__option--active' : ''
          }`}
      >
        <input
          className="theme-toggle-segmented__input"
          type="radio"
          name="theme"
          value="light"
          checked={isLight}
          onChange={() => setTheme(false)}
        />
        WHITE FORTRESS
      </label>
      <label
        className={`theme-toggle-segmented__option ${isDark ? 'theme-toggle-segmented__option--active' : ''
          }`}
      >
        <input
          className="theme-toggle-segmented__input"
          type="radio"
          name="theme"
          value="dark"
          checked={isDark}
          onChange={() => setTheme(true)}
        />
        NIGHT WATCH
      </label>
    </div>
  );
}

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Body scroll lock effect
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      // Prevent iOS bounce
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <nav className="nav">
      <div className="container nav__inner">
        <div className="nav__left">
          <a href="/" className="nav__logo" aria-label="APEX OmniHub home">
            <img
              src="/apex-omnihub-wordmark.svg"
              alt="APEX OmniHub"
              className="nav__logo-wordmark"
              width="182"
              height="26"
              style={{
                height: '72.96px',
                width: 'auto',
                aspectRatio: '1012.5 / 147'
              }}
            />
          </a>
          <ThemeToggle />
        </div>

        <ul className="nav__links" aria-label="Primary navigation">
          {siteConfig.nav.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="nav__link">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav__actions">
          <a href={siteConfig.nav.loginLink.href} className="btn btn--primary btn--sm">
            {siteConfig.nav.loginLink.label}
          </a>

          <div className="nav__burger" ref={menuRef}>
            <button
              type="button"
              className="nav__burger-btn"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span
                className={
                  menuOpen
                    ? 'nav__burger-icon nav__burger-icon--open'
                    : 'nav__burger-icon'
                }
              >
                <span />
                <span />
                <span />
              </span>
            </button>

            {menuOpen && (
              <dialog 
                open
                className="nav__mobile-menu"
              >
                {/* Mobile Menu Content */}
                <ul className="nav__mobile-links">
                  {siteConfig.nav.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="nav__mobile-link"
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                  
                  {/* Additional CTA in Mobile Menu */}
                  <li className="nav__mobile-cta-container">
                     <a
                      href={siteConfig.nav.loginLink.href}
                      className="btn btn--primary btn--lg nav__mobile-cta"
                      onClick={() => setMenuOpen(false)}
                    >
                      {siteConfig.nav.loginLink.label}
                    </a>
                  </li>
                </ul>
              </dialog>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__copyright">{siteConfig.footer.copyright}</p>
        <ul className="footer__links">
          {siteConfig.footer.links.map((link) => (
            <li key={link.href}>
              <a href={link.href + '.html'} className="footer__link">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {/* Maestro Observability Indicator */}
      <div className="container" style={{
        fontSize: '0.75rem',
        color: 'var(--color-text-secondary)',
        opacity: 0.7,
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid var(--color-border)',
        marginTop: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: import.meta.env.VITE_MAESTRO_ENABLED === 'true' ? 'var(--color-success)' : 'var(--color-text-muted)'
        }} />
        <span>
          Maestro: {import.meta.env.VITE_MAESTRO_ENABLED === 'true' ? 'Active' : 'Disabled'}
        </span>
      </div>
    </footer>
  );
}

export function Layout({ children, title }: LayoutProps) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${siteConfig.name}`;
    } else {
      document.title = `${siteConfig.name} - Intelligence, Designed.`;
    }
  }, [title]);

  return (
    <>
      <ReferenceOverlay />
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
