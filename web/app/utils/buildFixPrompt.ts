import type { Finding, ScanReport } from '#shared/types/scan'
import {
  CATEGORY_LABELS,
  ruleForFinding,
  type ScanCategoryKey,
} from '#shared/fixRules'

function formatFinding(finding: Finding): string {
  const rule = ruleForFinding(finding.id, finding.detail)
  const lines = [
    `### ${finding.title} (\`${finding.id}\`)`,
    `- Severity: ${finding.severity}`,
    `- Observed: ${finding.detail}`,
  ]
  if (finding.value) {
    lines.push(`- Current value: \`${finding.value}\``)
  }
  lines.push(`- Potential issue: ${rule.issue}`)
  lines.push(`- How to fix: ${rule.fix}`)
  return lines.join('\n')
}

export function buildFixPrompt(
  report: ScanReport,
  selected: ScanCategoryKey[],
): string {
  const categories = selected.filter((key) => key in report.categories)
  if (!categories.length) {
    return 'Select at least one category to generate a fix prompt.'
  }

  const sections: string[] = []

  for (const key of categories) {
    const failed = report.categories[key].findings.filter((f) => !f.passed)
    if (!failed.length) continue

    const body = failed.map(formatFinding).join('\n\n')
    sections.push(`## ${CATEGORY_LABELS[key]} (grade ${report.categories[key].grade})\n\n${body}`)
  }

  if (!sections.length) {
    return [
      `Improve the security posture of ${report.host} (${report.url}).`,
      '',
      `Selected categories: ${categories.map((k) => CATEGORY_LABELS[k]).join(', ')}.`,
      '',
      'There are no failed findings in the selected categories. Confirm the current configuration is intentional and suggest optional hardening only if useful. Keep compatibility with existing plugins and third-party libraries when recommending stricter policies.',
    ].join('\n')
  }

  return [
    `Help fix the security findings below for ${report.host} (${report.url}).`,
    '',
    `Overall grade from Web Advisor: ${report.grade} (score ${report.score}/100).`,
    `Scanned at: ${report.scannedAt}.`,
    '',
    'Instructions:',
    '- Work only on the failed findings listed.',
    '- For each finding, explain the risk briefly, then propose a concrete fix (config snippets, DNS records, or code/infra changes as appropriate).',
    '- Prefer production-safe defaults. Call out breaking-change risks (especially CSP and HSTS preload).',
    '- Maximize compatibility: inspect the app for plugins, third-party scripts, CDNs, analytics, tag managers, fonts, embeds, auth widgets, and libraries that need less restrictive policies (for example CSP script-src/style-src/img-src/connect-src/frame-src allowlists, or Permissions-Policy exceptions). Prefer narrow allowlists over unsafe-inline / unsafe-eval when possible.',
    '- If the stack is unknown, give options for common setups (Nginx, Cloudflare, Vercel/Next.js, and generic HTTP response headers).',
    '- End with a prioritized checklist.',
    '',
    'Findings to fix:',
    '',
    ...sections,
  ].join('\n')
}
