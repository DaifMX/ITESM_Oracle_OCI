import { useState, useCallback } from 'react'

/**
 * Intercepts task status changes so that moving a task into "done" first prompts
 * the user (via <DoneHoursDialog/>) for the total hours spent on the ticket.
 *
 * @param commit (task, newStatus, extra) => Promise — performs the actual update.
 *   `extra` carries any additional fields to persist (e.g. { totalHours }).
 *
 * Returns `requestChange` to use in place of the raw update handler, plus the
 * `pending` transition and dialog wiring (`confirm`, `cancel`, `saving`, `error`).
 */
export function useDoneHoursGuard(commit) {
  const [pending, setPending] = useState(null) // { task, newStatus }
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const requestChange = useCallback((task, newStatus) => {
    if (newStatus === 'done' && task.status !== 'done') {
      setError(null)
      setPending({ task, newStatus })
      return Promise.resolve()
    }
    return commit(task, newStatus, {})
  }, [commit])

  const confirm = useCallback(async (totalHours) => {
    if (!pending) return
    setSaving(true)
    setError(null)
    try {
      await commit(pending.task, pending.newStatus, { totalHours })
      setPending(null)
    } catch (err) {
      setError(err?.message || 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }, [pending, commit])

  const cancel = useCallback(() => {
    setPending(null)
    setError(null)
  }, [])

  return { requestChange, pending, confirm, cancel, saving, error }
}
