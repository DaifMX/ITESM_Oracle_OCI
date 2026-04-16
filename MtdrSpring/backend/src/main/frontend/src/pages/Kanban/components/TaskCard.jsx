import { Trash2, Flag, Hash } from 'lucide-react'
import { cn, parseLocalDate } from '../../../lib/utils'
import { PRIORITY_CONFIG } from '../constants'

export default function TaskCard({ task, onEdit, onDelete, onDragStart, isDragging }) {
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', String(task.taskId))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(task.taskId)
      }}
      onClick={() => onEdit(task)}
      className={cn(
        'group rounded-lg border bg-card px-3 py-3 cursor-grab active:cursor-grabbing',
        'hover:shadow-md transition-all duration-150 select-none',
        isDragging && 'opacity-40 scale-95 shadow-none'
      )}
    >
      <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>

      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
        {task.priority && (
          <span className={cn('text-[11px] font-medium flex items-center gap-1', pCfg.className)}>
            <Flag className="w-2.5 h-2.5" />{pCfg.label}
          </span>
        )}
        {task.storyPoints != null && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Hash className="w-2.5 h-2.5" />{task.storyPoints} SP
          </span>
        )}
        {task.expectedEndDate && (
          <span className="text-[11px] text-muted-foreground ml-auto">
            {parseLocalDate(task.expectedEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
          onClick={(e) => { e.stopPropagation(); onDelete(task) }}
          title="Delete task"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
