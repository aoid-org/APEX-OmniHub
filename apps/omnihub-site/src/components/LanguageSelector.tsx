import { useEffect, useId, useRef, useState } from "react";
import { useAppTranslation } from "../i18n/useAppTranslation";
import { SUPPORTED_LOCALES, resolveSupportedLocale } from "../i18n/locales";

export function LanguageSelector({
  className,
  onChange,
}: Readonly<{ className?: string; onChange?: () => void }>) {
  const { i18n, tx } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const selectedLanguage = resolveSupportedLocale(
    i18n.resolvedLanguage ?? i18n.language
  );
  const selectedLanguageLabel =
    SUPPORTED_LOCALES.find((language) => language.code === selectedLanguage)
      ?.nativeLabel ?? "English";

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLanguageChange = (nextLanguage: string) => {
    const resolvedLanguage = resolveSupportedLocale(nextLanguage);
    void i18n.changeLanguage(resolvedLanguage);
    globalThis.localStorage.setItem("apex_locale", resolvedLanguage);
    setIsOpen(false);
    onChange?.();
  };

  return (
    <div
      className={`language-selector ${className ?? ""}`.trim()}
      ref={dropdownRef}
    >
      <button
        type="button"
        className="language-selector__trigger"
        aria-label={tx("layout.languageSelector.ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="language-selector__globe" aria-hidden="true">
          🌐
        </span>
        <span className="language-selector__current">
          {selectedLanguageLabel}
        </span>
        <span className="language-selector__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen && (
        <ul className="language-selector__menu" id={menuId}>
          {SUPPORTED_LOCALES.map((language) => (
            <li key={language.code}>
              <button
                type="button"
                aria-pressed={language.code === selectedLanguage}
                className={`language-selector__option ${
                  language.code === selectedLanguage
                    ? "language-selector__option--active"
                    : ""
                }`}
                onClick={() => handleLanguageChange(language.code)}
              >
                {language.nativeLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
