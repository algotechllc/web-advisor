import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { missingAgenticScanFinding, reportUrlForHost } from '../shared/agentic.ts'

describe('missing Is Agentic scan', () => {
  it('is required, orange (medium), and links to the scan start page', () => {
    const finding = missingAgenticScanFinding('example.com')
    assert.equal(finding.id, 'agentic-report-missing')
    assert.equal(finding.passed, false)
    assert.equal(finding.required, true)
    assert.equal(finding.severity, 'medium')
    assert.equal(finding.actionLabel, 'Start Is Agentic scan')
    assert.equal(finding.actionUrl, reportUrlForHost('example.com'))
    assert.equal(finding.actionUrl, 'https://is-agentic.com/scan/example.com')
  })
})
