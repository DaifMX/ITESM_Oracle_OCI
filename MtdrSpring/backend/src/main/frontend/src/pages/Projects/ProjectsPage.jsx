import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { createProject, updateProject, deleteProject } from '../../lib/api'
import { fetcher } from '../../lib/fetcher'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { Plus, Pencil, Trash2, ChevronRight, FolderKanban, AlertCircle, Loader2, Inbox } from 'lucide-react'
import { cn, parseLocalDate } from '../../lib/utils'

const STATUSES = ['planning', 'active', 'completed', 'on_hold']

const STATUS_CONFIG = {
  planning:  { label: 'Planning',  className: 'bg-muted text-muted-foreground' },
  active:    { label: 'Active',    className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  on_hold:   { label: 'On Hold',   className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
}

const EMPTY_FORM = { name: '', description: '', status: 'planning', startDate: '', endDate: '' }

function ProjectsSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cn('flex items-center gap-4 px-5 py-4', i < 4 && 'border-b')}>
          <Skeleton className="w-8 h-8 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="w-4 h-4 rounded" />
        </div>
      ))}
    </div>
  )
}

function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState(project ? {
    name: project.name || '',
    description: project.description || '',
    status: project.status || 'planning',
    startDate: project.startDate || '',
    endDate: project.endDate || '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setError('Start date cannot be after end date')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null }
      const saved = project ? await updateProject(project.projectId, payload) : await createProject(payload)
      onSave(saved, !!project)
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
          <h2 className="font-semibold text-foreground">{project ? 'Edit Project' : 'New Project'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
            <input className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Project name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</label>
              <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.startDate} max={form.endDate || undefined} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</label>
              <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
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
              {project ? 'Save changes' : 'Create project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { data: projects = [], error, isLoading, mutate } = useSWR('/projects', fetcher)
  const [mutateError, setMutateError] = useState(null)
  const [modal, setModal] = useState(null)

  async function handleDelete(project, e) {
    e.stopPropagation()
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return
    try {
      await deleteProject(project.projectId)
      mutate(projects.filter((p) => p.projectId !== project.projectId), { revalidate: false })
    } catch (err) {
      setMutateError(err.message)
    }
  }

  function handleSaved(saved, isEdit) {
    mutate(
      isEdit
        ? projects.map((p) => (p.projectId === saved.projectId ? saved : p))
        : [saved, ...projects],
      { revalidate: false }
    )
    setModal(null)
  }

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setModal('create')}>
          <Plus className="w-3.5 h-3.5" />New project
        </Button>
      </div>

      {(error || mutateError) && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error?.message ?? mutateError}
        </div>
      )}

      {isLoading ? (
        <ProjectsSkeleton />
      ) : projects.length === 0 ? (
        <div className="text-center py-20 rounded-lg border bg-card">
          <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No projects yet.</p>
          <Button className="mt-3" size="sm" onClick={() => setModal('create')}>Create your first project</Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          {projects.map((project, idx) => {
            const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning
            return (
              <div
                key={project.projectId}
                className={cn(
                  'group flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors',
                  idx < projects.length - 1 && 'border-b'
                )}
                onClick={() => navigate(`/projects/${project.projectId}/sprints`)}
              >
                <div className="p-2 rounded-md bg-muted shrink-0">
                  <FolderKanban className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{project.name}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', cfg.className)}>{cfg.label}</span>
                  </div>
                  {project.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>}
                  {(project.startDate || project.endDate) && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {project.startDate && parseLocalDate(project.startDate).toLocaleDateString()}
                      {project.startDate && project.endDate && ' – '}
                      {project.endDate && parseLocalDate(project.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.projectId}/backlog`) }} title="View backlog">
                    <Inbox className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setModal(project) }} title="Edit project">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={(e) => handleDelete(project, e)} title="Delete project">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <ProjectModal project={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSave={handleSaved} />
      )}
    </div>
  )
}
