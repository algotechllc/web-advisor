<script setup lang="ts">
const branding = useSiteBranding()
</script>

<template>
  <article class="max-w-3xl space-y-4 text-sm leading-relaxed text-mist/90">
    <h1 class="font-mono text-3xl font-medium text-white">
      Privacy policy
    </h1>
    <p>
      {{ branding.siteName }} scans public websites that you submit. The service fetches publicly reachable
      HTTP responses, TLS certificates, and DNS records. A basic scan does not require an
      account. Do not submit URLs whose public responses contain personal data you are not
      allowed to share.
    </p>
    <h2 class="font-mono text-xl text-white">
      Data we process
    </h2>
    <p>
      We process the submitted URL, the time of the request, client IP for rate limiting
      (twenty scans per minute), and the scanner output needed to render a grade. Scan
      results are not written to a long-lived database in the current version. Logs on the
      host platform (for example Vercel) may retain request metadata according to that
      platform's policies.
    </p>
    <h2 class="font-mono text-xl text-white">
      Third parties
    </h2>
    <p>
      DNS-over-HTTPS queries may go to Cloudflare DNS. Agentic scoring may request a stored
      report from the public Is Agentic API. We do not sell scan submissions. You are
      responsible for content on third-party sites that you ask us to scan.
    </p>
    <h2 class="font-mono text-xl text-white">
      Contact
    </h2>
    <p>
      Privacy questions:
      <a class="text-accent" :href="`mailto:${branding.orgEmail}`">{{ branding.orgEmail }}</a>.
      Organization: {{ branding.orgName }}, {{ branding.orgAddress }}. Product site:
      {{ branding.siteUrl }}.
    </p>
  </article>
</template>
