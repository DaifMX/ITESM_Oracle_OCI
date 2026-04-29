import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { Plus, ChevronRight, AlertCircle, X, Calendar } from 'lucide-react'
import { updateTask, deleteTask } from '../../lib/api'
import { fetcher } from '../../lib/fetcher'
import { cn, parseLocalDate } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { COLUMNS } from './constants'
import KanbanColumn from './components/KanbanColumn'
import TaskModal from './components/TaskModal'

const DATE_CHIP_CONFIG = {
  planned:   'bg-muted/60 text-muted-foreground',
  active:    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
}

function getDaysLeft(endDate, status) {
  if (status === 'completed') return null
  if (!endDate) return null
  const end = parseLocalDate(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return null
  return diff === 1 ? '1 day left' : `${diff} days left`
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col rounded-xl border min-w-[270px] w-[270px] shrink-0 bg-muted/20">
          <Skeleton className="h-10 rounded-t-xl rounded-b-none" />
          <div className="p-2 space-y-2">
            {[...Array(i === 0 ? 3 : i === 1 ? 2 : 1)].map((_, j) => (
              <Skeleton key={j} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function KanbanPage() {
  const { projectId, sprintId } = useParams()
  const navigate = useNavigate()

  const swrKey = projectId && sprintId ? ['kanban', projectId, sprintId] : null
  const { data, error, isLoading } = useSWR(swrKey, async () => {
    const [projs, sprintsData, tasksData, emps] = await Promise.all([
      fetcher('/projects'),
      fetcher(`/sprints/project/${projectId}`),
      fetcher(`/tasks/sprint/${sprintId}`),
      fetcher('/employees'),
    ])
    return { projs, sprintsData, tasksData, emps }
  })

  const [tasks, setTasks]       = useState([])
  const [mutateError, setMutateError] = useState(null)
  const [modal, setModal]       = useState(null)

  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverCol, setDragOverCol]     = useState(null)
  const dragLeaveTimer                    = useRef(null)

  useEffect(() => {
    if (data?.tasksData) setTasks(data.tasksData)
  }, [data?.tasksData])

  const project  = data?.projs?.find((p) => p.projectId === Number(projectId)) ?? null
  const sprint   = data?.sprintsData?.find((s) => s.sprintId === Number(sprintId)) ?? null
  const employees = data?.emps ?? []

  function handleDragStart(taskId) { setDraggedTaskId(taskId) }

  function handleDragOver(colKey) {
    clearTimeout(dragLeaveTimer.current)
    setDragOverCol(colKey)
  }

  function handleDragLeave() {
    dragLeaveTimer.current = setTimeout(() => setDragOverCol(null), 60)
  }

  async function handleDrop(e, targetColKey) {
    e.preventDefault()
    clearTimeout(dragLeaveTimer.current)
    setDragOverCol(null)
    setDraggedTaskId(null)

    const taskId = Number(e.dataTransfer.getData('taskId'))
    if (!taskId) return
    const task = tasks.find((t) => t.taskId === taskId)
    if (!task || task.status === targetColKey) return

    setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: targetColKey } : t))
    try {
      await updateTask(taskId, { ...task, status: targetColKey, sprint: { sprintId: Number(sprintId) }, project: { projectId: Number(projectId) } })
    } catch {
      setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: task.status } : t))
      setMutateError('Failed to move task. Please try again.')
    }
  }

  async function handleDelete(task) {
    if (!confirm(`Delete task "${task.title}"?`)) return
    try {
      await deleteTask(task.taskId)
      setTasks((prev) => prev.filter((t) => t.taskId !== task.taskId))
    } catch (err) { setMutateError(err.message) }
  }

  function handleSaved(saved, isEdit) {
    setTasks((prev) => isEdit
      ? prev.map((t) => t.taskId === saved.taskId ? saved : t)
      : [...prev, saved]
    )
    setModal(null)
  }

  const totalSP  = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)
  const doneSP   = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)
  const progress = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0

  return (
    <div
      className="px-6 py-5 h-full flex flex-col gap-4"
      onDragEnd={() => { setDraggedTaskId(null); setDragOverCol(null) }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
        <button onClick={() => navigate('/projects')} className="hover:text-foreground transition-colors">Projects</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => navigate(`/projects/${projectId}/sprints`)} className="hover:text-foreground transition-colors">
          {project?.name ?? '…'}
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{sprint?.name ?? '…'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground">{sprint?.name ?? 'Sprint Board'}</h1>
              {sprint?.goal && <p className="text-xs text-muted-foreground mt-0.5">{sprint.goal}</p>}
              {sprint && (() => {
                const chipClass = DATE_CHIP_CONFIG[sprint.status] ?? DATE_CHIP_CONFIG.planned
                const daysLeft = getDaysLeft(sprint.endDate, sprint.status)
                return (
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {(sprint.startDate || sprint.endDate) && (
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', chipClass)}>
                        <Calendar className="w-3 h-3 shrink-0" />
                        {sprint.startDate ? parseLocalDate(sprint.startDate).toLocaleDateString() : '—'}
                        {' → '}
                        {sprint.endDate ? parseLocalDate(sprint.endDate).toLocaleDateString() : '—'}
                      </span>
                    )}
                    {daysLeft && (
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        daysLeft.startsWith('1 ')
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      )}>
                        {daysLeft}
                      </span>
                    )}
                  </div>
                )
              })()}
              {totalSP > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{doneSP} / {totalSP} SP ({progress}%)</span>
                </div>
              )}
            </>
          )}
        </div>
        <Button size="sm" onClick={() => setModal('create')} className="shrink-0" disabled={isLoading}>
          <Plus className="w-3.5 h-3.5" />Add task
        </Button>
      </div>

      {(error || mutateError) && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />{error?.message ?? mutateError}
          <button className="ml-auto" onClick={() => setMutateError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {isLoading ? (
        <KanbanSkeleton />
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              col={col}
              tasks={tasks.filter((t) => t.status === col.key)}
              dragOverCol={dragOverCol}
              draggedTaskId={draggedTaskId}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragLeave={handleDragLeave}
              onEdit={(t) => setModal(t)}
              onDelete={handleDelete}
              onAddTask={() => setModal('create')}
            />
          ))}
        </div>
      )}

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          sprint={sprint}
          sprintId={sprintId}
          projectId={projectId}
          employees={employees}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
    </div>
  )
}
