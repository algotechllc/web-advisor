import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_SITE_BRANDING,
  aboutMarkdown,
  contactMarkdown,
  homepageMarkdown,
  jsonLdGraph,
  llmsTxt,
  markdownForPath,
  privacyMarkdown,
  resolveSiteBranding,
  robotsTxt,
  sitemapXml,
  type SiteBranding,
} from '../shared/site.ts'

const SAMPLE: SiteBranding = {
  ...DEFAULT_SITE_BRANDING,
  siteUrl: 'https://advisor.example.com',
  orgName: 'Example Org LLC',
  orgEmail: 'hello@example.com',
  orgUrl: 'https://example.com',
  orgAddress: '1 Example St, Example City, EX 12345',
  orgStreetAddress: '1 Example St',
  orgLocality: 'Example City',
  orgCountry: 'EX',
  orgPostalCode: '12345',
}

describe('resolveSiteBranding', () => {
  it('falls back to open-source defaults', () => {
    const branding = resolveSiteBranding({})
    assert.equal(branding.orgName, 'Your Organization')
    assert.equal(branding.siteUrl, 'http://localhost:3000')
  })

  it('prefers provided runtime values', () => {
    const branding = resolveSiteBranding({
      orgName: 'Acme',
      siteUrl: 'https://scan.acme.test/',
    })
    assert.equal(branding.orgName, 'Acme')
    assert.equal(branding.siteUrl, 'https://scan.acme.test')
  })

  it('coerces numeric runtime values (Vercel/Nuxt postal codes)', () => {
    const branding = resolveSiteBranding({
      orgPostalCode: 500001,
      orgCountry: 'AE',
    })
    assert.equal(branding.orgPostalCode, '500001')
    assert.equal(branding.orgCountry, 'AE')
  })
})

describe('markdown pages', () => {
  it('homepage markdown is substantial', () => {
    assert.ok(homepageMarkdown(SAMPLE).length >= 500)
    assert.match(homepageMarkdown(SAMPLE), /^# Web Advisor/m)
  })

  it('trust pages exceed 500 characters', () => {
    assert.ok(aboutMarkdown(SAMPLE).length >= 500)
    assert.ok(contactMarkdown(SAMPLE).length >= 500)
    assert.ok(privacyMarkdown(SAMPLE).length >= 500)
    assert.match(aboutMarkdown(SAMPLE), /Example Org LLC/)
    assert.match(contactMarkdown(SAMPLE), /hello@example.com/)
  })

  it('llms.txt includes when-to-use guidance', () => {
    const body = llmsTxt(SAMPLE)
    assert.match(body, /## When to use this/)
    assert.match(body, /GET /)
    assert.match(body, /\/api\/scan/)
  })

  it('maps known paths and 404s unknown ones', () => {
    assert.equal(markdownForPath('/', SAMPLE)?.status, 200)
    assert.equal(markdownForPath('/about', SAMPLE)?.status, 200)
    assert.equal(markdownForPath('/__ora-404-probe', SAMPLE)?.status, 404)
    assert.match(markdownForPath('/__ora-404-probe', SAMPLE)?.body || '', /sitemap/)
  })
})

describe('structured data and sitemap', () => {
  it('emits Organization and SoftwareApplication JSON-LD', () => {
    const graph = jsonLdGraph(SAMPLE)
    const types = graph['@graph'].map((n: { '@type': string }) => n['@type'])
    assert.ok(types.includes('Organization'))
    assert.ok(types.includes('SoftwareApplication'))
    const org = graph['@graph'].find((n: { '@type': string }) => n['@type'] === 'Organization') as {
      name: string
      contactPoint: { email: string, contactType: string }
      address: { '@type': string, addressCountry: string, postalCode: string }
    }
    assert.equal(org.name, 'Example Org LLC')
    assert.equal(org.contactPoint.email, 'hello@example.com')
    assert.equal(org.contactPoint.contactType, 'customer support')
    assert.equal(org.address['@type'], 'PostalAddress')
    assert.equal(org.address.addressCountry, 'EX')
    assert.equal(org.address.postalCode, '12345')
  })

  it('builds a urlset sitemap and robots.txt from siteUrl', () => {
    const xml = sitemapXml(SAMPLE, '2026-10-07')
    assert.match(xml, /<urlset /)
    assert.match(xml, /https:\/\/advisor.example.com\/about/)
    assert.match(xml, /<lastmod>2026-10-07<\/lastmod>/)
    assert.match(robotsTxt(SAMPLE), /Sitemap: https:\/\/advisor.example.com\/sitemap.xml/)
  })
})
