import { robotsTxt } from '../../shared/site'
import { useRequestSiteBranding } from '../utils/siteBranding'

export default defineEventHandler((event) => {
  const branding = useRequestSiteBranding()
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  return robotsTxt(branding)
})
