function gradeClass(grade) {
  if (grade === 'A+' || grade === 'A') return 'good'
  if (grade === 'B') return 'fair'
  if (grade === 'C') return 'warn'
  return 'bad'
}

function render(payload) {
  const hostEl = document.getElementById('host')
  const gradeEl = document.getElementById('grade')
  const scoreEl = document.getElementById('score')
  const statusEl = document.getElementById('status')
  const reportEl = document.getElementById('report')

  if (!payload?.ok || !payload.data) {
    hostEl.textContent = 'Unavailable'
    gradeEl.textContent = '?'
    gradeEl.className = 'grade'
    scoreEl.textContent = ''
    statusEl.textContent = payload?.error || 'Could not scan this tab.'
    reportEl.setAttribute('aria-disabled', 'true')
    return
  }

  hostEl.textContent = payload.data.host
  gradeEl.textContent = payload.data.grade
  gradeEl.className = `grade ${gradeClass(payload.data.grade)}`
  scoreEl.textContent = `${payload.data.score}/100`
  statusEl.textContent = 'Grade based on headers, TLS, DNSSEC, and DNS hygiene.'
  reportEl.href = payload.reportUrl
  reportEl.removeAttribute('aria-disabled')
}

async function load() {
  const response = await chrome.runtime.sendMessage({ type: 'getCurrentScan' })
  render(response)
}

document.getElementById('rescan').addEventListener('click', async () => {
  document.getElementById('status').textContent = 'Rescanning…'
  const response = await chrome.runtime.sendMessage({ type: 'rescanCurrent' })
  render(response)
})

load()
