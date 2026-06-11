// All REST endpoints are served under this prefix so SPA routes (e.g. /projects)
// never collide with the API. Client-side router paths must NOT include it.
export const API_BASE = '/api'

const ACCESS_TOKEN_KEY = 'oracle_todo_access_token'
const REFRESH_TOKEN_KEY = 'oracle_todo_refresh_token'
const USER_KEY = 'oracle_todo_user'

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken, refreshToken) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function setUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function clearUser() {
  sessionStorage.removeItem(USER_KEY)
}

// ─── Chat history ────────────────────────────────────────────────────────────
// Persisted per user so the assistant keeps conversation context across page
// reloads (it lives in sessionStorage, so it clears when the tab closes).
const CHAT_HISTORY_PREFIX = 'oracle_todo_chat_'

export function getChatHistory(userId) {
  try {
    const raw = sessionStorage.getItem(`${CHAT_HISTORY_PREFIX}${userId ?? 'anon'}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setChatHistory(userId, messages) {
  try {
    sessionStorage.setItem(`${CHAT_HISTORY_PREFIX}${userId ?? 'anon'}`, JSON.stringify(messages))
  } catch {
    // sessionStorage full or unavailable — degrade to in-memory only.
  }
}

export function clearChatHistory() {
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith(CHAT_HISTORY_PREFIX))
    .forEach((k) => sessionStorage.removeItem(k))
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    return null
  }

  const data = await res.json()
  setTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

export async function authFetch(url, options = {}) {
  let token = getAccessToken()

  // Prepend the API prefix unless the caller already included it.
  const apiUrl = url.startsWith(`${API_BASE}/`) ? url : `${API_BASE}${url}`

  const makeRequest = (t) =>
    fetch(apiUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${t}`,
        'Content-Type': options.headers?.['Content-Type'] ?? 'application/json',
      },
    })

  let res = await makeRequest(token)

  if (res.status === 401) {
    token = await refreshAccessToken()
    if (!token) throw new Error('Session expired')
    res = await makeRequest(token)
  }

  return res
}
