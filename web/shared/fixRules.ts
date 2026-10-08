export type ScanCategoryKey = 'headers' | 'tls' | 'dnssec' | 'dns' | 'seo' | 'agentic'

export interface FixRule {
  issue: string
  fix: string
}

/** Remediation guidance keyed by finding id. */
export const FIX_RULES: Record<string, FixRule> = {
  // Headers
  csp: {
    issue:
      'Content-Security-Policy is missing, or script-src allows unsafe-inline / unsafe-eval without a nonce or hash.',
    fix:
      'Keep a CSP. For scripts, prefer per-request nonces or hashes (optionally with \'strict-dynamic\'). \'unsafe-inline\' next to a nonce/hash is a legacy fallback and is ignored by modern browsers. style-src \'unsafe-inline\' is common and usually acceptable. On Nuxt, use nuxt-security with nonce: true.',
  },
  hsts: {
    issue:
      'Strict-Transport-Security is missing or max-age is too short, so browsers may still use plain HTTP.',
    fix:
      'Serve over HTTPS, then add Strict-Transport-Security: max-age=15552000; includeSubDomains (180 days minimum). After validating all subdomains on HTTPS, consider adding preload and submitting to the HSTS preload list.',
  },
  'x-content-type-options': {
    issue:
      'X-Content-Type-Options is missing or not nosniff, so browsers may MIME-sniff responses.',
    fix: 'Set X-Content-Type-Options: nosniff on all responses.',
  },
  clickjacking: {
    issue:
      'The site lacks clickjacking protection (no CSP frame-ancestors and no X-Frame-Options).',
    fix:
      'Prefer Content-Security-Policy with frame-ancestors \'none\' (or an explicit allowlist). Alternatively set X-Frame-Options: DENY or SAMEORIGIN.',
  },
  'referrer-policy': {
    issue: 'Referrer-Policy is missing or too permissive, which can leak URL data cross-origin.',
    fix:
      'Set Referrer-Policy: strict-origin-when-cross-origin (or stricter: strict-origin / no-referrer) on responses.',
  },
  'permissions-policy': {
    issue:
      'Permissions-Policy is missing, so powerful browser features may remain available by default.',
    fix:
      'Add Permissions-Policy disabling unused features, for example: camera=(), microphone=(), geolocation=(), payment=(). Enable only what the product needs.',
  },
  coop: {
    issue:
      'Cross-Origin-Opener-Policy is not set, so the browsing context is not isolated from cross-origin openers.',
    fix:
      'If isolation is acceptable for the app, set Cross-Origin-Opener-Policy: same-origin (often paired with Cross-Origin-Embedder-Policy when needed for cross-origin isolation).',
  },
  fetch: {
    issue: 'The scanner could not reliably fetch the site, so header posture may be incomplete.',
    fix:
      'Ensure the origin responds publicly over HTTPS with a normal HTML or app response, without blocking security scanners by IP or bot rules for this health check.',
  },

  // TLS
  'tls-connect': {
    issue: 'TLS could not be established for the host.',
    fix:
      'Terminate TLS correctly on port 443 with a valid certificate chain. Fix hostname/SNI mismatches and ensure the load balancer or edge proxy forwards HTTPS traffic.',
  },
  'cert-trusted': {
    issue: 'The certificate chain is not trusted by standard CA stores.',
    fix:
      'Install a certificate from a public CA (or complete the intermediate chain). Avoid expired, self-signed, or incomplete chains in production.',
  },
  'cert-validity': {
    issue: 'The certificate is expired, not yet valid, or expires within 14 days.',
    fix:
      'Renew the certificate (automate with ACME/Let\'s Encrypt or your CA). Aim to renew at least 30 days before expiry and monitor expiration.',
  },
  'https-redirect': {
    issue: 'HTTP does not redirect to HTTPS.',
    fix:
      'Configure the edge/server so HTTP (port 80) issues a 301/308 redirect to the HTTPS URL. Keep HSTS in place after HTTPS works everywhere.',
  },

  // DNSSEC
  'dnssec-zone': {
    issue: 'The zone is not DNSSEC-delegated, or DS exists without a usable DNSKEY.',
    fix:
      'Enable DNSSEC at your DNS provider for the zone, publish DNSKEY, and ensure the parent has matching DS records. If DS exists without DNSKEY, complete or roll back the broken delegation.',
  },
  'dnssec-rrsig': {
    issue: 'The zone claims DNSSEC but owner records lack RRSIGs.',
    fix:
      'Confirm DNSSEC signing is enabled for the zone and that records (including CNAMEs) are signed. Re-sign or repair provider DNSSEC if signatures are missing.',
  },
  'dnssec-chain': {
    issue: 'The full DNS resolution chain was not authenticated.',
    fix:
      'If the owner name is signed but AD is unset because of a CNAME to an unsigned CDN target, that can be expected. For real failures (missing signatures with DS present), fix zone signing. Prefer keeping critical records in a signed zone end-to-end when possible.',
  },
  'dnssec-ds': {
    issue: 'No DS record was found for an ancestor zone.',
    fix:
      'After enabling DNSSEC, publish DS at the parent (registrar/registry) using the digests your DNS provider supplies.',
  },
  'dnssec-dnskey': {
    issue: 'DNSKEY records were not found for the signed zone.',
    fix:
      'Publish DNSKEY in the zone via your DNS provider and keep key-signing/zone-signing keys healthy during rollovers.',
  },

  // DNS hygiene
  spf: {
    issue: 'No SPF TXT record (v=spf1) was found for the apex domain.',
    fix:
      'Add a TXT record at the apex: v=spf1 with mechanisms for your mail senders, ending in ~all or -all. Keep to one SPF record and stay under DNS lookup limits.',
  },
  dmarc: {
    issue: 'No DMARC record was found at _dmarc.<domain>.',
    fix:
      'Add a TXT record at _dmarc.<domain>: v=DMARC1; p=none; rua=mailto:dmarc@your-domain (start with p=none, then move to quarantine/reject after monitoring).',
  },
  caa: {
    issue: 'No CAA records were found, so any CA may issue certificates for the domain.',
    fix:
      'Add CAA records allowing only your chosen CAs, for example: 0 issue "letsencrypt.org" (and issuewild if you use wildcards). Include an iodef contact if desired.',
  },

  // SEO
  'seo-title': {
    issue: 'The document title is missing or poorly sized for search/social previews.',
    fix: 'Set a unique <title> of roughly 50–60 characters that names the page clearly.',
  },
  'seo-description': {
    issue: 'Meta description is missing or outside a useful length range.',
    fix: 'Add <meta name="description" content="..."> around 120–160 characters summarizing the page.',
  },
  'seo-og-title': {
    issue: 'og:title is missing, so social previews may fall back inconsistently.',
    fix: 'Add <meta property="og:title" content="..."> matching the intended share title.',
  },
  'seo-og-description': {
    issue: 'og:description is missing for social previews.',
    fix: 'Add <meta property="og:description" content="..."> with a concise share blurb.',
  },
  'seo-og-image': {
    issue: 'og:image is missing or not an absolute HTTP(S) URL.',
    fix: 'Add <meta property="og:image" content="https://.../og.png"> (about 1200×630) and ensure the image is publicly reachable.',
  },
  'seo-og-url': {
    issue: 'og:url is missing.',
    fix: 'Add <meta property="og:url" content="https://your-canonical-url">.',
  },
  'seo-og-type': {
    issue: 'og:type is missing.',
    fix: 'Add <meta property="og:type" content="website"> (or article when appropriate).',
  },
  'seo-twitter-card': {
    issue: 'twitter:card is missing and there is no strong Open Graph fallback.',
    fix: 'Add <meta name="twitter:card" content="summary_large_image"> plus title/description/image tags as needed.',
  },
  'seo-twitter-image': {
    issue: 'twitter:image is missing and og:image is unavailable.',
    fix: 'Set twitter:image or ensure og:image is present as a fallback.',
  },
  'seo-canonical': {
    issue: 'rel=canonical is missing.',
    fix: 'Add <link rel="canonical" href="https://..."> pointing at the preferred URL.',
  },
  'seo-robots': {
    issue: 'robots meta may block indexing.',
    fix: 'Remove noindex unless the page should stay out of search results.',
  },

  // Agentic (local probes + Is Agentic API ids)
  'agentic-report-missing': {
    issue: 'No completed Is Agentic report is stored for this host.',
    fix: 'Open the Is Agentic scan page for this host, start a scan there, wait for it to finish, then rescan in Web Advisor. The public report API cannot start scans.',
  },
  'agentic-llms-txt': {
    issue: '/llms.txt is missing or empty.',
    fix: 'Publish /llms.txt with when-to-use guidance, key URLs, and how agents should interact with your product. See https://is-agentic.com/docs',
  },
  'agentic-robots': {
    issue: 'robots.txt is missing or invalid.',
    fix: 'Publish /robots.txt with User-agent rules and a Sitemap line when applicable.',
  },
  'agentic-sitemap': {
    issue: 'No XML sitemap was found at /sitemap.xml.',
    fix: 'Publish a valid XML sitemap at /sitemap.xml listing indexable URLs.',
  },
  'agentic-markdown': {
    issue: 'Homepage does not negotiate Markdown for Accept: text/markdown.',
    fix: 'Serve text/markdown with Vary: Accept for Markdown clients while keeping HTML for browsers. See https://is-agentic.com/docs and acceptmarkdown.com.',
  },
  'agentic-json-ld': {
    issue: 'Homepage lacks JSON-LD structured data.',
    fix: 'Add application/ld+json for Organization, SoftwareApplication, or another matching schema.org type.',
  },
  'agentic-site-type': {
    issue: 'is-agentic-site-type meta is missing or invalid.',
    fix: 'Add <meta name="is-agentic-site-type" content="app"> (or content, business, store).',
  },
  'agentic-api-error': {
    issue: 'The Is Agentic report API could not be used for this URL.',
    fix: 'Retry later, or start a scan at https://is-agentic.com/ and rescan after it completes.',
  },
}

export const CATEGORY_LABELS: Record<ScanCategoryKey, string> = {
  headers: 'Security headers',
  tls: 'TLS / certificate',
  dnssec: 'DNSSEC',
  dns: 'DNS hygiene',
  seo: 'SEO / social',
  agentic: 'Is Agentic',
}

export type ReportTabId = 'security' | 'seo' | 'agentic'

export interface ReportTab {
  id: ReportTabId
  label: string
  description: string
  categories: ScanCategoryKey[]
}

export const REPORT_TABS: ReportTab[] = [
  {
    id: 'security',
    label: 'Security',
    description: 'Headers, TLS, DNSSEC, and DNS hygiene',
    categories: ['headers', 'tls', 'dnssec', 'dns'],
  },
  {
    id: 'seo',
    label: 'SEO',
    description: 'Titles, descriptions, Open Graph, and social previews',
    categories: ['seo'],
  },
  {
    id: 'agentic',
    label: 'Is Agentic',
    description: 'Agent readiness via Is Agentic and local probes',
    categories: ['agentic'],
  },
]

export function ruleForFinding(id: string, detail: string): FixRule {
  if (FIX_RULES[id]) return FIX_RULES[id]

  // Is Agentic API findings embed the recommendation in detail already.
  if (id.startsWith('agentic-')) {
    return {
      issue: detail.split(' Recommendation: ')[0] || detail,
      fix:
        detail.includes('Recommendation: ')
          ? detail.split(' Recommendation: ').slice(1).join(' Recommendation: ')
          : 'Follow the Is Agentic recommendation and docs at https://is-agentic.com/docs',
    }
  }

  return {
    issue: detail,
    fix: 'Review the finding detail and apply the corresponding configuration for this check.',
  }
}
