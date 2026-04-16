import { cn, parseLocalDate } from '../../../lib/utils'
import PriorityBadge from './PriorityBadge'

export default function KanbanCard({ task, onDragStart }) {
  const isOverdue = task.expectedEndDate && task.status !== 'done' && parseLocalDate(task.expectedEndDate) < new Date()

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className={cn(
        'rounded-md border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm',
        'hover:shadow-md transition-shadow select-none',
        isOverdue && 'border-red-200 dark:border-red-900'
      )}
    >
      <p className="text-xs font-medium text-foreground leading-snug mb-2">{task.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.storyPoints != null && (
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
            {task.storyPoints}pt
          </span>
        )}
      </div>
      {task.expectedEndDate && (
        <p className={cn('text-xs mt-1.5', isOverdue ? 'text-red-500' : 'text-muted-foreground')}>
          Due {parseLocalDate(task.expectedEndDate).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
