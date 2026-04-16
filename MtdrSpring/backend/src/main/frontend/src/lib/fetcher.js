import { authFetch } from './auth'

export async function fetcher(url) {
  const res = await authFetch(Array.isArray(url) ? url[0] : url)
  if (!res.ok) throw new Error('Failed to load data')
  return res.json()
}
