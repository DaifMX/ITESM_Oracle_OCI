import { useState, useRef } from 'react'
import { cn } from '../../../lib/utils'
import { KANBAN_COLUMNS } from '../constants'
import KanbanCard from './KanbanCard'

export default function KanbanBoard({ tasks, onUpdate }) {
  const draggingTask = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  function handleDragStart(e, task) {
    draggingTask.current = task
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, colKey) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(colKey)
  }

  function handleDrop(e, colKey) {
    e.preventDefault()
    setDragOver(null)
    if (!draggingTask.current) return
    const task = draggingTask.current
    draggingTask.current = null
    if (task.status !== colKey) {
      onUpdate(task, colKey)
    }
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {KANBAN_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key)
        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
            onDragLeave={handleDragLeave}
            className={cn(
              'rounded-lg border flex flex-col transition-colors min-h-[200px]',
              dragOver === col.key ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
            )}
          >
            <div className={cn('px-3 py-2.5 rounded-t-lg flex items-center justify-between', col.headerClass)}>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', col.dotClass)} />
                <span className="text-xs font-semibold text-foreground">{col.label}</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">{colTasks.length}</span>
            </div>

            <div className="flex-1 p-2 space-y-2">
              {colTasks.map((task) => (
                <KanbanCard key={task.taskId} task={task} onDragStart={handleDragStart} />
              ))}
              {colTasks.length === 0 && (
                <div className="h-16 rounded-md border-2 border-dashed border-border/50 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">Drop here</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
