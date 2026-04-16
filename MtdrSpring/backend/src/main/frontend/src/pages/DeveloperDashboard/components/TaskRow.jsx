import { cn, parseLocalDate } from '../../../lib/utils'
import PriorityBadge from './PriorityBadge'
import StatusSelect from './StatusSelect'

export default function TaskRow({ task, onUpdate }) {
  const isOverdue = task.expectedEndDate && task.status !== 'done' && parseLocalDate(task.expectedEndDate) < new Date()

  return (
    <div className={cn('rounded-lg border bg-card px-5 py-4', isOverdue && 'border-red-200 dark:border-red-900')}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-foreground">{task.title}</span>
            <PriorityBadge priority={task.priority} />
            {isOverdue && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-600 dark:text-red-400">
                Overdue
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {task.sprint?.name && (
              <span className="text-xs text-muted-foreground">Sprint: {task.sprint.name}</span>
            )}
            {task.storyPoints != null && (
              <span className="text-xs text-muted-foreground">{task.storyPoints} pts</span>
            )}
            {task.expectedEndDate && (
              <span className={cn('text-xs', isOverdue ? 'text-red-500' : 'text-muted-foreground')}>
                Due {parseLocalDate(task.expectedEndDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <StatusSelect task={task} onUpdate={onUpdate} />
      </div>
    </div>
  )
}
