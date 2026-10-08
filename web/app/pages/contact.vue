<script setup lang="ts">
const branding = useSiteBranding()
</script>

<template>
  <article class="max-w-3xl space-y-4 text-sm leading-relaxed text-mist/90">
    <h1 class="font-mono text-3xl font-medium text-white">
      Contact {{ branding.siteName }}
    </h1>
    <p>
      Email {{ branding.orgName }} at
      <a class="text-accent" :href="`mailto:${branding.orgEmail}`">{{ branding.orgEmail }}</a>
      for {{ branding.siteName }} product questions, incorrect scan results, or partnership inquiries.
      Include the public URL you scanned and the timestamp shown on the report. Do not send
      passwords, API keys, cookies, or links that require a login.
    </p>
    <h2 class="font-mono text-xl text-white">
      Support details
    </h2>
    <p>
      Support language is English. We typically reply about public scanner behavior, rate
      limits on GET /api/scan, and how findings map to headers or DNS records. For Is Agentic
      score disputes, start or refresh a report at is-agentic.com and share that report URL.
    </p>
    <p>
      Organization: {{ branding.orgName }}, {{ branding.orgAddress }}. Website:
      {{ branding.siteUrl }}. Related company site: {{ branding.orgUrl }}.
    </p>
    <h2 class="font-mono text-xl text-white">
      What we cannot do
    </h2>
    <p>
      We cannot scan private networks, authenticated dashboards, or customer data behind a
      VPN. We will not store credentials you send by mistake; still, please do not send them.
      For privacy requests see the privacy page.
    </p>
  </article>
</template>
