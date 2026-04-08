import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getProjects, getSprintsByProject,
  getTasksBySprint, createTask, updateTask, deleteTask,
  getTaskAssignees, assignEmployee, unassignEmployee,
  getComments, createComment, deleteComment,
  getEmployees,
} from '../lib/api'
import { Button } from '../components/ui/button'
import {
  Loader2, Plus, Trash2, ChevronRight,
  AlertCircle, X, Check, Flag, Hash, User, MessageSquare,
} from 'lucide-react'
import { cn } from '../lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'todo',        label: 'To Do',       headerClass: 'bg-muted/60',         dotClass: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress',  headerClass: 'bg-yellow-500/10',    dotClass: 'bg-yellow-500' },
  { key: 'done',        label: 'Done',         headerClass: 'bg-green-500/10',     dotClass: 'bg-green-500' },
  { key: 'blocked',     label: 'Blocked',      headerClass: 'bg-destructive/10',   dotClass: 'bg-destructive' },
]

const PRIORITIES = ['low', 'medium', 'high', 'critical']

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      className: 'text-muted-foreground' },
  medium:   { label: 'Medium',   className: 'text-yellow-600 dark:text-yellow-400' },
  high:     { label: 'High',     className: 'text-orange-500 dark:text-orange-400' },
  critical: { label: 'Critical', className: 'text-destructive font-semibold' },
}

const EMPTY_TASK_FORM = {
  title: '', description: '', status: 'todo', priority: 'medium',
  storyPoints: '', estimatedHours: '', startDate: '', expectedEndDate: '',
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskModal({ task, sprintId, projectId, employees, onClose, onSave }) {
  const isEdit = !!task
  const [form, setForm] = useState(task ? {
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    storyPoints: task.storyPoints ?? '',
    estimatedHours: task.estimatedHours ?? '',
    startDate: task.startDate || '',
    expectedEndDate: task.expectedEndDate || '',
  } : EMPTY_TASK_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('details')

  const [assignees, setAssignees] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    setLoadingMeta(true)
    Promise.all([getTaskAssignees(task.taskId), getComments(task.taskId)])
      .then(([a, c]) => { setAssignees(a); setComments(c) })
      .catch(() => {})
      .finally(() => setLoadingMeta(false))
  }, [isEdit])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        sprint: { sprintId: Number(sprintId) },
        project: { projectId: Number(projectId) },
        storyPoints: form.storyPoints !== '' ? Number(form.storyPoints) : null,
        estimatedHours: form.estimatedHours !== '' ? Number(form.estimatedHours) : null,
        startDate: form.startDate || null,
        expectedEndDate: form.expectedEndDate || null,
      }
      const saved = isEdit ? await updateTask(task.taskId, payload) : await createTask(payload)
      onSave(saved, isEdit)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleAssign(employeeId) {
    await assignEmployee(task.taskId, employeeId)
    setAssignees(await getTaskAssignees(task.taskId))
  }

  async function handleUnassign(employeeId) {
    await unassignEmployee(task.taskId, employeeId)
    setAssignees((prev) => prev.filter((a) => a.employee?.employeeId !== employeeId))
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    setSendingComment(true)
    try {
      const c = await createComment(task.taskId, newComment.trim())
      setComments((prev) => [...prev, c])
      setNewComment('')
    } catch (err) { setError(err.message) }
    finally { setSendingComment(false) }
  }

  const assignedIds = new Set(assignees.map((a) => a.employee?.employeeId))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-foreground">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Tabs */}
        {isEdit && (
          <div className="flex border-b shrink-0">
            {[
              { id: 'details', label: 'Details' },
              { id: 'assignees', label: `Assignees${assignees.length ? ` (${assignees.length})` : ''}` },
              { id: 'comments', label: `Comments${comments.length ? ` (${comments.length})` : ''}` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-2.5 text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Details */}
          {(tab === 'details' || !isEdit) && (
            <form id="task-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <Field label="Title *">
                <input
                  className="field"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Task title"
                />
              </Field>
              <Field label="Description">
                <textarea
                  className="field resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <select className="field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select className="field" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Story Points">
                  <input type="number" min="0" className="field" value={form.storyPoints} onChange={(e) => setForm((f) => ({ ...f, storyPoints: e.target.value }))} placeholder="—" />
                </Field>
                <Field label="Est. Hours">
                  <input type="number" min="0" step="0.5" className="field" value={form.estimatedHours} onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} placeholder="—" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <input type="date" className="field" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </Field>
                <Field label="Due Date">
                  <input type="date" className="field" value={form.expectedEndDate} onChange={(e) => setForm((f) => ({ ...f, expectedEndDate: e.target.value }))} />
                </Field>
              </div>
              {error && <ErrorMsg>{error}</ErrorMsg>}
            </form>
          )}

          {/* Assignees */}
          {tab === 'assignees' && isEdit && (
            <div className="px-5 py-4 space-y-4">
              {loadingMeta ? <Spinner /> : (
                <>
                  {assignees.length > 0 && (
                    <div className="space-y-2">
                      <SectionLabel>Assigned</SectionLabel>
                      {assignees.map((a) => {
                        const emp = a.employee
                        return (
                          <EmployeeRow key={emp?.employeeId} emp={emp}>
                            <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => handleUnassign(emp?.employeeId)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </EmployeeRow>
                        )
                      })}
                    </div>
                  )}
                  <div className="space-y-2">
                    <SectionLabel>Add assignee</SectionLabel>
                    {employees.filter((e) => !assignedIds.has(e.employeeId)).length === 0
                      ? <p className="text-xs text-muted-foreground">All employees assigned.</p>
                      : employees.filter((e) => !assignedIds.has(e.employeeId)).map((emp) => (
                          <EmployeeRow key={emp.employeeId} emp={emp}>
                            <Button variant="secondary" size="sm" onClick={() => handleAssign(emp.employeeId)}>
                              <Plus className="w-3 h-3" />Assign
                            </Button>
                          </EmployeeRow>
                        ))
                    }
                  </div>
                </>
              )}
            </div>
          )}

          {/* Comments */}
          {tab === 'comments' && isEdit && (
            <div className="px-5 py-4 space-y-3">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  className="field flex-1"
                  placeholder="Add a comment…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button type="submit" size="sm" disabled={sendingComment || !newComment.trim()}>
                  {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </Button>
              </form>
              {comments.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-6">No comments yet.</p>
                : <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.commentId} className="group rounded-md border bg-background px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex gap-2 mb-1">
                              <span className="text-xs font-medium">{c.employee?.firstName} {c.employee?.lastName}</span>
                              {c.createdAt && <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>}
                            </div>
                            <p className="text-sm">{c.content}</p>
                          </div>
                          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                            onClick={async () => { await deleteComment(c.commentId); setComments((p) => p.filter((x) => x.commentId !== c.commentId)) }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>

        {/* Footer */}
        {(tab === 'details' || !isEdit) && (
          <div className="border-t px-5 py-3 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="task-form" size="sm" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onEdit, onDelete, onDragStart, isDragging }) {
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
            {new Date(task.expectedEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Delete on hover */}
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

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, dragOverCol, onDragOver, onDrop, onDragLeave, draggedTaskId, onEdit, onDelete, onAddTask, onDragStart }) {
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
      {/* Column header */}
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

      {/* Drop zone indicator */}
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

      {/* Add task (only for todo column) */}
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

// ─── Kanban Page ──────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const { projectId, sprintId } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [sprint, setSprint] = useState(null)
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // null | 'create' | task

  // DnD state
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const dragLeaveTimer = useRef(null)

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

  // ─── Drag handlers ──────────────────────────────────────────────────────

  function handleDragStart(taskId) {
    setDraggedTaskId(taskId)
  }

  function handleDragOver(colKey) {
    clearTimeout(dragLeaveTimer.current)
    setDragOverCol(colKey)
  }

  function handleDragLeave() {
    // Small delay so moving between children doesn't flicker
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

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: targetColKey } : t))

    try {
      await updateTask(taskId, {
        ...task,
        status: targetColKey,
        sprint: { sprintId: Number(sprintId) },
        project: { projectId: Number(projectId) },
      })
    } catch (err) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: task.status } : t))
      setError('Failed to move task. Please try again.')
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────

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

  // ─── Derived ────────────────────────────────────────────────────────────
  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)
  const doneSP  = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)
  const progress = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0

  return (
    <div className="px-6 py-5 h-full flex flex-col gap-4"
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
        <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        /* Board */
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              col={col}
              tasks={tasks.filter((t) => t.status === col.key)}
              dragOverCol={dragOverCol}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragLeave={handleDragLeave}
              draggedTaskId={draggedTaskId}
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

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{children}</p>
}

function EmployeeRow({ emp, children }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2.5 bg-background">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm">{emp?.firstName} {emp?.lastName}</span>
        {emp?.role && <span className="text-xs text-muted-foreground capitalize">{emp.role}</span>}
      </div>
      {children}
    </div>
  )
}

function ErrorMsg({ children }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5" />{children}
    </p>
  )
}

function Spinner() {
  return <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
}
