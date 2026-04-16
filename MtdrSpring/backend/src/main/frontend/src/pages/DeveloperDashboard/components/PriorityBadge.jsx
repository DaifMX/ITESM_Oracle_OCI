import { cn } from '../../../lib/utils'
import { PRIORITY_CONFIG } from '../constants'

export default function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}
