/**
 * SEO meta tag component for APEX OmniHub marketing pages.
 * Pre-rendered by vite-react-ssg during build for Google indexing.
 */
import { useEffect } from 'react';

interface SEOMetaProps {
  title:       string;
  description: string;
  canonical?:  string;
  ogImage?:    string;
  noIndex?:    boolean;
}

export function SEOMeta({ title, description, canonical, ogImage, noIndex }: SEOMetaProps) {
  const fullTitle = `${title} | APEX OmniHub — Intelligence Designed`;
  const ogImg     = ogImage ?? 'https://apexomnihub.icu/og-image.png';
  const currentUrl = typeof globalThis.window === 'undefined' ? '' : globalThis.window.location.href;
  const canon     = canonical ?? currentUrl;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (attr: string, key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', ogImg);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', canon);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImg);

    if (noIndex) {
      setMeta('name', 'robots', 'noindex,nofollow');
    }

    // Set canonical link
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canon);
    }
  }, [fullTitle, description, ogImg, canon, noIndex, canonical]);

  return null;
}
