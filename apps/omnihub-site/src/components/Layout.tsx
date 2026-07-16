import { ReactNode, useEffect, useRef, useState } from "react";
import { siteConfig } from "@/content/site";
import { ReferenceOverlay } from "./ReferenceOverlay";
import { useAuth } from "@/lib/useAuth";
import { useAppTranslation } from "../i18n/useAppTranslation";
import { LanguageSelector } from "./LanguageSelector";
import { PWAInstallButton } from "./PWAInstallButton";

type LayoutProps = Readonly<{
  children: ReactNode;
  title?: string;
}>;

function getInitialTheme(): boolean {
  if (globalThis.window === undefined) return false;
  const saved = globalThis.localStorage.getItem("theme");
  const prefersDark = globalThis.window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;
  return saved === "dark" || (!saved && prefersDark);
}

function ThemeToggle() {
  const { tx } = useAppTranslation();
  const [isDark, setIsDark] = useState(getInitialTheme);
  const isLight = !isDark;

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  const setTheme = (dark: boolean) => {
    const newTheme = dark ? "dark" : "light";
    setIsDark(dark);
    globalThis.localStorage.setItem("theme", newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  return (
    <div
      className="theme-toggle-segmented"
      aria-label={tx("layout.theme.ariaLabel")}
    >
      <label
        className={`theme-toggle-segmented__option ${
          isLight ? "theme-toggle-segmented__option--active" : ""
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
        {tx("layout.theme.light")}
      </label>
      <label
        className={`theme-toggle-segmented__option ${
          isDark ? "theme-toggle-segmented__option--active" : ""
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
        {tx("layout.theme.dark")}
      </label>
    </div>
  );
}

function Nav() {
  const { tx } = useAppTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? "/omnidash";

  // Body scroll lock effect
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      // Prevent iOS bounce
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <nav className="nav">
      <div className="container nav__inner">
        <div className="nav__left">
          <a
            href="/"
            className="nav__logo"
            aria-label={tx("layout.nav.homeAria")}
          >
            <img
              src="/apex-omnihub-wordmark.svg"
              alt="APEX OmniHub"
              className="nav__logo-wordmark"
              width="182"
              height="26"
            />
          </a>
          <ThemeToggle />
        </div>

        <ul className="nav__links" aria-label={tx("layout.nav.primaryAria")}>
          {siteConfig.nav.links.map((link) => {
            let customStyle = "";
            if (link.href === "/tech-specs") {
              customStyle = "nav__btn-pill nav__btn-pill--orange";
            } else if (link.href === "/story") {
              customStyle = "nav__btn-pill nav__btn-pill--navy";
            }
            return (
              <li key={link.href}>
                <a href={link.href} className={customStyle || "nav__link"}>
                  {tx(link.labelKey)}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="nav__actions">
          <LanguageSelector className="language-selector--desktop" />
          <div className="nav__burger" ref={menuRef}>
            <button
              type="button"
              className="nav__burger-btn"
              aria-label={
                menuOpen
                  ? tx("layout.nav.closeMenu")
                  : tx("layout.nav.openMenu")
              }
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span
                className={
                  menuOpen
                    ? "nav__burger-icon nav__burger-icon--open"
                    : "nav__burger-icon"
                }
              >
                <span />
                <span />
                <span />
              </span>
            </button>

            {menuOpen && (
              <dialog open className="nav__mobile-menu">
                {/* Mobile Menu Content */}
                <ul className="nav__mobile-links">
                  <li className="nav__mobile-language">
                    <LanguageSelector onChange={() => setMenuOpen(false)} />
                  </li>
                  {siteConfig.nav.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="nav__mobile-link"
                        onClick={() => setMenuOpen(false)}
                      >
                        {tx(link.labelKey)}
                      </a>
                    </li>
                  ))}

                  {/* Auth-aware CTA in Mobile Menu */}
                  <li className="nav__mobile-cta-container">
                    {!authLoading &&
                      (isAuthenticated ? (
                        <a
                          href={dashboardUrl}
                          className="btn btn--primary btn--lg nav__mobile-cta"
                          onClick={() => setMenuOpen(false)}
                        >
                          {tx("layout.nav.launchConsole")}
                        </a>
                      ) : (
                        <a
                          href={siteConfig.nav.loginLink.href}
                          className="btn btn--primary btn--lg nav__mobile-cta"
                          onClick={() => setMenuOpen(false)}
                        >
                          {tx(siteConfig.nav.loginLink.labelKey)}
                        </a>
                      ))}
                  </li>
                </ul>
              </dialog>
            )}
          </div>

          {isAuthenticated ? (
            <a href={dashboardUrl} className="btn btn--primary btn--sm">
              {tx("layout.nav.launchConsole")}
            </a>
          ) : (
            <a
              href={siteConfig.nav.loginLink.href}
              className="btn btn--primary btn--sm"
            >
              {tx(siteConfig.nav.loginLink.labelKey)}
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const { tx } = useAppTranslation();
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__copyright">{tx("layout.footer.copyright")}</p>
        <ul className="footer__links">
          {siteConfig.footer.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="footer__link">
                {tx(link.labelKey)}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/integrations/web3"
              className="footer__link"
              style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}
            >
              {tx("layout.footer.web3Integrations")}
            </a>
          </li>
        </ul>
      </div>
      {/* Maestro Observability Indicator */}
      <div
        className="container footer__maestro"
        style={{
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--color-border)",
          marginTop: "var(--space-4)",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor:
              import.meta.env.VITE_MAESTRO_ENABLED === "true"
                ? "var(--color-success)"
                : "var(--color-text-muted)",
          }}
        />
        <span>
          MAESTRO:{" "}
          {import.meta.env.VITE_MAESTRO_ENABLED === "true"
            ? tx("layout.maestro.active")
            : tx("layout.maestro.disabled")}
        </span>
      </div>
    </footer>
  );
}

export function Layout({ children, title }: LayoutProps) {
  // Use window.location.pathname directly — Layout is a presentational shell
  // and must not depend on React Router context (useLocation would throw
  // if Layout were ever rendered outside a <Router>).
  const shouldRenderBrandAnthem =
    globalThis.window?.location.pathname === "/";

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
      <PWAInstallButton />
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
