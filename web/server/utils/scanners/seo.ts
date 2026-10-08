import type { Finding } from '../../../shared/types/scan'
import { buildCategory } from '../grade'
import { documentTitle, fetchHtml, linkHref, metaContent } from '../fetchHtml'

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveUrl(base: string, value: string): string {
  try {
    return new URL(value, base).toString()
  } catch {
    return value
  }
}

export async function scanSeo(targetUrl: string) {
  const page = await fetchHtml(targetUrl)
  if (!page.html) {
    return buildCategory([
      {
        id: 'seo-fetch',
        severity: 'high',
        passed: false,
        title: 'Page fetch',
        detail: `Could not fetch HTML for SEO checks: ${page.error || `HTTP ${page.status}`}`,
      },
    ])
  }

  const title = documentTitle(page.html)
  const description = metaContent(page.html, 'description')
  const ogTitle = metaContent(page.html, 'og:title')
  const ogDescription = metaContent(page.html, 'og:description')
  const ogImage = metaContent(page.html, 'og:image')
  const ogUrl = metaContent(page.html, 'og:url')
  const ogType = metaContent(page.html, 'og:type')
  const twitterCard = metaContent(page.html, 'twitter:card')
  const twitterImage = metaContent(page.html, 'twitter:image')
  const canonical = linkHref(page.html, 'canonical')
  const robots = metaContent(page.html, 'robots')

  const resolvedOgImage = ogImage ? resolveUrl(page.finalUrl, ogImage) : null
  const imageOk = !!resolvedOgImage && isAbsoluteHttpUrl(resolvedOgImage)

  const findings: Finding[] = [
    {
      id: 'seo-title',
      severity: 'high',
      passed: !!title && title.length >= 3 && title.length <= 70,
      title: 'Document title',
      detail: title
        ? title.length > 70
          ? `Title is long (${title.length} chars). Prefer about 50–60 characters.`
          : `Title is present (${title.length} chars).`
        : 'Missing <title>. Search and social previews need a clear document title.',
      value: title ?? undefined,
    },
    {
      id: 'seo-description',
      severity: 'medium',
      passed: !!description && description.length >= 50 && description.length <= 170,
      title: 'Meta description',
      detail: description
        ? description.length < 50 || description.length > 170
          ? `Description length is ${description.length} chars. Aim for roughly 120–160.`
          : 'Meta description looks reasonable.'
        : 'Missing meta name="description".',
      value: description ?? undefined,
    },
    {
      id: 'seo-og-title',
      severity: 'medium',
      passed: !!(ogTitle || title),
      title: 'Open Graph title',
      detail: ogTitle
        ? 'og:title is set.'
        : title
          ? 'og:title is missing; some platforms fall back to <title>.'
          : 'Missing og:title and document title.',
      value: ogTitle ?? title ?? undefined,
    },
    {
      id: 'seo-og-description',
      severity: 'medium',
      passed: !!(ogDescription || description),
      title: 'Open Graph description',
      detail: ogDescription
        ? 'og:description is set.'
        : description
          ? 'og:description is missing; some platforms fall back to meta description.'
          : 'Missing og:description and meta description.',
      value: ogDescription ?? description ?? undefined,
    },
    {
      id: 'seo-og-image',
      severity: 'high',
      passed: imageOk,
      title: 'Open Graph image',
      detail: imageOk
        ? 'og:image is present and resolves to an absolute HTTP(S) URL.'
        : ogImage
          ? 'og:image is present but could not be resolved to an absolute HTTP(S) URL.'
          : 'Missing og:image. Social previews need a share image (recommended ~1200×630).',
      value: resolvedOgImage ?? ogImage ?? undefined,
    },
    {
      id: 'seo-og-url',
      severity: 'low',
      passed: !!ogUrl,
      title: 'Open Graph URL',
      detail: ogUrl ? 'og:url is set.' : 'Missing og:url. Set the canonical page URL for social crawlers.',
      value: ogUrl ?? undefined,
    },
    {
      id: 'seo-og-type',
      severity: 'low',
      passed: !!ogType,
      title: 'Open Graph type',
      detail: ogType ? `og:type is set to ${ogType}.` : 'Missing og:type (commonly website or article).',
      value: ogType ?? undefined,
    },
    {
      id: 'seo-twitter-card',
      severity: 'medium',
      passed: !!twitterCard || imageOk,
      title: 'Twitter / X card',
      detail: twitterCard
        ? `twitter:card is set to ${twitterCard}.`
        : imageOk
          ? 'twitter:card is missing; X may still use Open Graph tags.'
          : 'Missing twitter:card and no usable og:image fallback.',
      value: twitterCard ?? undefined,
    },
    {
      id: 'seo-twitter-image',
      severity: 'low',
      passed: !!(twitterImage || imageOk),
      title: 'Twitter / X image',
      detail: twitterImage
        ? 'twitter:image is set.'
        : imageOk
          ? 'twitter:image is missing; X can fall back to og:image.'
          : 'Missing twitter:image and og:image.',
      value: twitterImage ?? resolvedOgImage ?? undefined,
    },
    {
      id: 'seo-canonical',
      severity: 'medium',
      passed: !!canonical,
      title: 'Canonical URL',
      detail: canonical
        ? 'rel=canonical is present.'
        : 'Missing rel=canonical. Add one to avoid duplicate-URL ambiguity.',
      value: canonical ?? undefined,
    },
    {
      id: 'seo-robots',
      severity: 'info',
      passed: !robots || !/noindex/i.test(robots),
      title: 'Robots meta',
      detail: robots
        ? /noindex/i.test(robots)
          ? `robots meta includes noindex (${robots}).`
          : `robots meta is present (${robots}).`
        : 'No robots meta tag (defaults to indexable unless blocked elsewhere).',
      value: robots ?? undefined,
    },
  ]

  return buildCategory(findings)
}
