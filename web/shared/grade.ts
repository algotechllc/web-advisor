import type { Grade } from './types/scan'

const GRADE_ORDER: Grade[] = ['A+', 'A', 'B', 'C', 'D', 'E', 'F']

export function gradeFromScore(score: number): Grade {
  if (score >= 95) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  if (score >= 30) return 'E'
  return 'F'
}

export function worseGrade(a: Grade, b: Grade): Grade {
  return GRADE_ORDER.indexOf(a) >= GRADE_ORDER.indexOf(b) ? a : b
}

export function gradeIsAtOrBelow(grade: Grade, threshold: Grade): boolean {
  return GRADE_ORDER.indexOf(grade) >= GRADE_ORDER.indexOf(threshold)
}
