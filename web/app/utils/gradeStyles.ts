import type { Grade } from '#shared/types/scan'

export function gradeTone(grade: Grade): string {
  if (grade === 'A+' || grade === 'A') return 'text-ok border-ok/40 bg-ok/10'
  if (grade === 'B') return 'text-accent border-accent/40 bg-accent/10'
  if (grade === 'C') return 'text-warn border-warn/40 bg-warn/10'
  return 'text-danger border-danger/40 bg-danger/10'
}

export function gradeBadgeBg(grade: Grade): string {
  if (grade === 'A+' || grade === 'A') return 'bg-ok text-ink'
  if (grade === 'B') return 'bg-accent text-ink'
  if (grade === 'C') return 'bg-warn text-ink'
  return 'bg-danger text-white'
}
