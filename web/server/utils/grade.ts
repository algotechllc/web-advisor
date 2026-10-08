import { gradeFromScore, worseGrade } from '../../shared/grade'
import type { CategoryResult, Finding, Grade, Severity } from '../../shared/types/scan'

export { gradeFromScore, worseGrade, gradeIsAtOrBelow } from '../../shared/grade'

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 5,
  info: 0,
}

export function scoreFromFindings(findings: Finding[]): number {
  let score = 100
  for (const finding of findings) {
    if (!finding.passed) {
      score -= SEVERITY_PENALTY[finding.severity]
    }
  }
  return Math.max(0, Math.min(100, score))
}

export function buildCategory(findings: Finding[]): CategoryResult {
  const score = scoreFromFindings(findings)
  return {
    score,
    grade: gradeFromScore(score),
    findings,
  }
}

export type ScanCategories = {
  headers: CategoryResult
  tls: CategoryResult
  dnssec: CategoryResult
  dns: CategoryResult
  seo: CategoryResult
  agentic: CategoryResult
}

/** Weighted overall grade across security, SEO, and agentic readiness. */
export function computeOverallGrade(categories: ScanCategories): { score: number, grade: Grade } {
  const score = Math.round(
    categories.headers.score * 0.35
    + categories.tls.score * 0.12
    + categories.dnssec.score * 0.1
    + categories.dns.score * 0.1
    + categories.seo.score * 0.16
    + categories.agentic.score * 0.17,
  )

  let grade = gradeFromScore(score)

  const tlsCriticalFail = categories.tls.findings.some((f) => !f.passed && f.severity === 'critical')
  const dnssecBroken = categories.dnssec.findings.some(
    (f) =>
      !f.passed
      && f.severity === 'high'
      && (f.id === 'dnssec-rrsig' || f.id === 'dnssec-zone' || f.id === 'dnssec-chain'),
  )

  if (tlsCriticalFail) {
    grade = worseGrade(grade, 'F')
  } else if (dnssecBroken) {
    grade = worseGrade(grade, 'D')
  } else if (categories.headers.grade === 'F') {
    grade = worseGrade(grade, 'F')
  } else if (categories.headers.grade === 'E') {
    grade = worseGrade(grade, 'E')
  }

  return { score, grade }
}
