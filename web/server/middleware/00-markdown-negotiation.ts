import { markdownForPath } from '../../shared/site'
import { negotiateRepresentation, shouldSkipMarkdownPath } from '../utils/acceptMarkdown'
import { useRequestSiteBranding } from '../utils/siteBranding'

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return

  const url = getRequestURL(event)
  const pathname = url.pathname
  if (shouldSkipMarkdownPath(pathname)) return

  const accept = getHeader(event, 'accept')
  const choice = negotiateRepresentation(accept)

  appendResponseHeader(event, 'Vary', 'Accept')

  if (choice === 'html') return

  if (choice === 'not_acceptable') {
    throw createError({
      statusCode: 406,
      statusMessage: 'Not Acceptable',
      message: 'Supported representations: text/html, text/markdown',
    })
  }

  const branding = useRequestSiteBranding()
  const page = markdownForPath(pathname, branding)
  if (!page) return

  setResponseStatus(event, page.status)
  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'Vary', 'Accept')
  return page.body
})
