import { useState, useEffect, useCallback, useRef } from 'react'
import { getUser } from '../../lib/auth'
import { getTasksByEmployee, getProjects, getTasksByProject, updateTask } from '../../lib/api'
import {
  Loader2, CheckCircle2, AlertCircle, CircleDot,
  ListTodo, TrendingUp, Zap, CalendarClock, ChevronDown,
  LayoutList, Columns, Package,
} from 'lucide-react'
import { cn, parseLocalDate } from '../../lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['todo', 'in_progress', 'done', 'blocked']

const STATUS_CONFIG = {
  todo:        { label: 'To Do',       className: 'bg-muted text-muted-foreground',                    icon: ListTodo },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',   icon: CircleDot },
  done:        { label: 'Done',        className: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
  blocked:     { label: 'Blocked',     className: 'bg-red-500/10 text-red-600 dark:text-red-400',       icon: AlertCircle },
}

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      className: 'bg-muted text-muted-foreground' },
  medium:   { label: 'Medium',   className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  high:     { label: 'High',     className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
}

const KANBAN_COLUMNS = [
  { key: 'todo',        label: 'To Do',       headerClass: 'bg-muted/60',          dotClass: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', headerClass: 'bg-yellow-500/10',     dotClass: 'bg-yellow-500' },
  { key: 'done',        label: 'Done',        headerClass: 'bg-green-500/10',      dotClass: 'bg-green-500' },
  { key: 'blocked',     label: 'Blocked',     headerClass: 'bg-destructive/10',    dotClass: 'bg-destructive' },
]

// ─── Shared badge components ──────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ─── Status dropdown (list view) ─────────────────────────────────────────────

function StatusSelect({ task, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const cfg  = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo
  const Icon = cfg.icon

  async function handleChange(e) {
    const newStatus = e.target.value
    setLoading(true)
    try { await onUpdate(task, newStatus) }
    finally { setLoading(false) }
  }

  return (
    <div className="relative shrink-0">
      <select
        value={task.status}
        onChange={handleChange}
        disabled={loading}
        className={cn(
          'appearance-none cursor-pointer pl-7 pr-6 py-1.5 rounded-md text-xs font-medium',
          'border border-border bg-card hover:bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          : <Icon className={cn('w-3.5 h-3.5', cfg.className.split(' ').find((c) => c.startsWith('text-')))} />
        }
      </span>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
    </div>
  )
}

// ─── Task row (list view) ─────────────────────────────────────────────────────

function TaskRow({ task, onUpdate }) {
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

// ─── Kanban card (kanban view) ────────────────────────────────────────────────

function KanbanCard({ task, onDragStart }) {
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

// ─── Kanban board ─────────────────────────────────────────────────────────────

function KanbanBoard({ tasks, onUpdate }) {
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
            {/* Column header */}
            <div className={cn('px-3 py-2.5 rounded-t-lg flex items-center justify-between', col.headerClass)}>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', col.dotClass)} />
                <span className="text-xs font-semibold text-foreground">{col.label}</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">{colTasks.length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2">
              {colTasks.map((task) => (
                <KanbanCard
                  key={task.taskId}
                  task={task}
                  onDragStart={handleDragStart}
                />
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

// ─── Backlog tab ──────────────────────────────────────────────────────────────

function BacklogView() {
  const [projects, setProjects]       = useState([])
  const [tasksByProject, setTasksByProject] = useState({}) // projectId → tasks[]
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [expandedProjs, setExpandedProjs] = useState({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProjects()
      .then(async (projs) => {
        if (cancelled) return
        setProjects(projs)
        // Expand all by default
        setExpandedProjs(Object.fromEntries(projs.map((p) => [p.projectId, true])))
        const rows = await Promise.all(
          projs.map((p) =>
            getTasksByProject(p.projectId)
              .then((tasks) => [p.projectId, tasks.filter((t) => t.sprint == null)])
              .catch(() => [p.projectId, []])
          )
        )
        if (!cancelled) setTasksByProject(Object.fromEntries(rows))
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    )
  }

  const totalBacklog = Object.values(tasksByProject).reduce((s, t) => s + t.length, 0)

  if (totalBacklog === 0) {
    return (
      <div className="text-center py-14 rounded-lg border bg-card">
        <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No backlog items. All tasks are assigned to sprints.</p>
      </div>
    )
  }

  function toggleProject(projectId) {
    setExpandedProjs((prev) => ({ ...prev, [projectId]: !prev[projectId] }))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{totalBacklog} unscheduled task{totalBacklog !== 1 ? 's' : ''} across all projects</p>
      {projects.map((project) => {
        const backlog = tasksByProject[project.projectId] ?? []
        if (backlog.length === 0) return null
        const expanded = expandedProjs[project.projectId] ?? true

        return (
          <div key={project.projectId} className="rounded-lg border bg-card overflow-hidden">
            <button
              onClick={() => toggleProject(project.projectId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{project.name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {backlog.length}
                </span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', !expanded && '-rotate-90')} />
            </button>

            {expanded && (
              <div className="divide-y">
                {backlog.map((task) => (
                  <div key={task.taskId} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.storyPoints != null && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          {task.storyPoints}pt
                        </span>
                      )}
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { key: 'tasks',   label: 'My Tasks', icon: ListTodo },
  { key: 'backlog', label: 'Backlog',  icon: Package },
]

export default function DeveloperDashboardPage() {
  const user = getUser()
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [mainTab, setMainTab]       = useState('tasks')
  const [view, setView]             = useState('list') // 'list' | 'kanban'

  const load = useCallback(() => {
    if (!user?.employeeId) return
    setLoading(true)
    getTasksByEmployee(user.employeeId)
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.employeeId])

  useEffect(() => { load() }, [load])

  const handleUpdate = useCallback(async (task, newStatus) => {
    const updated = await updateTask(task.taskId, { ...task, status: newStatus })
    setTasks((prev) => prev.map((t) => (t.taskId === updated.taskId ? updated : t)))
  }, [])

  // ── KPIs ──
  const total      = tasks.length
  const done       = tasks.filter((t) => t.status === 'done').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const blocked    = tasks.filter((t) => t.status === 'blocked').length
  const overdue    = tasks.filter(
    (t) => t.expectedEndDate && t.status !== 'done' && parseLocalDate(t.expectedEndDate) < new Date()
  ).length
  const totalPoints = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)

  const filtered = filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, {user?.firstName ?? 'Developer'} — here are your assigned tasks
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: ListTodo,     label: 'Total Tasks',  value: total },
          { icon: CheckCircle2, label: 'Completed',    value: done },
          { icon: CircleDot,    label: 'In Progress',  value: inProgress },
          { icon: AlertCircle,  label: 'Blocked',      value: blocked,    highlight: blocked > 0 },
          { icon: CalendarClock,label: 'Overdue',      value: overdue,    highlight: overdue > 0 },
          { icon: Zap,          label: 'Points Done',  value: totalPoints, sub: 'story pts' },
        ].map(({ icon: Icon, label, value, sub, highlight }) => (
          <div
            key={label}
            className={cn(
              'rounded-lg border bg-card px-5 py-4 flex flex-col gap-3',
              highlight && 'border-red-300 dark:border-red-800 bg-red-500/5'
            )}
          >
            <div className={cn('p-2 rounded-md w-fit', highlight ? 'bg-red-500/10' : 'bg-muted')}>
              <Icon className={cn('w-5 h-5', highlight ? 'text-red-500' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', highlight ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
              {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Completion bar */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground font-medium">Overall progress</span>
            <span className="text-xs text-muted-foreground">{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Tabs: My Tasks | Backlog */}
      <div className="flex items-center border-b">
        {MAIN_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              mainTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* My Tasks tab */}
      {mainTab === 'tasks' && (
        <div className="space-y-4">
          {/* Controls row: filter tabs + view toggle */}
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

          {/* Empty state */}
          {filtered.length === 0 ? (
            <div className="text-center py-14 rounded-lg border bg-card">
              <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {total === 0 ? 'No tasks have been assigned to you yet.' : 'No tasks match this filter.'}
              </p>
            </div>
          ) : view === 'list' ? (
            <div className="space-y-3">
              {filtered.map((task) => (
                <TaskRow key={task.taskId} task={task} onUpdate={handleUpdate} />
              ))}
            </div>
          ) : (
            <KanbanBoard tasks={filtered} onUpdate={handleUpdate} />
          )}
        </div>
      )}

      {/* Backlog tab */}
      {mainTab === 'backlog' && <BacklogView />}
    </div>
  )
}
