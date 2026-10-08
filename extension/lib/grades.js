export const GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D', 'E', 'F']

export function gradeIsAtOrBelow(grade, threshold) {
  return GRADE_ORDER.indexOf(grade) >= GRADE_ORDER.indexOf(threshold)
}

export function badgeColor(grade) {
  if (grade === 'A+' || grade === 'A') {
    return { color: '#0b1220', background: '#34d399' }
  }
  if (grade === 'B') {
    return { color: '#0b1220', background: '#2dd4bf' }
  }
  if (grade === 'C') {
    return { color: '#0b1220', background: '#f59e0b' }
  }
  return { color: '#ffffff', background: '#f43f5e' }
}

export function badgeText(grade) {
  if (grade === 'A+') return 'A+'
  return grade.slice(0, 2)
}
