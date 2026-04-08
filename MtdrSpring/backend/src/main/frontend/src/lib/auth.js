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

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch('/auth/refresh', {
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

  const makeRequest = (t) =>
    fetch(url, {
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
