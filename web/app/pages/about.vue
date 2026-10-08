<script setup lang="ts">
const branding = useSiteBranding()
</script>

<template>
  <article class="max-w-3xl space-y-4 text-sm leading-relaxed text-mist/90">
    <h1 class="font-mono text-3xl font-medium text-white">
      About {{ branding.siteName }}
    </h1>
    <p>
      {{ branding.siteName }} is a public website scanner built by {{ branding.orgName }}. It is designed for
      engineers and operators who need a shareable grade for a site they already control.
      The tool looks at security response headers, TLS, DNSSEC, mail and CAA DNS records,
      Open Graph and Twitter preview tags, and files that help AI agents understand a site.
    </p>
    <h2 class="font-mono text-xl text-white">
      How a scan works
    </h2>
    <p>
      You submit a public hostname. The server validates the URL, rejects private networks,
      then runs header, TLS, DNS, SEO, and agentic scanners in parallel. Findings are graded
      with severity penalties. An optional AI prompt lists failed checks with concrete fixes
      and asks the assistant to keep third-party scripts working.
    </p>
    <p>
      {{ branding.siteName }} is not a penetration test, accessibility audit, or legal certification.
      It only observes public HTTP and DNS. For agent scoring we also read the public Is
      Agentic report API and link to a full report on is-agentic.com when one exists.
    </p>
    <h2 class="font-mono text-xl text-white">
      Who we are
    </h2>
    <p>
      {{ branding.orgName }} maintains {{ branding.siteName }} as an open scanning service at
      {{ branding.siteUrl.replace(/^https?:\/\//, '') }}. Contact
      <a class="text-accent" :href="`mailto:${branding.orgEmail}`">{{ branding.orgEmail }}</a>
      with product questions. Address: {{ branding.orgAddress }}.
    </p>
  </article>
</template>
