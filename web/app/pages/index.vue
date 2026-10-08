<script setup lang="ts">
const branding = useSiteBranding()

async function runScan(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return

  let host = trimmed
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    host = parsed.hostname
  } catch {
    host = trimmed.replace(/^https?:\/\//i, '').split('/')[0] || trimmed
  }

  await navigateTo(`/scan/${encodeURIComponent(host)}`)
}
</script>

<template>
  <div class="space-y-12">
    <section class="max-w-3xl space-y-6">
      <h1 class="font-mono text-4xl font-medium tracking-tight text-white sm:text-5xl">
        {{ branding.siteName }} website security SEO and agent readiness scanner
      </h1>
      <p class="max-w-2xl text-lg leading-relaxed text-mist/90">
        {{ branding.siteName }} is a public website scanner from {{ branding.orgName }}. Paste a hostname to check
        security headers, TLS certificates, DNSSEC, SPF, DMARC, CAA, Open Graph social previews,
        and Is Agentic readiness. You get a letter grade, evidence for each finding, and an AI
        fix prompt you can hand to a coding assistant.
      </p>
      <ScanForm @submit="runScan" />
    </section>

    <section class="max-w-3xl space-y-4 text-sm leading-relaxed text-mist/90">
      <h2 class="font-mono text-xl text-white">
        What {{ branding.siteName }} checks
      </h2>
      <p>
        The scan API fetches the public HTTP response, inspects TLS, queries DNS over HTTPS, and
        reads homepage HTML for social and agent signals. Private, localhost, and link-local
        hosts are rejected. Every scan is live; there is no persistent result cache in this version.
      </p>
      <h3 class="font-mono text-lg text-white">
        Security, DNS, and transport
      </h3>
      <p>
        Headers include Content-Security-Policy, HSTS, clickjacking protections, Referrer-Policy,
        and Permissions-Policy. TLS checks certificate trust and HTTP to HTTPS redirects. DNSSEC
        walks to the closest signed zone and treats signed CNAMEs into unsigned CDNs as expected.
        DNS hygiene looks for SPF, DMARC, and CAA records through Cloudflare DNS-over-HTTPS.
      </p>
      <h3 class="font-mono text-lg text-white">
        SEO previews and agent files
      </h3>
      <p>
        SEO scoring looks for title, meta description, Open Graph image, type, and URL, Twitter
        cards, and a canonical link. Agentic checks use the public Is Agentic report API when a
        stored report exists, otherwise local probes for llms.txt, robots.txt, sitemap.xml,
        JSON-LD, Markdown negotiation, and the is-agentic-site-type meta tag.
      </p>
      <p>
        Call the API as GET /api/scan?url=https://example.com. Rate limit is twenty scans per
        IP per minute. Read more on the about, contact, and privacy pages, or fetch /llms.txt
        if you are an agent deciding whether this tool fits the job.
      </p>
    </section>
  </div>
</template>
