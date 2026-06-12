import { cn } from '../../../lib/utils'

export default function StatCard({ icon: Icon, label, value, sub, compact = false }) {
  return (
    <div className={cn(
      'rounded-lg border bg-card flex items-center',
      compact ? 'px-3 py-3 gap-2.5' : 'px-5 py-4 gap-4'
    )}>
      <div className="p-2 rounded-md bg-muted shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className={cn('text-xs text-muted-foreground', compact && 'whitespace-nowrap')}>{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
