/**
 * SEO meta tag component for APEX OmniHub marketing pages.
 * Pre-rendered by vite-react-ssg during build for Google indexing.
 */
import { Head } from 'vite-react-ssg';

interface SEOMetaProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  appendBrandSuffix?: boolean;
}

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
  const currentUrl =
    globalThis.window === undefined ? '' : globalThis.window.location.href;
  const canon = canonical ?? currentUrl;

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
