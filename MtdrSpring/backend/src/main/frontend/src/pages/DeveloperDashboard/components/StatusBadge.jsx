import { cn } from '../../../lib/utils'
import { STATUS_CONFIG } from '../constants'

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}
