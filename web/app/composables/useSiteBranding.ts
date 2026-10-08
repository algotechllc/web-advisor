import { resolveSiteBranding, type SiteBranding } from '#shared/site'

/** Site and organization branding from NUXT_PUBLIC_* runtime config. */
export function useSiteBranding(): ComputedRef<SiteBranding> {
  const config = useRuntimeConfig()
  return computed(() => resolveSiteBranding(config.public))
}
