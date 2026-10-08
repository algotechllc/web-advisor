import type { Finding } from '../../../shared/types/scan'
import { buildCategory } from '../grade'
import { dohAnswers, dohQuery } from '../doh'

/** DNS wire types */
const TYPE_TXT = 16
const TYPE_CAA = 257

function apexDomain(host: string): string {
  const labels = host.split('.').filter(Boolean)
  if (labels.length <= 2) return host
  return labels.slice(-2).join('.')
}

/** Normalize Cloudflare dns-json `data` strings (often quoted / escaped). */
function normalizeRrData(data: string): string {
  let value = data.trim()
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      value = JSON.parse(value) as string
    } catch {
      value = value.slice(1, -1).replace(/\\"/g, '"')
    }
  }
  // TXT may arrive as concatenated quoted chunks: "foo" "bar"
  return value.replace(/"\s*"/g, '')
}

function txtStrings(answers: { data: string }[]): string[] {
  return answers.map((a) => normalizeRrData(a.data))
}

async function hasSpf(host: string): Promise<{ passed: boolean, value?: string }> {
  try {
    const response = await dohQuery(host, 'TXT')
    const flat = txtStrings(dohAnswers(response, TYPE_TXT))
    const spf = flat.find((r) => r.toLowerCase().startsWith('v=spf1'))
    return { passed: !!spf, value: spf }
  } catch {
    return { passed: false }
  }
}

async function hasDmarc(host: string): Promise<{ passed: boolean, value?: string }> {
  try {
    const response = await dohQuery(`_dmarc.${host}`, 'TXT')
    const flat = txtStrings(dohAnswers(response, TYPE_TXT))
    const dmarc = flat.find((r) => r.toLowerCase().startsWith('v=dmarc1'))
    return { passed: !!dmarc, value: dmarc }
  } catch {
    return { passed: false }
  }
}

async function hasCaa(host: string): Promise<{ passed: boolean, value?: string }> {
  try {
    const response = await dohQuery(host, 'CAA')
    const records = dohAnswers(response, TYPE_CAA)
    if (!records.length) return { passed: false }

    const summary = records.map((r) => normalizeRrData(r.data)).join('; ')

    return { passed: true, value: summary }
  } catch {
    return { passed: false }
  }
}

export async function scanDns(host: string) {
  const apex = apexDomain(host)
  const [spf, dmarc, caa] = await Promise.all([
    hasSpf(apex),
    hasDmarc(apex),
    hasCaa(apex),
  ])

  const findings: Finding[] = [
    {
      id: 'spf',
      severity: 'medium',
      passed: spf.passed,
      title: 'SPF record',
      detail: spf.passed
        ? `SPF TXT record found for ${apex}.`
        : `No SPF TXT record (v=spf1) found for ${apex}.`,
      value: spf.value,
    },
    {
      id: 'dmarc',
      severity: 'medium',
      passed: dmarc.passed,
      title: 'DMARC record',
      detail: dmarc.passed
        ? `DMARC record found at _dmarc.${apex}.`
        : `No DMARC record found at _dmarc.${apex}.`,
      value: dmarc.value,
    },
    {
      id: 'caa',
      severity: 'low',
      passed: caa.passed,
      title: 'CAA records',
      detail: caa.passed
        ? `CAA records found for ${apex}.`
        : `No CAA records found for ${apex}. CAA limits which CAs may issue certificates.`,
      value: caa.value,
    },
  ]

  return buildCategory(findings)
}
