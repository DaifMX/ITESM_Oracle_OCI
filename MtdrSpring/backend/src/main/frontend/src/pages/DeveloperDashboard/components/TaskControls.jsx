import { LayoutList, Columns } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { STATUS_OPTIONS, STATUS_CONFIG } from '../constants'

export default function TaskControls({ tasks, total, filterStatus, setFilterStatus, view, setView }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {/* Status filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {['all', ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
              filterStatus === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {s === 'all'
              ? `All (${total})`
              : `${STATUS_CONFIG[s].label} (${tasks.filter((t) => t.status === s).length})`}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-md border bg-card overflow-hidden">
        <button
          onClick={() => setView('list')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <LayoutList className="w-3.5 h-3.5" /> List
        </button>
        <button
          onClick={() => setView('kanban')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Columns className="w-3.5 h-3.5" /> Kanban
        </button>
      </div>
    </div>
  )
}
