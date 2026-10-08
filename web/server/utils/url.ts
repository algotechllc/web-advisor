import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal'])

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (normalized.startsWith('fe80')) return true
  return false
}

export function isPrivateOrLocalIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isPrivateIpv4(ip)
  if (version === 6) return isPrivateIpv6(ip)
  return false
}

export interface NormalizedTarget {
  url: URL
  host: string
  href: string
}

export function normalizeScanUrl(raw: string): NormalizedTarget {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url parameter' })
  }

  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: 'Only http and https URLs are allowed' })
  }

  const host = parsed.hostname.toLowerCase()
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw createError({ statusCode: 400, statusMessage: 'Host is not allowed' })
  }

  if (isIP(host) && isPrivateOrLocalIp(host)) {
    throw createError({ statusCode: 400, statusMessage: 'Private or local IP addresses are not allowed' })
  }

  // Prefer https for scanning when scheme was inferred as http from bare host.
  if (parsed.protocol === 'http:' && !/^https?:\/\//i.test(trimmed)) {
    parsed.protocol = 'https:'
  }

  return {
    url: parsed,
    host,
    href: parsed.toString(),
  }
}

export async function assertPublicHost(host: string): Promise<void> {
  if (isIP(host)) {
    if (isPrivateOrLocalIp(host)) {
      throw createError({ statusCode: 400, statusMessage: 'Private or local IP addresses are not allowed' })
    }
    return
  }

  try {
    const records = await lookup(host, { all: true, verbatim: true })
    if (!records.length) {
      throw createError({ statusCode: 400, statusMessage: 'Could not resolve host' })
    }
    for (const record of records) {
      if (isPrivateOrLocalIp(record.address)) {
        throw createError({ statusCode: 400, statusMessage: 'Host resolves to a private or local address' })
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 400, statusMessage: 'Could not resolve host' })
  }
}
