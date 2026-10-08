import { connect } from 'node:tls'
import type { Finding } from '../../../shared/types/scan'
import { buildCategory } from '../grade'

function getCertificate(host: string, port = 443): Promise<{
  valid: boolean
  authorized: boolean
  authorizationError?: Error
  validFrom?: string
  validTo?: string
  daysRemaining?: number
  protocol?: string
}> {
  return new Promise((resolve, reject) => {
    const socket = connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
      timeout: 10_000,
    })

    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate()
      const protocol = socket.getProtocol() ?? undefined
      const authorized = socket.authorized
      const authorizationError = socket.authorizationError
        ? new Error(String(socket.authorizationError))
        : undefined

      if (!cert || Object.keys(cert).length === 0) {
        socket.end()
        resolve({ valid: false, authorized, authorizationError, protocol })
        return
      }

      const validFrom = cert.valid_from
      const validTo = cert.valid_to
      const toDate = new Date(validTo)
      const fromDate = new Date(validFrom)
      const now = Date.now()
      const daysRemaining = Math.floor((toDate.getTime() - now) / (1000 * 60 * 60 * 24))
      const valid = now >= fromDate.getTime() && now <= toDate.getTime()

      socket.end()
      resolve({
        valid,
        authorized,
        authorizationError,
        validFrom,
        validTo,
        daysRemaining,
        protocol,
      })
    })

    socket.once('error', (error) => {
      reject(error)
    })

    socket.once('timeout', () => {
      socket.destroy()
      reject(new Error('TLS connection timed out'))
    })
  })
}

async function checkHttpsRedirect(host: string): Promise<Finding> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(`http://${host}/`, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebAdvisorBot/1.0 (+https://web-advisor.local)',
      },
    })
    const location = response.headers.get('location') ?? ''
    const redirectedToHttps =
      (response.status >= 300 && response.status < 400 && location.startsWith('https://'))
      || response.url.startsWith('https:')

    return {
      id: 'https-redirect',
      severity: 'medium',
      passed: redirectedToHttps,
      title: 'HTTP to HTTPS redirect',
      detail: redirectedToHttps
        ? 'HTTP requests are redirected to HTTPS.'
        : `HTTP did not redirect to HTTPS (status ${response.status}).`,
      value: location || String(response.status),
    }
  } catch {
    return {
      id: 'https-redirect',
      severity: 'low',
      passed: false,
      title: 'HTTP to HTTPS redirect',
      detail: 'Could not probe HTTP for an HTTPS redirect (port 80 may be closed).',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function scanTls(host: string) {
  const findings: Finding[] = []

  try {
    const cert = await getCertificate(host)

    findings.push({
      id: 'tls-connect',
      severity: 'critical',
      passed: true,
      title: 'TLS connectivity',
      detail: `Successfully negotiated TLS${cert.protocol ? ` (${cert.protocol})` : ''}.`,
      value: cert.protocol,
    })

    findings.push({
      id: 'cert-trusted',
      severity: 'critical',
      passed: cert.authorized,
      title: 'Certificate trust',
      detail: cert.authorized
        ? 'Certificate chain is trusted by the runtime CA store.'
        : `Certificate is not trusted: ${cert.authorizationError?.message ?? 'unknown error'}.`,
    })

    const days = cert.daysRemaining ?? -1
    findings.push({
      id: 'cert-validity',
      severity: days < 0 ? 'critical' : days < 14 ? 'high' : 'medium',
      passed: !!cert.valid && days >= 14,
      title: 'Certificate validity window',
      detail: cert.validTo
        ? cert.valid && days >= 14
          ? `Certificate is valid until ${cert.validTo} (${days} days remaining).`
          : cert.valid
            ? `Certificate expires soon (${days} days remaining; valid to ${cert.validTo}).`
            : `Certificate is outside its validity window (valid to ${cert.validTo}).`
        : 'Could not read certificate validity dates.',
      value: cert.validTo,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TLS failed'
    findings.push({
      id: 'tls-connect',
      severity: 'critical',
      passed: false,
      title: 'TLS connectivity',
      detail: `Could not establish TLS: ${message}`,
    })
  }

  findings.push(await checkHttpsRedirect(host))
  return buildCategory(findings)
}
