/** Public branding for forks. Override via NUXT_PUBLIC_* env vars. */
export interface SiteBranding {
  siteName: string
  siteUrl: string
  siteDescription: string
  orgName: string
  orgEmail: string
  orgUrl: string
  orgAddress: string
  orgStreetAddress: string
  orgLocality: string
  orgCountry: string
  orgPostalCode: string
  githubUrl: string
}

export const DEFAULT_SITE_NAME = 'Web Advisor'
export const DEFAULT_SITE_URL = 'http://localhost:3000'
export const DEFAULT_SITE_DESCRIPTION =
  'Web Advisor scans public websites for security headers, TLS, DNSSEC, DNS hygiene, Open Graph SEO previews, and Is Agentic readiness, then returns a letter grade and an AI fix prompt.'

/** Open-source defaults (no vendor identity). Set env vars for a production deploy. */
export const DEFAULT_SITE_BRANDING: SiteBranding = {
  siteName: DEFAULT_SITE_NAME,
  siteUrl: DEFAULT_SITE_URL,
  siteDescription: DEFAULT_SITE_DESCRIPTION,
  orgName: 'Your Organization',
  orgEmail: 'contact@example.com',
  orgUrl: 'https://example.com',
  orgAddress: 'Your street, City, Country',
  orgStreetAddress: 'Your street',
  orgLocality: 'City',
  orgCountry: 'US',
  orgPostalCode: '00000',
  githubUrl: 'https://github.com/algotechllc/web-advisor',
}

export type PublicRuntimeBranding = Partial<{
  siteName: string
  siteUrl: string
  siteDescription: string
  orgName: string
  orgEmail: string
  orgUrl: string
  orgAddress: string
  orgStreetAddress: string
  orgLocality: string
  orgCountry: string
  orgPostalCode: string
  githubUrl: string
}>

export function resolveSiteBranding(input?: PublicRuntimeBranding | null): SiteBranding {
  const pick = (value: string | undefined, fallback: string) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : fallback
  }
  return {
    siteName: pick(input?.siteName, DEFAULT_SITE_BRANDING.siteName),
    siteUrl: pick(input?.siteUrl, DEFAULT_SITE_BRANDING.siteUrl).replace(/\/$/, ''),
    siteDescription: pick(input?.siteDescription, DEFAULT_SITE_BRANDING.siteDescription),
    orgName: pick(input?.orgName, DEFAULT_SITE_BRANDING.orgName),
    orgEmail: pick(input?.orgEmail, DEFAULT_SITE_BRANDING.orgEmail),
    orgUrl: pick(input?.orgUrl, DEFAULT_SITE_BRANDING.orgUrl).replace(/\/$/, ''),
    orgAddress: pick(input?.orgAddress, DEFAULT_SITE_BRANDING.orgAddress),
    orgStreetAddress: pick(input?.orgStreetAddress, DEFAULT_SITE_BRANDING.orgStreetAddress),
    orgLocality: pick(input?.orgLocality, DEFAULT_SITE_BRANDING.orgLocality),
    orgCountry: pick(input?.orgCountry, DEFAULT_SITE_BRANDING.orgCountry),
    orgPostalCode: pick(input?.orgPostalCode, DEFAULT_SITE_BRANDING.orgPostalCode),
    githubUrl: pick(input?.githubUrl, DEFAULT_SITE_BRANDING.githubUrl).replace(/\/$/, ''),
  }
}

export const INDEXABLE_PATHS = ['/', '/about', '/contact', '/privacy'] as const

export function absoluteUrl(siteUrl: string, path = '/'): string {
  const base = siteUrl.replace(/\/$/, '')
  if (path === '/') return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function jsonLdGraph(branding: SiteBranding) {
  const home = absoluteUrl(branding.siteUrl, '/')
  const contact = absoluteUrl(branding.siteUrl, '/contact')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${branding.orgUrl}#organization`,
        name: branding.orgName,
        url: branding.orgUrl,
        email: branding.orgEmail,
        sameAs: [home],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: branding.orgEmail,
          url: contact,
          availableLanguage: 'English',
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: branding.orgStreetAddress,
          addressLocality: branding.orgLocality,
          addressCountry: branding.orgCountry,
          postalCode: branding.orgPostalCode,
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${home}#app`,
        name: branding.siteName,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web',
        url: home,
        description: branding.siteDescription,
        publisher: { '@id': `${branding.orgUrl}#organization` },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        name: branding.siteName,
        url: home,
        description: branding.siteDescription,
        inLanguage: 'en',
        publisher: { '@id': `${branding.orgUrl}#organization` },
      },
    ],
  }
}

export function homepageMarkdown(branding: SiteBranding): string {
  const { siteUrl, siteName } = branding
  return `# ${siteName}

${siteName} is a public website scanner for security headers, TLS certificates, DNSSEC, DNS hygiene, Open Graph social previews, and Is Agentic readiness.

Paste a public hostname to receive a letter grade, category scores, and an AI fix prompt. The scan API is \`GET /api/scan?url=\`.

## When to use ${siteName}

Use ${siteName} when you need a fast public audit of a site you operate: missing CSP or HSTS, incomplete Open Graph tags, unsigned DNS, or weak agent files such as llms.txt and Markdown negotiation.

## What we check

- Security headers, TLS, DNSSEC, and mail/CAA DNS records
- SEO and social preview tags including og:image
- Is Agentic signals via the public report API plus local probes

## Main pages

- [Home](${absoluteUrl(siteUrl, '/')})
- [About](${absoluteUrl(siteUrl, '/about')})
- [Contact](${absoluteUrl(siteUrl, '/contact')})
- [Privacy](${absoluteUrl(siteUrl, '/privacy')})
- [llms.txt](${absoluteUrl(siteUrl, '/llms.txt')})
- [Sitemap](${absoluteUrl(siteUrl, '/sitemap.xml')})
`
}

export function aboutMarkdown(branding: SiteBranding): string {
  const { siteUrl, siteName, orgName, orgEmail, orgAddress } = branding
  return `# About ${siteName}

${siteName} is built by ${orgName} as a practical scanner for public websites. It combines security-header analysis similar to securityheaders.com with DNSSEC and DNS hygiene, Open Graph SEO checks, and Is Agentic readiness.

The product is meant for engineers and operators who want a shareable grade, evidence for each finding, and a copy-paste prompt an AI assistant can use to remediate issues without weakening compatibility for plugins and third-party scripts.

We scan only public HTTP and HTTPS URLs. Private, localhost, and link-local targets are rejected. Results are a snapshot, not a certification. The scanner does not log in, does not store a history database in this version, and is not a substitute for a penetration test or legal review.

Learn more at [${siteName}](${absoluteUrl(siteUrl, '/')}) or contact [${orgEmail}](mailto:${orgEmail}). Organization: ${orgName}, ${orgAddress}.
`
}

export function contactMarkdown(branding: SiteBranding): string {
  const { siteUrl, siteName, orgName, orgEmail, orgAddress, orgUrl } = branding
  return `# Contact ${siteName}

Email ${orgName} at [${orgEmail}](mailto:${orgEmail}) for product questions, scan corrections, or partnership inquiries about ${siteName}.

Include the public URL you scanned and the report timestamp. Do not send secrets, private keys, session cookies, or authenticated-only pages. We can only discuss public HTTP and DNS behavior that the scanner already observes.

Organization: ${orgName}, ${orgAddress}. Support language: English. Related site: ${orgUrl}.

[Home](${absoluteUrl(siteUrl, '/')}) · [Privacy](${absoluteUrl(siteUrl, '/privacy')}) · [About](${absoluteUrl(siteUrl, '/about')})
`
}

export function privacyMarkdown(branding: SiteBranding): string {
  const { siteUrl, siteName, orgName, orgEmail, orgAddress } = branding
  return `# Privacy policy

${siteName} scans public websites that you submit. We fetch publicly reachable HTTP responses, TLS certificates, and DNS records. We do not ask you to create an account for a basic scan.

Submitted URLs, timestamps, and scanner output may be processed in memory to produce a grade. Client IP addresses are used for a twenty-request-per-minute rate limit. Do not submit URLs that expose private data. We are not responsible for content hosted on third-party sites we scan.

Contact [${orgEmail}](mailto:${orgEmail}) for privacy questions. Organization: ${orgName}, ${orgAddress}. Site: ${absoluteUrl(siteUrl, '/')}.
`
}

export function notFoundMarkdown(branding: SiteBranding): string {
  const { siteUrl, siteName } = branding
  return `# Page not found

The requested path does not exist on ${siteName}. Open the [homepage](${absoluteUrl(siteUrl, '/')}), read [llms.txt](${absoluteUrl(siteUrl, '/llms.txt')}), or browse the [sitemap](${absoluteUrl(siteUrl, '/sitemap.xml')}) for indexable URLs.
`
}

export function llmsTxt(branding: SiteBranding): string {
  const { siteUrl, siteName } = branding
  return `# ${siteName}

${siteName} is a public website scanner that grades security headers, TLS, DNSSEC, DNS hygiene, Open Graph SEO, and Is Agentic readiness, then returns findings and an AI fix prompt.

## When to use this

Use ${siteName} when you operate a public website and need to know whether browsers, crawlers, and AI agents can understand it. Typical jobs:

- Audit CSP, HSTS, clickjacking, and related response headers before a launch
- Check Open Graph and Twitter card tags so share previews work
- Confirm DNSSEC, SPF, DMARC, and CAA records exist
- See if llms.txt, sitemaps, JSON-LD, and Markdown negotiation are in place
- Produce a remediation prompt for an AI coding assistant

Call the scan API as \`GET ${absoluteUrl(siteUrl, '/api/scan')}?url=\` with a public HTTP or HTTPS URL. Open the HTML UI at ${absoluteUrl(siteUrl, '/')} and enter a hostname to view graded results.

Do not use ${siteName} as a penetration test, legal compliance certificate, or scanner for private/authenticated apps.

## Main pages

- [Home](${absoluteUrl(siteUrl, '/')})
- [About](${absoluteUrl(siteUrl, '/about')})
- [Contact](${absoluteUrl(siteUrl, '/contact')})
- [Privacy](${absoluteUrl(siteUrl, '/privacy')})
- [Sitemap](${absoluteUrl(siteUrl, '/sitemap.xml')})
- [Scan API](${absoluteUrl(siteUrl, '/api/scan')}?url=https://example.com)
`
}

export function sitemapXml(branding: SiteBranding, lastmod: string): string {
  const urls = INDEXABLE_PATHS.map((path) => {
    const loc = absoluteUrl(branding.siteUrl, path)
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function robotsTxt(branding: SiteBranding): string {
  return `User-Agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(branding.siteUrl, '/sitemap.xml')}\n`
}

export function markdownForPath(
  pathname: string,
  branding: SiteBranding,
): { status: number, body: string } | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { status: 200, body: homepageMarkdown(branding) }
  if (path === '/about') return { status: 200, body: aboutMarkdown(branding) }
  if (path === '/contact') return { status: 200, body: contactMarkdown(branding) }
  if (path === '/privacy') return { status: 200, body: privacyMarkdown(branding) }
  if (path.startsWith('/scan/')) {
    return {
      status: 200,
      body: `# ${branding.siteName} scan\n\nThis page shows live scan results for a public hostname in the HTML UI. Use \`GET /api/scan?url=\` for JSON. Home: ${absoluteUrl(branding.siteUrl, '/')}.\n`,
    }
  }
  if (path.startsWith('/api/') || path.startsWith('/_nuxt')) {
    return null
  }
  return { status: 404, body: notFoundMarkdown(branding) }
}
