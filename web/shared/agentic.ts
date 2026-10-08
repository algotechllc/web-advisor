import type { Finding } from './types/scan'

export function reportUrlForHost(host: string): string {
  return `https://is-agentic.com/scan/${encodeURIComponent(host)}`
}

/** Official Is Agentic JSON API never starts a scan; 404 means none is stored yet. */
export function missingAgenticScanFinding(host: string): Finding {
  const scanStartUrl = reportUrlForHost(host)
  return {
    id: 'agentic-report-missing',
    severity: 'medium',
    passed: false,
    required: true,
    title: 'Is Agentic stored report',
    detail:
      'No completed Is Agentic report is stored yet. Local probes ran instead. '
      + 'Start a scan on Is Agentic (the public API cannot start one), then rescan here to import the official score.',
    value: 'missing',
    actionLabel: 'Start Is Agentic scan',
    actionUrl: scanStartUrl,
  }
}
