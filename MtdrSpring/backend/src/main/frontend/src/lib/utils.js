import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string as LOCAL time, never UTC.
 * "YYYY-MM-DD" strings are parsed with local midnight so the displayed
 * date always matches what the user typed, regardless of timezone.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(dateStr)
}
