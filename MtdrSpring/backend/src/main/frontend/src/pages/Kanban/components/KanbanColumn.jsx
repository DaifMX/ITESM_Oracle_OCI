import { Plus } from 'lucide-react'
import { cn } from '../../../lib/utils'
import TaskCard from './TaskCard'

export default function KanbanColumn({
  col, tasks, dragOverCol,
  onDragOver, onDrop, onDragLeave,
  draggedTaskId, onEdit, onDelete, onAddTask, onDragStart,
}) {
  const isOver = dragOverCol === col.key

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border min-w-[270px] w-[270px] shrink-0 transition-all duration-150',
        isOver ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10' : 'bg-muted/20'
      )}
      onDragOver={(e) => { e.preventDefault(); onDragOver(col.key) }}
      onDrop={(e) => onDrop(e, col.key)}
      onDragLeave={onDragLeave}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b', col.headerClass)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', col.dotClass)} />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{col.label}</span>
        </div>
        <span className={cn(
          'text-xs font-medium px-1.5 py-0.5 rounded-full',
          tasks.length > 0 ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground'
        )}>
          {tasks.length}
        </span>
      </div>

      {isOver && (
        <div className="mx-2 mt-2 h-1.5 rounded-full bg-primary/40 animate-pulse" />
      )}

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.taskId}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            isDragging={draggedTaskId === task.taskId}
          />
        ))}
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center py-8 border-2 border-dashed border-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Drop tasks here</p>
          </div>
        )}
      </div>

      {/* Add task (todo column only) */}
      {col.key === 'todo' && (
        <button
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-b-xl border-t"
          onClick={onAddTask}
        >
          <Plus className="w-3.5 h-3.5" />
          Add task
        </button>
      )}
    </div>
  )
}
