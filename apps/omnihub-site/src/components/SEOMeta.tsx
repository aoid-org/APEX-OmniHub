/**
 * SEO meta tag component for APEX OmniHub marketing pages.
 * Pre-rendered by vite-react-ssg during build for Google indexing.
 */
import { useEffect } from 'react';
import { Head } from 'vite-react-ssg';

type SEOMetaProps = Readonly<{
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  appendBrandSuffix?: boolean;
}>;

export function SEOMeta({
  title,
  description,
  canonical,
  ogImage,
  noIndex,
  appendBrandSuffix = true,
}: SEOMetaProps) {
  const fullTitle = appendBrandSuffix
    ? `${title} | APEX OmniHub — Intelligence Designed`
    : title;
  const ogImg = ogImage ?? 'https://apexomnihub.icu/og-image.png';
  const currentUrl = typeof window === 'undefined' ? '' : window.location.href;
  const canon = canonical ?? currentUrl;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

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

    if (canonical) {
      let link = document.querySelector(
        'link[rel="canonical"]',
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canon);
    }
  }, [fullTitle, description, ogImg, canon, noIndex, canonical]);

  if (typeof window !== 'undefined') {
    return null;
  }

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canon} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImg} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      {canonical && <link rel="canonical" href={canon} />}
    </Head>
  );
}
