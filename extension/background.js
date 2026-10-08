import { badgeColor, badgeText, gradeIsAtOrBelow, GRADE_ORDER } from './lib/grades.js'
import { getSettings } from './lib/settings.js'

const sessionKey = (host) => `scan:${host}`

function extractHost(urlString) {
  try {
    const url = new URL(urlString)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.hostname
  } catch {
    return null
  }
}

async function setBadge(tabId, grade) {
  const colors = badgeColor(grade)
  await chrome.action.setBadgeText({ tabId, text: badgeText(grade) })
  await chrome.action.setBadgeBackgroundColor({ tabId, color: colors.background })
  await chrome.action.setBadgeTextColor?.({ tabId, color: colors.color })
}

async function clearBadge(tabId) {
  await chrome.action.setBadgeText({ tabId, text: '' })
}

async function notifyLowGrade(host, grade, reportUrl) {
  const id = `low-${host}-${grade}`
  await chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `Low security grade: ${grade}`,
    message: `${host} scored ${grade}. Open Web Advisor for details.`,
    priority: 1,
  })

  chrome.notifications.onClicked.addListener(function onClick(notificationId) {
    if (notificationId !== id) return
    chrome.tabs.create({ url: reportUrl })
    chrome.notifications.onClicked.removeListener(onClick)
  })
}

async function scanTab(tabId, url) {
  const host = extractHost(url)
  if (!host) {
    await clearBadge(tabId)
    return
  }

  const settings = await getSettings()
  const cached = await chrome.storage.session.get(sessionKey(host))
  const previous = cached[sessionKey(host)]

  if (previous?.grade && previous?.host === host) {
    await setBadge(tabId, previous.grade)
    if (Date.now() - (previous.scannedAtMs || 0) < 30 * 60 * 1000) {
      return previous
    }
  }

  try {
    const endpoint = `${settings.apiBaseUrl}/api/scan?url=${encodeURIComponent(`https://${host}`)}`
    const response = await fetch(endpoint)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const report = await response.json()
    const payload = {
      grade: report.grade,
      score: report.score,
      host: report.host,
      url: report.url,
      scannedAtMs: Date.now(),
      notified: previous?.notified || false,
      lastNotifiedGrade: previous?.lastNotifiedGrade,
    }

    await setBadge(tabId, report.grade)

    const shouldNotify =
      gradeIsAtOrBelow(report.grade, settings.notifyThreshold)
      && (
        !payload.notified
        || GRADE_ORDER.indexOf(report.grade) > GRADE_ORDER.indexOf(payload.lastNotifiedGrade || 'A+')
      )

    if (shouldNotify) {
      const reportUrl = `${settings.siteBaseUrl}/scan/${encodeURIComponent(report.host)}`
      await notifyLowGrade(report.host, report.grade, reportUrl)
      payload.notified = true
      payload.lastNotifiedGrade = report.grade
    }

    await chrome.storage.session.set({ [sessionKey(host)]: payload })
    return payload
  } catch (error) {
    console.warn('Web Advisor scan failed', error)
    await chrome.action.setBadgeText({ tabId, text: '?' })
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#8a97b0' })
    return null
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  scanTab(tabId, tab.url)
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId)
  if (tab.url) scanTab(tabId, tab.url)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'getCurrentScan') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id || !tab.url) {
        sendResponse({ ok: false, error: 'No active tab' })
        return
      }
      const host = extractHost(tab.url)
      if (!host) {
        sendResponse({ ok: false, error: 'Unsupported URL' })
        return
      }
      const cached = await chrome.storage.session.get(sessionKey(host))
      let data = cached[sessionKey(host)]
      if (!data) {
        data = await scanTab(tab.id, tab.url)
      } else {
        await setBadge(tab.id, data.grade)
      }
      const settings = await getSettings()
      sendResponse({
        ok: !!data,
        data,
        reportUrl: data
          ? `${settings.siteBaseUrl}/scan/${encodeURIComponent(data.host)}`
          : null,
      })
    })
    return true
  }

  if (message?.type === 'rescanCurrent') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id || !tab.url) {
        sendResponse({ ok: false })
        return
      }
      const host = extractHost(tab.url)
      if (host) {
        await chrome.storage.session.remove(sessionKey(host))
      }
      const data = await scanTab(tab.id, tab.url)
      const settings = await getSettings()
      sendResponse({
        ok: !!data,
        data,
        reportUrl: data
          ? `${settings.siteBaseUrl}/scan/${encodeURIComponent(data.host)}`
          : null,
      })
    })
    return true
  }

  return false
})
