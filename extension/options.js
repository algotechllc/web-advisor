import { DEFAULTS, getSettings } from './lib/settings.js'

async function load() {
  const settings = await getSettings()
  document.getElementById('apiBaseUrl').value = settings.apiBaseUrl
  document.getElementById('siteBaseUrl').value = settings.siteBaseUrl
  document.getElementById('notifyThreshold').value = settings.notifyThreshold || DEFAULTS.notifyThreshold
}

document.getElementById('form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const apiBaseUrl = document.getElementById('apiBaseUrl').value.trim().replace(/\/$/, '')
  const siteBaseUrl = document.getElementById('siteBaseUrl').value.trim().replace(/\/$/, '')
  const notifyThreshold = document.getElementById('notifyThreshold').value

  await chrome.storage.sync.set({ apiBaseUrl, siteBaseUrl, notifyThreshold })
  const status = document.getElementById('status')
  status.hidden = false
  setTimeout(() => {
    status.hidden = true
  }, 1500)
})

load()
