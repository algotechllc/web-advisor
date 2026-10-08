import { sitemapXml } from '../../shared/site'
import { useRequestSiteBranding } from '../utils/siteBranding'

export default defineEventHandler((event) => {
  const branding = useRequestSiteBranding()
  const lastmod = new Date().toISOString().slice(0, 10)
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  return sitemapXml(branding, lastmod)
})
