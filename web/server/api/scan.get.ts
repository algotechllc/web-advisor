import type { ScanReport } from '../../shared/types/scan'
import { computeOverallGrade } from '../utils/grade'
import { assertPublicHost, normalizeScanUrl } from '../utils/url'
import { scanAgentic } from '../utils/scanners/agentic'
import { scanDns } from '../utils/scanners/dns'
import { scanDnssec } from '../utils/scanners/dnssec'
import { scanHeaders } from '../utils/scanners/headers'
import { scanSeo } from '../utils/scanners/seo'
import { scanTls } from '../utils/scanners/tls'

export default defineEventHandler(async (event): Promise<ScanReport> => {
  const query = getQuery(event)
  const rawUrl = typeof query.url === 'string' ? query.url : ''
  // `fresh` is accepted for future caching; scans are always live in MVP.
  void query.fresh

  const target = normalizeScanUrl(rawUrl)
  await assertPublicHost(target.host)

  const [headers, tls, dnssec, dns, seo, agenticResult] = await Promise.all([
    scanHeaders(target.href),
    scanTls(target.host),
    scanDnssec(target.host),
    scanDns(target.host),
    scanSeo(target.href),
    scanAgentic(target.href, target.host),
  ])

  const categories = {
    headers,
    tls,
    dnssec,
    dns,
    seo,
    agentic: agenticResult.category,
  }
  const { score, grade } = computeOverallGrade(categories)

  setHeader(event, 'Cache-Control', 'no-store')

  return {
    url: target.href,
    host: target.host,
    scannedAt: new Date().toISOString(),
    grade,
    score,
    categories,
    agenticMeta: agenticResult.meta,
  }
})
