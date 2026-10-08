import type { Finding } from '../../../shared/types/scan'
import { buildCategory } from '../grade'

const FETCH_TIMEOUT_MS = 12_000

function header(headers: Headers, name: string): string | null {
  return headers.get(name)
}

function cspDirective(policy: string, name: string): string | null {
  const parts = policy.split(';').map((p) => p.trim()).filter(Boolean)
  const match = parts.find((part) => {
    const [directive] = part.split(/\s+/)
    return directive?.toLowerCase() === name
  })
  return match ?? null
}

function hasNonceOrHash(directive: string | null): boolean {
  if (!directive) return false
  return /'nonce-[^']+'|'(sha256|sha384|sha512)-[^']+'/i.test(directive)
}

function hasStrictDynamic(directive: string | null): boolean {
  return !!directive && /'strict-dynamic'/i.test(directive)
}

function hasKeyword(directive: string | null, keyword: string): boolean {
  if (!directive) return false
  return new RegExp(`'${keyword}'`, 'i').test(directive)
}

/**
 * CSP grading aligned with CSP3 / securityheaders.com:
 * - missing CSP fails
 * - 'unsafe-inline' / 'unsafe-eval' do NOT fail when a nonce or hash is present
 *   (browsers ignore unsafe-inline beside nonce/hash; strict-dynamic also ignores it)
 * - style-src 'unsafe-inline' alone is noted but does not fail (common for CSS frameworks)
 * - script-src 'unsafe-inline' or 'unsafe-eval' without nonce/hash still fails
 */
function checkCsp(value: string | null): Finding {
  if (!value) {
    return {
      id: 'csp',
      severity: 'high',
      passed: false,
      title: 'Content-Security-Policy',
      detail: 'Missing Content-Security-Policy header. CSP helps mitigate XSS and data injection.',
    }
  }

  const scriptSrc = cspDirective(value, 'script-src') ?? cspDirective(value, 'default-src')
  const styleSrc = cspDirective(value, 'style-src') ?? cspDirective(value, 'default-src')
  const scriptProtected = hasNonceOrHash(scriptSrc) || hasStrictDynamic(scriptSrc)
  const styleProtected = hasNonceOrHash(styleSrc)

  const scriptUnsafeInline = hasKeyword(scriptSrc, 'unsafe-inline')
  const scriptUnsafeEval = hasKeyword(scriptSrc, 'unsafe-eval')
  const styleUnsafeInline = hasKeyword(styleSrc, 'unsafe-inline')

  const scriptWeak =
    (scriptUnsafeInline && !scriptProtected)
    || (scriptUnsafeEval && !hasNonceOrHash(scriptSrc))

  if (scriptWeak) {
    return {
      id: 'csp',
      severity: 'medium',
      passed: false,
      title: 'Content-Security-Policy',
      detail: scriptUnsafeEval && !hasNonceOrHash(scriptSrc)
        ? 'script-src allows unsafe-eval without a nonce/hash. Prefer removing unsafe-eval or pairing with nonces/hashes.'
        : 'script-src allows unsafe-inline without a nonce, hash, or strict-dynamic. Prefer nonces/hashes so inline fallbacks are ignored by modern browsers.',
      value,
    }
  }

  const notes: string[] = []
  if (scriptProtected && (scriptUnsafeInline || scriptUnsafeEval)) {
    notes.push(
      'script-src includes unsafe keywords as a legacy fallback; nonce/hash/strict-dynamic means modern browsers ignore unsafe-inline.',
    )
  }
  if (styleUnsafeInline && !styleProtected) {
    notes.push(
      'style-src allows unsafe-inline (common for CSS frameworks); noted but not failed, similar to securityheaders.com.',
    )
  }

  return {
    id: 'csp',
    severity: notes.length ? 'info' : 'high',
    passed: true,
    title: 'Content-Security-Policy',
    detail: notes.length
      ? `CSP is present. ${notes.join(' ')}`
      : 'CSP header is present with a modern script policy (or no common unsafe script keywords).',
    value,
  }
}

function checkHsts(value: string | null, isHttps: boolean): Finding {
  if (!isHttps) {
    return {
      id: 'hsts',
      severity: 'high',
      passed: false,
      title: 'Strict-Transport-Security',
      detail: 'HSTS only applies over HTTPS. Site was not reached via HTTPS.',
    }
  }
  if (!value) {
    return {
      id: 'hsts',
      severity: 'high',
      passed: false,
      title: 'Strict-Transport-Security',
      detail: 'Missing Strict-Transport-Security header.',
    }
  }
  const maxAgeMatch = /max-age=(\d+)/i.exec(value)
  const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 0
  const hasIncludeSub = /includesubdomains/i.test(value)
  const ok = maxAge >= 15_552_000
  return {
    id: 'hsts',
    severity: 'high',
    passed: ok,
    title: 'Strict-Transport-Security',
    detail: ok
      ? `HSTS is set with max-age=${maxAge}${hasIncludeSub ? ' and includeSubDomains' : ''}.`
      : `HSTS max-age is ${maxAge || 'missing'}; recommend at least 15552000 (180 days).`,
    value,
  }
}

function checkXcto(value: string | null): Finding {
  const ok = (value ?? '').toLowerCase() === 'nosniff'
  return {
    id: 'x-content-type-options',
    severity: 'medium',
    passed: ok,
    title: 'X-Content-Type-Options',
    detail: ok
      ? 'X-Content-Type-Options is set to nosniff.'
      : 'Missing or incorrect X-Content-Type-Options (expected nosniff).',
    value: value ?? undefined,
  }
}

function checkClickjacking(xfo: string | null, csp: string | null): Finding {
  const cspLower = (csp ?? '').toLowerCase()
  const hasFrameAncestors = cspLower.includes('frame-ancestors')
  const xfoLower = (xfo ?? '').toLowerCase()
  const xfoOk = xfoLower === 'deny' || xfoLower === 'sameorigin'
  const passed = hasFrameAncestors || xfoOk
  return {
    id: 'clickjacking',
    severity: 'medium',
    passed,
    title: 'Clickjacking protection',
    detail: passed
      ? hasFrameAncestors
        ? 'CSP frame-ancestors directive is present.'
        : `X-Frame-Options is set to ${xfo}.`
      : 'Missing X-Frame-Options and CSP frame-ancestors.',
    value: xfo ?? (hasFrameAncestors ? 'frame-ancestors in CSP' : undefined),
  }
}

function checkReferrerPolicy(value: string | null): Finding {
  const okValues = new Set([
    'no-referrer',
    'same-origin',
    'strict-origin',
    'strict-origin-when-cross-origin',
  ])
  const passed = !!value && okValues.has(value.toLowerCase())
  return {
    id: 'referrer-policy',
    severity: 'low',
    passed,
    title: 'Referrer-Policy',
    detail: passed
      ? `Referrer-Policy is set to ${value}.`
      : 'Missing or weak Referrer-Policy. Prefer strict-origin-when-cross-origin or stricter.',
    value: value ?? undefined,
  }
}

function checkPermissionsPolicy(value: string | null): Finding {
  return {
    id: 'permissions-policy',
    severity: 'low',
    passed: !!value,
    title: 'Permissions-Policy',
    detail: value
      ? 'Permissions-Policy header is present.'
      : 'Missing Permissions-Policy header to restrict powerful browser features.',
    value: value ?? undefined,
  }
}

function checkCoop(value: string | null): Finding {
  const ok = !!value && /same-origin/i.test(value)
  return {
    id: 'coop',
    severity: 'info',
    passed: ok,
    title: 'Cross-Origin-Opener-Policy',
    detail: ok
      ? 'COOP is set to isolate the browsing context.'
      : 'Cross-Origin-Opener-Policy is not set (optional hardening).',
    value: value ?? undefined,
  }
}

export async function scanHeaders(targetUrl: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebAdvisorBot/1.0 (+https://web-advisor.local)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    })
  } catch (error) {
    clearTimeout(timer)
    const message = error instanceof Error ? error.message : 'Fetch failed'
    return buildCategory([
      {
        id: 'fetch',
        severity: 'critical',
        passed: false,
        title: 'Reachability',
        detail: `Could not fetch the URL: ${message}`,
      },
    ])
  } finally {
    clearTimeout(timer)
  }

  const headers = response.headers
  const finalUrl = response.url || targetUrl
  const isHttps = finalUrl.startsWith('https:')
  const csp = header(headers, 'content-security-policy')

  const findings: Finding[] = [
    {
      id: 'fetch',
      severity: 'critical',
      passed: response.ok || (response.status >= 300 && response.status < 500),
      title: 'Reachability',
      detail: `Responded with HTTP ${response.status}${response.url && response.url !== targetUrl ? ` (final URL ${response.url})` : ''}.`,
      value: String(response.status),
    },
    checkCsp(csp),
    checkHsts(header(headers, 'strict-transport-security'), isHttps),
    checkXcto(header(headers, 'x-content-type-options')),
    checkClickjacking(header(headers, 'x-frame-options'), csp),
    checkReferrerPolicy(header(headers, 'referrer-policy')),
    checkPermissionsPolicy(header(headers, 'permissions-policy')),
    checkCoop(header(headers, 'cross-origin-opener-policy')),
  ]

  return buildCategory(findings)
}
