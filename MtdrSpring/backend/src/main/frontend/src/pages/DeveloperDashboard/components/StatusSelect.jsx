import { useState } from 'react'
import { Loader2, ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { STATUS_OPTIONS, STATUS_CONFIG } from '../constants'

export default function StatusSelect({ task, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const cfg  = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo
  const Icon = cfg.icon

  async function handleChange(e) {
    const newStatus = e.target.value
    setLoading(true)
    try { await onUpdate(task, newStatus) }
    finally { setLoading(false) }
  }

  return (
    <div className="relative shrink-0">
      <select
        value={task.status}
        onChange={handleChange}
        disabled={loading}
        className={cn(
          'appearance-none cursor-pointer pl-7 pr-6 py-1.5 rounded-md text-xs font-medium',
          'border border-border bg-card hover:bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          : <Icon className={cn('w-3.5 h-3.5', cfg.className.split(' ').find((c) => c.startsWith('text-')))} />
        }
      </span>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
    </div>
  )
}
