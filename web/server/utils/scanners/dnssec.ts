import type { Finding } from '../../../shared/types/scan'
import { buildCategory } from '../grade'
import { dohQuery as dohQueryShared, type DohAnswer } from '../doh'

/** DNS wire types we care about */
const TYPE = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  DS: 43,
  RRSIG: 46,
  DNSKEY: 48,
} as const

function normalizeName(name: string): string {
  return name.replace(/\.$/, '').toLowerCase()
}

function dohQuery(name: string, type: string) {
  return dohQueryShared(name, type, { dnssec: true })
}

/** Candidate zones from host up to (but not including) the TLD. */
function zoneCandidates(host: string): string[] {
  const labels = normalizeName(host).split('.').filter(Boolean)
  const zones: string[] = []
  for (let i = 0; i < labels.length - 1; i++) {
    zones.push(labels.slice(i).join('.'))
  }
  return zones
}

interface SignedZone {
  zone: string
  hasDs: boolean
  hasDnskey: boolean
  dsAd: boolean
  dnskeyAd: boolean
}

async function findClosestSignedZone(host: string): Promise<SignedZone | null> {
  for (const zone of zoneCandidates(host)) {
    const ds = await dohQuery(zone, 'DS')
    const hasDs = (ds.Answer ?? []).some((a) => a.type === TYPE.DS)
    if (!hasDs) continue

    const dnskey = await dohQuery(zone, 'DNSKEY')
    const hasDnskey = (dnskey.Answer ?? []).some((a) => a.type === TYPE.DNSKEY)
    return {
      zone,
      hasDs: true,
      hasDnskey,
      dsAd: Boolean(ds.AD),
      dnskeyAd: Boolean(dnskey.AD),
    }
  }
  return null
}

function ownerAnswers(answers: DohAnswer[] | undefined, host: string): DohAnswer[] {
  const target = normalizeName(host)
  return (answers ?? []).filter((a) => normalizeName(a.name) === target)
}

function extractCnameTarget(answers: DohAnswer[], host: string): string | null {
  const cname = ownerAnswers(answers, host).find((a) => a.type === TYPE.CNAME)
  return cname ? normalizeName(cname.data) : null
}

function hasOwnerRrsig(answers: DohAnswer[] | undefined, host: string): boolean {
  return ownerAnswers(answers, host).some((a) => a.type === TYPE.RRSIG)
}

function sameZone(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  return na === nb || na.endsWith(`.${nb}`) || nb.endsWith(`.${na}`)
}

export async function scanDnssec(host: string) {
  const findings: Finding[] = []
  const name = normalizeName(host)

  try {
    const [aLookup, aaaaLookup, signedZone] = await Promise.all([
      dohQuery(name, 'A'),
      dohQuery(name, 'AAAA'),
      findClosestSignedZone(name),
    ])

    // Prefer the answer set that includes owner data (A or CNAME chain).
    const primary =
      (aLookup.Answer?.length ?? 0) > 0
        ? aLookup
        : (aaaaLookup.Answer?.length ?? 0) > 0
          ? aaaaLookup
          : aLookup

    const answers = primary.Answer ?? []
    const ad = Boolean(primary.AD)
    const status = primary.Status
    const ownerRrsig = hasOwnerRrsig(answers, name)
    const cnameTarget = extractCnameTarget(answers, name)
    const ownerHasData = ownerAnswers(answers, name).some(
      (a) => a.type === TYPE.A || a.type === TYPE.CNAME || a.type === 28, /* AAAA */
    )

    // Optional: confirm zone SOA validates when the zone is signed.
    let soaAd = false
    if (signedZone?.hasDnskey) {
      try {
        const soa = await dohQuery(signedZone.zone, 'SOA')
        soaAd = Boolean(soa.AD) && (soa.Answer ?? []).some((a) => a.type === TYPE.SOA)
      } catch {
        soaAd = false
      }
    }

    const cnameLeavesZone =
      !!cnameTarget
      && !!signedZone
      && !sameZone(cnameTarget, signedZone.zone)

    // --- Finding: zone signed (DS + DNSKEY) ---
    if (!signedZone) {
      findings.push({
        id: 'dnssec-zone',
        severity: 'medium',
        passed: false,
        title: 'DNSSEC zone signing',
        detail: `No DS records found walking up from ${name}. The enclosing zone does not appear to be DNSSEC-delegated.`,
      })
    } else if (!signedZone.hasDnskey) {
      findings.push({
        id: 'dnssec-zone',
        severity: 'high',
        passed: false,
        title: 'DNSSEC zone signing',
        detail: `DS exists for ${signedZone.zone}, but no DNSKEY was returned. Delegation may be broken.`,
        value: signedZone.zone,
      })
    } else {
      findings.push({
        id: 'dnssec-zone',
        severity: 'high',
        passed: true,
        title: 'DNSSEC zone signing',
        detail: `Closest signed zone is ${signedZone.zone} (DS + DNSKEY present${soaAd ? ', SOA authenticated' : ''}).`,
        value: signedZone.zone,
      })
    }

    // --- Finding: owner RRset signatures ---
    if (signedZone?.hasDnskey) {
      if (ownerRrsig) {
        findings.push({
          id: 'dnssec-rrsig',
          severity: 'high',
          passed: true,
          title: 'Signed owner records',
          detail: cnameTarget
            ? `RRSIG present for ${name} (CNAME → ${cnameTarget}). The name is signed in ${signedZone.zone}.`
            : `RRSIG present for ${name} in ${signedZone.zone}.`,
          value: cnameTarget ? `CNAME ${cnameTarget}` : 'RRSIG',
        })
      } else if (ownerHasData || status === 0) {
        findings.push({
          id: 'dnssec-rrsig',
          severity: 'high',
          passed: false,
          title: 'Signed owner records',
          detail: `Zone ${signedZone.zone} is signed, but no RRSIG was returned for ${name}. This often indicates a DNSSEC configuration problem.`,
          value: `status=${status}`,
        })
      } else {
        findings.push({
          id: 'dnssec-rrsig',
          severity: 'medium',
          passed: false,
          title: 'Signed owner records',
          detail: `Could not obtain owner RRsets for ${name} to verify signatures (status=${status}).`,
          value: `status=${status}`,
        })
      }
    } else {
      findings.push({
        id: 'dnssec-rrsig',
        severity: 'low',
        passed: false,
        title: 'Signed owner records',
        detail: 'Skipped: no signed enclosing zone was found.',
      })
    }

    // --- Finding: full-chain AD (resolver authenticated the whole answer) ---
    if (ad) {
      findings.push({
        id: 'dnssec-chain',
        severity: 'medium',
        passed: true,
        title: 'Authenticated resolution chain',
        detail: 'Resolver set the Authenticated Data (AD) flag for this lookup. The full answer chain validated.',
        value: 'AD=1',
      })
    } else if (ownerRrsig && cnameLeavesZone) {
      // Expected: signed CNAME into an unsigned CDN/DNS host (e.g. Vercel).
      findings.push({
        id: 'dnssec-chain',
        severity: 'info',
        passed: true,
        title: 'Authenticated resolution chain',
        detail:
          `AD is unset because the CNAME target (${cnameTarget}) is outside the signed zone `
          + `(${signedZone!.zone}). The owner name itself is signed; the target zone is not part of this zone's DNSSEC chain.`,
        value: `AD=0 status=${status} cname=${cnameTarget}`,
      })
    } else if (signedZone?.hasDnskey && ownerRrsig && !ad) {
      findings.push({
        id: 'dnssec-chain',
        severity: 'low',
        passed: true,
        title: 'Authenticated resolution chain',
        detail:
          'Owner records are signed, but the resolver did not set AD for this lookup. '
          + 'This can happen with partial chains or resolver policy; it is not treated as a zone failure.',
        value: `AD=0 status=${status}`,
      })
    } else if (signedZone?.hasDs && !ownerRrsig) {
      findings.push({
        id: 'dnssec-chain',
        severity: 'high',
        passed: false,
        title: 'Authenticated resolution chain',
        detail:
          'DS exists for the zone, but the answer was not authenticated and no owner RRSIG was observed. Possible DNSSEC misconfiguration.',
        value: `AD=0 status=${status}`,
      })
    } else {
      findings.push({
        id: 'dnssec-chain',
        severity: 'medium',
        passed: false,
        title: 'Authenticated resolution chain',
        detail: 'Resolver did not authenticate this lookup (AD unset) and no signed owner RRset was confirmed.',
        value: `AD=0 status=${status}`,
      })
    }

    // --- Finding: DS / DNSKEY visibility (informational detail) ---
    if (signedZone) {
      findings.push({
        id: 'dnssec-ds',
        severity: 'medium',
        passed: true,
        title: 'DS at signed zone',
        detail: `DS records found for ${signedZone.zone}${signedZone.dsAd ? ' (AD)' : ''}.`,
        value: signedZone.zone,
      })
      findings.push({
        id: 'dnssec-dnskey',
        severity: 'low',
        passed: signedZone.hasDnskey,
        title: 'DNSKEY at signed zone',
        detail: signedZone.hasDnskey
          ? `DNSKEY records found for ${signedZone.zone}${signedZone.dnskeyAd ? ' (AD)' : ''}.`
          : `No DNSKEY records found for ${signedZone.zone}.`,
        value: signedZone.zone,
      })
    } else {
      findings.push({
        id: 'dnssec-ds',
        severity: 'medium',
        passed: false,
        title: 'DS at signed zone',
        detail: `No DS records found for any ancestor zone of ${name}.`,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DNSSEC lookup failed'
    findings.push({
      id: 'dnssec-zone',
      severity: 'high',
      passed: false,
      title: 'DNSSEC zone signing',
      detail: `Could not evaluate DNSSEC: ${message}`,
    })
  }

  return buildCategory(findings)
}
