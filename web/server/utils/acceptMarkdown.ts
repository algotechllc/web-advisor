export interface AcceptType {
  type: string
  q: number
}

export function parseAccept(header: string | undefined): AcceptType[] {
  if (!header?.trim()) return [{ type: '*/*', q: 1 }]
  return header
    .split(',')
    .map((part) => {
      const [rawType, ...params] = part.trim().split(';')
      const type = (rawType || '*/*').trim().toLowerCase()
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1
      return { type, q: Number.isFinite(q) ? q : 1 }
    })
    .sort((a, b) => b.q - a.q)
}

function qFor(list: AcceptType[], candidate: string, includeStarStar = false): number {
  const exact = list.find((item) => item.type === candidate)
  if (exact) return exact.q
  const [main] = candidate.split('/')
  const wildcard = list.find((item) => item.type === `${main}/*`)
  if (wildcard) return wildcard.q
  if (!includeStarStar) return 0
  const any = list.find((item) => item.type === '*/*')
  return any ? any.q : 0
}

export type MarkdownNegotiation = 'markdown' | 'html' | 'not_acceptable'

/**
 * Prefer Markdown only when it is explicitly acceptable and not outranked by HTML.
 * Empty Accept is treated as HTML (browsers).
 */
export function negotiateRepresentation(acceptHeader: string | undefined): MarkdownNegotiation {
  const parsed = parseAccept(acceptHeader)
  const markdownQ = qFor(parsed, 'text/markdown')
  const htmlQ = Math.max(qFor(parsed, 'text/html'), qFor(parsed, 'application/xhtml+xml'))
  const anyQ = qFor(parsed, '*/*', true)

  if (markdownQ <= 0 && htmlQ <= 0 && anyQ <= 0) return 'not_acceptable'
  if (markdownQ > 0 && markdownQ >= htmlQ && markdownQ >= anyQ) return 'markdown'
  if (htmlQ > 0 || anyQ > 0) return 'html'
  return 'not_acceptable'
}

export function shouldSkipMarkdownPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/')
    || pathname.startsWith('/_nuxt')
    || pathname.startsWith('/_ipx')
    || /\.[a-z0-9]+$/i.test(pathname)
  )
}
