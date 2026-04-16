import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, Plus, ChevronRight, AlertCircle, X } from 'lucide-react'
import { getProjects, getSprintsByProject, getTasksBySprint, updateTask, deleteTask, getEmployees } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { COLUMNS } from './constants'
import KanbanColumn from './components/KanbanColumn'
import TaskModal from './components/TaskModal'

export default function KanbanPage() {
  const { projectId, sprintId } = useParams()
  const navigate = useNavigate()

  const [project, setProject]           = useState(null)
  const [sprint, setSprint]             = useState(null)
  const [tasks, setTasks]               = useState([])
  const [employees, setEmployees]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [modal, setModal]               = useState(null) // null | 'create' | task

  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverCol, setDragOverCol]     = useState(null)
  const dragLeaveTimer                    = useRef(null)

  useEffect(() => { loadData() }, [projectId, sprintId])

  async function loadData() {
    setLoading(true)
    try {
      const [projs, sprintsData, tasksData, emps] = await Promise.all([
        getProjects(), getSprintsByProject(projectId),
        getTasksBySprint(sprintId), getEmployees(),
      ])
      setProject(projs.find((p) => p.projectId === Number(projectId)) ?? null)
      setSprint(sprintsData.find((s) => s.sprintId === Number(sprintId)) ?? null)
      setTasks(tasksData)
      setEmployees(emps)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  // ─── Drag handlers ────────────────────────────────────────────────────────

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
      await updateTask(taskId, {
        ...task,
        status: targetColKey,
        sprint: { sprintId: Number(sprintId) },
        project: { projectId: Number(projectId) },
      })
    } catch {
      setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: task.status } : t))
      setError('Failed to move task. Please try again.')
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async function handleDelete(task) {
    if (!confirm(`Delete task "${task.title}"?`)) return
    try {
      await deleteTask(task.taskId)
      setTasks((prev) => prev.filter((t) => t.taskId !== task.taskId))
    } catch (err) { setError(err.message) }
  }

  function handleSaved(saved, isEdit) {
    setTasks((prev) => isEdit
      ? prev.map((t) => t.taskId === saved.taskId ? saved : t)
      : [...prev, saved]
    )
    setModal(null)
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

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
          <h1 className="text-xl font-bold text-foreground">{sprint?.name ?? 'Sprint Board'}</h1>
          {sprint?.goal && <p className="text-xs text-muted-foreground mt-0.5">{sprint.goal}</p>}
          {totalSP > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{doneSP} / {totalSP} SP ({progress}%)</span>
            </div>
          )}
        </div>
        <Button size="sm" onClick={() => setModal('create')} className="shrink-0">
          <Plus className="w-3.5 h-3.5" />Add task
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button className="ml-auto" onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
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
