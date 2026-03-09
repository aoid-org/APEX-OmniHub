import { Helmet } from 'react-helmet-async'
import { SITE_CONFIG, type PageSEO } from '../../config/seo.config'

interface SEOHeadProps extends PageSEO {
  structuredData?: object | object[]
}

export function SEOHead({
  title,
  description,
  canonical,
  keywords,
  ogImage,
  noIndex = false,
  structuredData,
}: SEOHeadProps) {
  const image = ogImage ?? SITE_CONFIG.defaultOgImage
  const fullImageUrl = image.startsWith('http')
    ? image
    : `${SITE_CONFIG.siteUrl}${image}`

  const schemas = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : []

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_CONFIG.siteName} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:site" content={SITE_CONFIG.twitterHandle} />

      {/* JSON-LD Structured Data */}
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Helmet>
  )
}