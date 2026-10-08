export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface Finding {
  id: string
  severity: Severity
  passed: boolean
  title: string
  detail: string
  value?: string
  /** When true and failed, UI labels the finding as required (orange). */
  required?: boolean
  actionLabel?: string
  actionUrl?: string
}

export interface CategoryResult {
  grade: Grade
  score: number
  findings: Finding[]
}

export interface AgenticScoreBucket {
  earned: number
  available: number
  passing: number
  total: number
}

export interface AgenticMeta {
  source: 'api' | 'local' | 'error'
  reportUrl: string
  docsUrl: string
  score?: number
  scoreLabel?: string
  scannedAt?: string
  eligibleChecks?: number
  breakdown?: {
    essential: AgenticScoreBucket
    recommended: AgenticScoreBucket
    bonus: { points: number, positive_signals: number }
  }
}

export interface ScanReport {
  url: string
  host: string
  scannedAt: string
  grade: Grade
  score: number
  categories: {
    headers: CategoryResult
    tls: CategoryResult
    dnssec: CategoryResult
    dns: CategoryResult
    seo: CategoryResult
    agentic: CategoryResult
  }
  agenticMeta?: AgenticMeta
}
