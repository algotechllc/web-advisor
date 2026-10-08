import { missingAgenticScanFinding, reportUrlForHost } from '../../../shared/agentic'
import type { AgenticMeta, CategoryResult, Finding, Severity } from '../../../shared/types/scan'
import { buildCategory } from '../grade'
import { fetchHtml, hasJsonLd, metaContent } from '../fetchHtml'

const DOCS_URL = 'https://is-agentic.com/docs'

interface AgenticIssue {
  id: string
  name: string
  details: string
  recommendation: string
  result: 'passed' | 'failed' | 'partial' | string
  tier?: string
}

interface AgenticReport {
  target: string
  display_target?: string
  report_url: string
  score: number
  score_label?: string
  scanned_at?: string
  eligible_checks?: number
  score_breakdown?: AgenticMeta['breakdown']
  issues: AgenticIssue[]
}

export interface AgenticScanResult {
  category: CategoryResult
  meta: AgenticMeta
}

function severityForIssue(issue: AgenticIssue): Severity {
  if (issue.result === 'partial') return issue.tier === 'essential' ? 'medium' : 'low'
  if (issue.tier === 'essential') return 'high'
  if (issue.tier === 'recommended') return 'medium'
  return 'low'
}

function mapApiIssue(issue: AgenticIssue): Finding {
  const passed = issue.result === 'passed'
  return {
    id: `agentic-${issue.id}`,
    severity: passed ? 'info' : severityForIssue(issue),
    passed,
    title: issue.name,
    detail: passed
      ? issue.details
      : `${issue.details} Recommendation: ${issue.recommendation}`,
    value: `${issue.result}${issue.tier ? ` · ${issue.tier}` : ''}`,
  }
}

async function fetchText(
  url: string,
  accept = '*/*',
): Promise<{ status: number, contentType: string | null, body: string, ok: boolean }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebAdvisorBot/1.0 (+https://web-advisor.local)',
        Accept: accept,
      },
    })
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      body: await response.text(),
      ok: response.ok,
    }
  } catch {
    return { status: 0, contentType: null, body: '', ok: false }
  } finally {
    clearTimeout(timer)
  }
}

/** Lightweight local probes when Is Agentic has no stored report yet. */
async function localAgenticChecks(targetUrl: string, host: string): Promise<Finding[]> {
  const origin = new URL(targetUrl).origin

  const [page, llms, robots, sitemap, markdown] = await Promise.all([
    fetchHtml(targetUrl),
    fetchText(new URL('/llms.txt', origin).toString(), 'text/plain,*/*'),
    fetchText(new URL('/robots.txt', origin).toString(), 'text/plain,*/*'),
    fetchText(new URL('/sitemap.xml', origin).toString(), 'application/xml,text/xml,*/*'),
    fetchText(targetUrl, 'text/markdown'),
  ])

  const siteType = page.html ? metaContent(page.html, 'is-agentic-site-type') : null
  const markdownOk =
    markdown.ok
    && !!markdown.contentType?.toLowerCase().includes('text/markdown')
    && markdown.body.trim().length > 0

  return [
    missingAgenticScanFinding(host),
    {
      id: 'agentic-llms-txt',
      severity: 'medium',
      passed: llms.ok && llms.body.trim().length > 20,
      title: 'llms.txt',
      detail: llms.ok && llms.body.trim().length > 20
        ? 'Found /llms.txt with content.'
        : 'Missing or empty /llms.txt. Agents use this for when-to-use guidance and site orientation.',
    },
    {
      id: 'agentic-robots',
      severity: 'low',
      passed: robots.ok && /user-agent:/i.test(robots.body),
      title: 'robots.txt',
      detail: robots.ok && /user-agent:/i.test(robots.body)
        ? 'robots.txt is present.'
        : 'Missing or invalid robots.txt.',
    },
    {
      id: 'agentic-sitemap',
      severity: 'medium',
      passed: sitemap.ok && /<urlset|<sitemapindex/i.test(sitemap.body),
      title: 'Sitemap',
      detail: sitemap.ok && /<urlset|<sitemapindex/i.test(sitemap.body)
        ? 'XML sitemap found at /sitemap.xml.'
        : 'No XML sitemap found at /sitemap.xml.',
    },
    {
      id: 'agentic-markdown',
      severity: 'high',
      passed: markdownOk,
      title: 'Markdown content negotiation',
      detail: markdownOk
        ? 'Homepage responds to Accept: text/markdown with a Markdown body.'
        : `Homepage Markdown negotiation failed (status ${markdown.status}, content-type ${markdown.contentType || 'none'}). See acceptmarkdown.com / Is Agentic docs.`,
      value: markdown.contentType ?? undefined,
    },
    {
      id: 'agentic-json-ld',
      severity: 'medium',
      passed: !!page.html && hasJsonLd(page.html),
      title: 'JSON-LD structured data',
      detail: page.html && hasJsonLd(page.html)
        ? 'JSON-LD script found on the homepage.'
        : 'No application/ld+json structured data found on the homepage.',
    },
    {
      id: 'agentic-site-type',
      severity: 'low',
      passed: !!siteType && ['content', 'business', 'app', 'store'].includes(siteType),
      title: 'is-agentic-site-type meta',
      detail: siteType
        ? ['content', 'business', 'app', 'store'].includes(siteType)
          ? `Declared site type: ${siteType}.`
          : `Invalid is-agentic-site-type value: ${siteType}. Use content, business, app, or store.`
        : 'Missing meta name="is-agentic-site-type". Optional, but helps choose the Is Agentic lens.',
      value: siteType ?? undefined,
    },
  ]
}

export async function scanAgentic(targetUrl: string, host: string): Promise<AgenticScanResult> {
  const apiUrl = `https://is-agentic.com/api/v1/report?url=${encodeURIComponent(targetUrl)}`
  const fallbackUrl = reportUrlForHost(host)

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'WebAdvisorBot/1.0 (+https://web-advisor.local)',
      },
    })

    if (response.status === 404) {
      return {
        category: buildCategory(await localAgenticChecks(targetUrl, host)),
        meta: {
          source: 'local',
          reportUrl: fallbackUrl,
          docsUrl: DOCS_URL,
        },
      }
    }

    if (!response.ok) {
      const detail = await response.text()
      return {
        category: buildCategory([
          {
            id: 'agentic-api-error',
            severity: 'medium',
            passed: false,
            title: 'Is Agentic API',
            detail: `Is Agentic report API returned HTTP ${response.status}. ${detail.slice(0, 240)}`,
            value: apiUrl,
          },
          ...(await localAgenticChecks(targetUrl, host)).filter((f) => f.id !== 'agentic-report-missing'),
        ]),
        meta: {
          source: 'error',
          reportUrl: fallbackUrl,
          docsUrl: DOCS_URL,
        },
      }
    }

    const report = (await response.json()) as AgenticReport
    const findings: Finding[] = [
      {
        id: 'agentic-score',
        severity: 'info',
        passed: report.score >= 70,
        title: 'Is Agentic score',
        detail:
          `Official score ${report.score}/100`
          + (report.score_label ? ` (${report.score_label})` : '')
          + `. Full report: ${report.report_url}`,
        value: String(report.score),
      },
      ...report.issues.map(mapApiIssue),
    ]

    return {
      category: buildCategory(findings),
      meta: {
        source: 'api',
        reportUrl: report.report_url || fallbackUrl,
        docsUrl: DOCS_URL,
        score: report.score,
        scoreLabel: report.score_label,
        scannedAt: report.scanned_at,
        eligibleChecks: report.eligible_checks,
        breakdown: report.score_breakdown,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    return {
      category: buildCategory([
        {
          id: 'agentic-api-error',
          severity: 'medium',
          passed: false,
          title: 'Is Agentic API',
          detail: `Could not reach Is Agentic: ${message}`,
        },
        ...(await localAgenticChecks(targetUrl, host)),
      ]),
      meta: {
        source: 'error',
        reportUrl: fallbackUrl,
        docsUrl: DOCS_URL,
      },
    }
  }
}
