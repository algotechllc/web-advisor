import {
  absoluteUrl,
  jsonLdGraph,
  resolveSiteBranding,
} from '#shared/site'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const route = useRoute()
  const branding = computed(() => resolveSiteBranding(config.public))
  const canonical = computed(() => absoluteUrl(branding.value.siteUrl, route.path || '/'))
  const ogImage = computed(() => absoluteUrl(branding.value.siteUrl, '/og.png'))

  useHead(() => ({
    title: `${branding.value.siteName} website security SEO and agent readiness scanner`,
    htmlAttrs: { lang: 'en' },
    link: [{ rel: 'canonical', href: canonical.value }],
    meta: [
      { name: 'description', content: branding.value.siteDescription },
      { name: 'is-agentic-site-type', content: 'app' },
      { property: 'og:title', content: `${branding.value.siteName} website scanner` },
      { property: 'og:description', content: branding.value.siteDescription },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical.value },
      { property: 'og:image', content: ogImage.value },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: `${branding.value.siteName} website scanner` },
      { name: 'twitter:description', content: branding.value.siteDescription },
      { name: 'twitter:image', content: ogImage.value },
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(jsonLdGraph(branding.value)),
      },
    ],
  }))
})
