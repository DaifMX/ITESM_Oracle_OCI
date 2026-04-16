import { FolderKanban, Zap, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { cn, parseLocalDate } from '../../lib/utils'
import { STATUS_CONFIG } from './constants'
import StatCard from './components/StatCard'

export default function Overview({ projects, sprintMap, navigate }) {
  const totalActive = projects.filter((p) => p.status === 'active').length
  const allSprints = Object.values(sprintMap).flat()
  const activeSprints = allSprints.filter((s) => s.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FolderKanban} label="Total Projects" value={projects.length} />
        <StatCard icon={Zap} label="Active Projects" value={totalActive} />
        <StatCard icon={Clock} label="Active Sprints" value={activeSprints} />
        <StatCard icon={CheckCircle2} label="Completed Projects" value={projects.filter((p) => p.status === 'completed').length} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Projects</h2>
          <Button size="sm" onClick={() => navigate('/projects')}>View all</Button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-14 rounded-lg border bg-card">
            <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            <Button className="mt-3" size="sm" onClick={() => navigate('/projects')}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const sprints = sprintMap[project.projectId] || []
              const activeSprint = sprints.find((s) => s.status === 'active')
              const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning
              return (
                <div
                  key={project.projectId}
                  className="rounded-lg border bg-card px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.projectId}/sprints`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground text-sm truncate">{project.name}</h3>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusCfg.className)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</p>
                      {activeSprint && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">↳ {activeSprint.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activeSprints > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Active Sprints</h2>
          <div className="space-y-2">
            {allSprints
              .filter((s) => s.status === 'active')
              .map((sprint) => {
                const project = projects.find((p) => {
                  const ps = sprintMap[p.projectId] || []
                  return ps.some((s) => s.sprintId === sprint.sprintId)
                })
                return (
                  <div
                    key={sprint.sprintId}
                    className="rounded-lg border bg-card px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() =>
                      project && navigate(`/projects/${project.projectId}/sprints/${sprint.sprintId}/board`)
                    }
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{sprint.name}</p>
                      {project && <p className="text-xs text-muted-foreground">{project.name}</p>}
                    </div>
                    <div className="text-right">
                      {sprint.endDate && (
                        <p className="text-xs text-muted-foreground">
                          Ends {parseLocalDate(sprint.endDate).toLocaleDateString()}
                        </p>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                        Active
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
