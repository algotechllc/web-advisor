const FETCH_TIMEOUT_MS = 12_000

export interface FetchedHtml {
  ok: boolean
  status: number
  finalUrl: string
  html: string
  contentType: string | null
  error?: string
}

export async function fetchHtml(targetUrl: string): Promise<FetchedHtml> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebAdvisorBot/1.0 (+https://web-advisor.local)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    })
    const contentType = response.headers.get('content-type')
    const html = await response.text()
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url || targetUrl,
      html,
      contentType,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: targetUrl,
      html: '',
      contentType: null,
      error: error instanceof Error ? error.message : 'Fetch failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

export function metaContent(html: string, nameOrProperty: string): string | null {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`,
      'i',
    ),
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(html)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return null
}

export function linkHref(html: string, rel: string): string | null {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<link[^>]+rel=["']${escaped}["'][^>]+href=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${escaped}["'][^>]*>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(html)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return null
}

export function documentTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html)
  const title = match?.[1]?.trim()
  return title || null
}

export function hasJsonLd(html: string): boolean {
  return /<script[^>]+type=["']application\/ld\+json["'][^>]*>/i.test(html)
}
