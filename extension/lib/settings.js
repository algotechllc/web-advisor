const DEFAULTS = {
  apiBaseUrl: 'http://localhost:3000',
  notifyThreshold: 'C',
  siteBaseUrl: 'http://localhost:3000',
}

export async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS)
  return {
    apiBaseUrl: String(stored.apiBaseUrl || DEFAULTS.apiBaseUrl).replace(/\/$/, ''),
    notifyThreshold: stored.notifyThreshold || DEFAULTS.notifyThreshold,
    siteBaseUrl: String(stored.siteBaseUrl || stored.apiBaseUrl || DEFAULTS.siteBaseUrl).replace(/\/$/, ''),
  }
}

export { DEFAULTS }
