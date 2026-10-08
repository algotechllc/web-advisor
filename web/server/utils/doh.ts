export interface DohAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

export interface DohResponse {
  Status: number
  AD?: boolean
  CD?: boolean
  Answer?: DohAnswer[]
  Authority?: DohAnswer[]
}

export async function dohQuery(
  name: string,
  type: string,
  options: { dnssec?: boolean } = {},
): Promise<DohResponse> {
  const url = new URL('https://cloudflare-dns.com/dns-query')
  url.searchParams.set('name', name)
  url.searchParams.set('type', type)
  if (options.dnssec) {
    url.searchParams.set('do', 'true')
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/dns-json',
      'User-Agent': 'WebAdvisorBot/1.0 (+https://web-advisor.local)',
    },
  })

  if (!response.ok) {
    throw new Error(`DoH query failed with HTTP ${response.status}`)
  }

  return (await response.json()) as DohResponse
}

export function dohAnswers(response: DohResponse, type?: number): DohAnswer[] {
  const answers = response.Answer ?? []
  return type === undefined ? answers : answers.filter((a) => a.type === type)
}
