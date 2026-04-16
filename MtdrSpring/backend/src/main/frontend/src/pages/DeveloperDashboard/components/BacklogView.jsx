import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Package, ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { getProjects, getTasksByProject } from '../../../lib/api'
import PriorityBadge from './PriorityBadge'
import StatusBadge from './StatusBadge'

export default function BacklogView() {
  const [projects, setProjects]             = useState([])
  const [tasksByProject, setTasksByProject] = useState({})
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [expandedProjs, setExpandedProjs]   = useState({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProjects()
      .then(async (projs) => {
        if (cancelled) return
        setProjects(projs)
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

  function toggleProject(projectId) {
    setExpandedProjs((prev) => ({ ...prev, [projectId]: !prev[projectId] }))
  }

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

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {totalBacklog} unscheduled task{totalBacklog !== 1 ? 's' : ''} across all projects
      </p>
      {projects.map((project) => {
        const backlog  = tasksByProject[project.projectId] ?? []
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
