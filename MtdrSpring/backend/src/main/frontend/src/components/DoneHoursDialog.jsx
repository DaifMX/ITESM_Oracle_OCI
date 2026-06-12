import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from './ui/button'

/**
 * Prompt shown whenever a task is moved into the "done" status. Forces the user
 * to log the total hours spent on the ticket before the change is committed.
 */
export default function DoneHoursDialog({ task, onConfirm, onCancel, saving = false, error = null }) {
  const initial = task?.totalHours != null && task.totalHours !== '' ? String(task.totalHours) : ''
  const [hours, setHours]     = useState(initial)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setHours(initial)
    setTouched(false)
  }, [task?.taskId, initial])

  const value = hours.trim()
  const num   = Number(value)
  const valid = value !== '' && !Number.isNaN(num) && num >= 0

  function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!valid || saving) return
    onConfirm(num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-sm flex flex-col">
        <div className="px-5 py-4 border-b flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-md bg-green-500/10">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="font-semibold text-foreground">Complete task</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Log the total hours spent on{' '}
            <span className="font-medium text-foreground">{task?.title}</span> before marking it as done.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Hours *
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              autoFocus
              className="field"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. 4.5"
            />
            {touched && !valid && (
              <p className="text-xs text-destructive">Enter the total hours spent (0 or more).</p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!valid || saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Mark as done
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
