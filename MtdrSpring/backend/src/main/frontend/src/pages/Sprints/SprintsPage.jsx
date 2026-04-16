import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getProjects,
  getSprintsByProject,
  createSprint,
  updateSprint,
  deleteSprint,
} from '../../lib/api'
import { Button } from '../../components/ui/button'
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, ChevronLeft,
  Zap, AlertCircle, Calendar
} from 'lucide-react'
import { cn, parseLocalDate } from '../../lib/utils'

const SPRINT_STATUSES = ['planned', 'active', 'completed']

const STATUS_CONFIG = {
  planned:   { label: 'Planned',   className: 'bg-muted text-muted-foreground' },
  active:    { label: 'Active',    className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
}

const EMPTY_FORM = { name: '', goal: '', status: 'planned', startDate: '', endDate: '' }

function SprintModal({ sprint, project, projectId, onClose, onSave }) {
  const [form, setForm] = useState(sprint ? {
    name: sprint.name || '',
    goal: sprint.goal || '',
    status: sprint.status || 'planned',
    startDate: sprint.startDate || '',
    endDate: sprint.endDate || '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setError('Start date cannot be after end date')
      return
    }
    if (project) {
      const ps = project.startDate
      const pe = project.endDate
      if ((form.startDate && ps && form.startDate < ps) ||
          (form.startDate && pe && form.startDate > pe) ||
          (form.endDate && pe && form.endDate > pe) ||
          (form.endDate && ps && form.endDate < ps)) {
        setError("You can't set a date outside the scope of this project")
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        project: { projectId: Number(projectId) },
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }
      const saved = sprint
        ? await updateSprint(sprint.sprintId, payload)
        : await createSprint(payload)
      onSave(saved, !!sprint)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg border shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-foreground">{sprint ? 'Edit Sprint' : 'New Sprint'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Sprint 1"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Goal</label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
              value={form.goal}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
              placeholder="What will this sprint achieve?"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {SPRINT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.startDate}
                max={form.endDate || undefined}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {sprint ? 'Save changes' : 'Create sprint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SprintsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [sprints, setSprints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    setLoading(true)
    try {
      const [projs, sprintsData] = await Promise.all([
        getProjects(),
        getSprintsByProject(projectId),
      ])
      setProject(projs.find((p) => p.projectId === Number(projectId)) || null)
      setSprints(sprintsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(sprint, e) {
    e.stopPropagation()
    if (!confirm(`Delete sprint "${sprint.name}"? Tasks in this sprint will become unassigned.`)) return
    try {
      await deleteSprint(sprint.sprintId)
      setSprints((prev) => prev.filter((s) => s.sprintId !== sprint.sprintId))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleStatusChange(sprint, newStatus) {
    try {
      const updated = await updateSprint(sprint.sprintId, { ...sprint, status: newStatus, project: { projectId: Number(projectId) } })
      setSprints((prev) => prev.map((s) => (s.sprintId === updated.sprintId ? updated : s)))
    } catch (err) {
      setError(err.message)
    }
  }

  function handleSaved(saved, isEdit) {
    if (isEdit) {
      setSprints((prev) => prev.map((s) => (s.sprintId === saved.sprintId ? saved : s)))
    } else {
      setSprints((prev) => [...prev, saved])
    }
    setModal(null)
  }

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate('/projects')} className="hover:text-foreground transition-colors">
          Projects
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{project?.name ?? '...'}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sprints</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setModal('create')}>
          <Plus className="w-3.5 h-3.5" />
          New sprint
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-20 rounded-lg border bg-card">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No sprints yet.</p>
          <Button className="mt-3" size="sm" onClick={() => setModal('create')}>
            Create first sprint
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sprints.map((sprint) => {
            const cfg = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.planned
            return (
              <div
                key={sprint.sprintId}
                className="group rounded-lg border bg-card px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm text-foreground">{sprint.name}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.className)}>
                        {cfg.label}
                      </span>
                    </div>
                    {sprint.goal && (
                      <p className="text-xs text-muted-foreground mt-1">{sprint.goal}</p>
                    )}
                    {(sprint.startDate || sprint.endDate) && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/70">
                        <Calendar className="w-3 h-3" />
                        {sprint.startDate && parseLocalDate(sprint.startDate).toLocaleDateString()}
                        {sprint.startDate && sprint.endDate && ' – '}
                        {sprint.endDate && parseLocalDate(sprint.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Quick status actions */}
                    {sprint.status === 'planned' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(sprint, 'active')}
                        title="Start sprint"
                      >
                        Start
                      </Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(sprint, 'completed')}
                        title="Complete sprint"
                      >
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.sprintId}/board`)}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      Board
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setModal(sprint)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      onClick={(e) => handleDelete(sprint, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <SprintModal
          sprint={modal === 'create' ? null : modal}
          project={project}
          projectId={projectId}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
    </div>
  )
}
