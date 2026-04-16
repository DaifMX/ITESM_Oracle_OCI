import { ListTodo, CheckCircle2, AlertCircle, CircleDot, CalendarClock, Zap } from 'lucide-react'
import { cn } from '../../../lib/utils'

export default function KpiCards({ total, done, inProgress, blocked, overdue, totalPoints }) {
  const cards = [
    { icon: ListTodo,      label: 'Total Tasks', value: total },
    { icon: CheckCircle2,  label: 'Completed',   value: done },
    { icon: CircleDot,     label: 'In Progress', value: inProgress },
    { icon: AlertCircle,   label: 'Blocked',     value: blocked,     highlight: blocked > 0 },
    { icon: CalendarClock, label: 'Overdue',     value: overdue,     highlight: overdue > 0 },
    { icon: Zap,           label: 'Points Done', value: totalPoints, sub: 'story pts' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ icon: Icon, label, value, sub, highlight }) => (
        <div
          key={label}
          className={cn(
            'rounded-lg border bg-card px-5 py-4 flex flex-col gap-3',
            highlight && 'border-red-300 dark:border-red-800 bg-red-500/5'
          )}
        >
          <div className={cn('p-2 rounded-md w-fit', highlight ? 'bg-red-500/10' : 'bg-muted')}>
            <Icon className={cn('w-5 h-5', highlight ? 'text-red-500' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', highlight ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
