import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { negotiateRepresentation, parseAccept, shouldSkipMarkdownPath } from '../server/utils/acceptMarkdown.ts'

describe('parseAccept', () => {
  it('defaults empty Accept to */*', () => {
    assert.deepEqual(parseAccept(undefined), [{ type: '*/*', q: 1 }])
  })

  it('reads q values', () => {
    const parsed = parseAccept('text/html;q=0.8, text/markdown')
    assert.equal(parsed[0]?.type, 'text/markdown')
    assert.equal(parsed[0]?.q, 1)
  })
})

describe('negotiateRepresentation', () => {
  it('serves HTML for browsers', () => {
    assert.equal(negotiateRepresentation('text/html,application/xhtml+xml'), 'html')
    assert.equal(negotiateRepresentation(undefined), 'html')
  })

  it('serves Markdown when agents ask for it', () => {
    assert.equal(negotiateRepresentation('text/markdown'), 'markdown')
    assert.equal(negotiateRepresentation('text/markdown, text/html;q=0.9'), 'markdown')
  })

  it('returns 406 when no supported type is listed', () => {
    assert.equal(negotiateRepresentation('image/png'), 'not_acceptable')
  })
})

describe('shouldSkipMarkdownPath', () => {
  it('skips API, assets, and files with extensions', () => {
    assert.equal(shouldSkipMarkdownPath('/api/scan'), true)
    assert.equal(shouldSkipMarkdownPath('/og.png'), true)
    assert.equal(shouldSkipMarkdownPath('/llms.txt'), true)
    assert.equal(shouldSkipMarkdownPath('/sitemap.xml'), true)
    assert.equal(shouldSkipMarkdownPath('/'), false)
    assert.equal(shouldSkipMarkdownPath('/about'), false)
  })
})
