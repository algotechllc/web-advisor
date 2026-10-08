import { resolveSiteBranding, type SiteBranding } from '../../shared/site'

export function useRequestSiteBranding(): SiteBranding {
  return resolveSiteBranding(useRuntimeConfig().public)
}
