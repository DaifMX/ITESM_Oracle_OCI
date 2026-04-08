import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getProjects, getSprintsByProject,
  getEmployees, getTasksByEmployee, getTasksByProject,
} from '../lib/api'
import {
  Loader2, FolderKanban, Zap, Clock, CheckCircle2, AlertCircle,
  TrendingUp, Users, BarChart3,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  planning:  { label: 'Planning',   className: 'bg-muted text-muted-foreground' },
  active:    { label: 'Active',     className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  completed: { label: 'Completed',  className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  on_hold:   { label: 'On Hold',    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4 flex items-center gap-4">
      <div className="p-2 rounded-md bg-muted">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Team KPIs Tab ────────────────────────────────────────────────────────────

function TeamKPIs({ projects, sprintMap }) {
  const [employees, setEmployees]     = useState([])
  const [empTasksMap, setEmpTasksMap] = useState({})   // employeeId → tasks[]
  const [projTasksMap, setProjTasksMap] = useState({}) // projectId  → tasks[]
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEmployees()
      .then(async (emps) => {
        if (cancelled) return
        setEmployees(emps)
        const [empRows, projRows] = await Promise.all([
          Promise.all(
            emps.map((e) =>
              getTasksByEmployee(e.employeeId)
                .then((t) => [e.employeeId, t])
                .catch(() => [e.employeeId, []])
            )
          ),
          Promise.all(
            projects.map((p) =>
              getTasksByProject(p.projectId)
                .then((t) => [p.projectId, t])
                .catch(() => [p.projectId, []])
            )
          ),
        ])
        if (cancelled) return
        setEmpTasksMap(Object.fromEntries(empRows))
        setProjTasksMap(Object.fromEntries(projRows))
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [projects])

  // ── Team-wide KPIs ──
  const allEmpTasks = useMemo(() => Object.values(empTasksMap).flat(), [empTasksMap])
  const uniqueTasks = useMemo(() => {
    const seen = new Set()
    return allEmpTasks.filter((t) => {
      if (seen.has(t.taskId)) return false
      seen.add(t.taskId)
      return true
    })
  }, [allEmpTasks])

  const totalTasks      = uniqueTasks.length
  const doneTasks       = uniqueTasks.filter((t) => t.status === 'done').length
  const completionRate  = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const totalPtsDone    = uniqueTasks
    .filter((t) => t.status === 'done')
    .reduce((s, t) => s + (t.storyPoints ?? 0), 0)

  const tasksWithHours = uniqueTasks.filter((t) => t.status === 'done' && t.actualHours)
  const avgTaskHours   = tasksWithHours.length > 0
    ? (tasksWithHours.reduce((s, t) => s + Number(t.actualHours), 0) / tasksWithHours.length).toFixed(1)
    : null

  // ── Sprint Velocity ──
  const allSprints    = useMemo(() => Object.values(sprintMap).flat(), [sprintMap])
  const allProjTasks  = useMemo(() => Object.values(projTasksMap).flat(), [projTasksMap])
  const velocityData  = useMemo(() => {
    const relevant = allSprints.filter((s) => s.status === 'completed' || s.status === 'active')
    return relevant.map((sprint) => {
      const sprintTasks   = allProjTasks.filter((t) => t.sprint?.sprintId === sprint.sprintId)
      const completedPts  = sprintTasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      const totalPts      = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      return { sprint, completedPts, totalPts }
    }).slice(-8)
  }, [allSprints, allProjTasks])

  const maxVelocity = Math.max(...velocityData.map((d) => d.totalPts), 1)

  // ── Per-developer stats ──
  const devStats = useMemo(() =>
    employees
      .filter((e) => e.role === 'developer')
      .map((emp) => {
        const tasks   = empTasksMap[emp.employeeId] ?? []
        const done    = tasks.filter((t) => t.status === 'done').length
        const inProg  = tasks.filter((t) => t.status === 'in_progress').length
        const blocked = tasks.filter((t) => t.status === 'blocked').length
        const points  = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)
        const rate    = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
        return { emp, total: tasks.length, done, inProg, blocked, points, rate }
      }),
  [employees, empTasksMap])

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

  if (totalTasks === 0) {
    return (
      <div className="text-center py-14 rounded-lg border bg-card">
        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No task data available to calculate KPIs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp}   label="Team Completion Rate" value={`${completionRate}%`} />
        <StatCard icon={CheckCircle2} label="Tasks Completed"      value={`${doneTasks} / ${totalTasks}`} />
        <StatCard icon={Clock}        label="Avg Task Duration"    value={avgTaskHours ? `${avgTaskHours}h` : 'N/A'} sub={avgTaskHours ? 'actual hours' : 'no data yet'} />
        <StatCard icon={Zap}          label="Total Points Done"    value={totalPtsDone} sub="story points" />
      </div>

      {/* Completion progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground font-medium">Team overall progress</span>
          <span className="text-xs text-muted-foreground">{completionRate}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Sprint Velocity Chart */}
      {velocityData.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Sprint Velocity</h2>
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-end gap-3" style={{ height: '120px' }}>
              {velocityData.map(({ sprint, completedPts, totalPts }) => {
                const barH    = Math.round((totalPts / maxVelocity) * 96)
                const doneH   = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0
                return (
                  <div key={sprint.sprintId} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                    <span className="text-xs font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {completedPts}pts
                    </span>
                    <div className="w-full flex items-end" style={{ height: '88px' }}>
                      <div
                        className="w-full rounded-t-sm overflow-hidden relative bg-muted"
                        style={{ height: `${Math.max(barH, 4)}px` }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-sm transition-all duration-500"
                          style={{ height: `${doneH}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-full text-center leading-tight">
                      {sprint.name}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span className="text-xs text-muted-foreground">Completed pts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
                <span className="text-xs text-muted-foreground">Total pts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-developer Table */}
      {devStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Individual Productivity</h2>
          <div className="rounded-lg border bg-card overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Developer</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Done</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">In&nbsp;Progress</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Blocked</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Completion&nbsp;Rate</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Points</th>
                </tr>
              </thead>
              <tbody>
                {devStats.map(({ emp, total, done, inProg, blocked, points, rate }) => (
                  <tr key={emp.employeeId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground leading-tight">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.position || emp.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{total}</td>
                    <td className="px-4 py-3 text-center font-medium text-green-600 dark:text-green-400">{done}</td>
                    <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400">{inProg}</td>
                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{blocked}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function Overview({ projects, sprintMap, navigate }) {
  const totalActive   = projects.filter((p) => p.status === 'active').length
  const allSprints    = Object.values(sprintMap).flat()
  const activeSprints = allSprints.filter((s) => s.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FolderKanban} label="Total Projects"     value={projects.length} />
        <StatCard icon={Zap}          label="Active Projects"    value={totalActive} />
        <StatCard icon={Clock}        label="Active Sprints"     value={activeSprints} />
        <StatCard icon={CheckCircle2} label="Completed Projects" value={projects.filter((p) => p.status === 'completed').length} />
      </div>

      {/* Projects list */}
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
              const sprints     = sprintMap[project.projectId] || []
              const activeSprint = sprints.find((s) => s.status === 'active')
              const statusCfg   = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning

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

      {/* Active Sprints */}
      {allSprints.filter((s) => s.status === 'active').length > 0 && (
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
                          Ends {new Date(sprint.endDate).toLocaleDateString()}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview',  icon: FolderKanban },
  { key: 'kpis',     label: 'Team KPIs', icon: BarChart3 },
]

export default function DashboardPage() {
  const navigate   = useNavigate()
  const [tab, setTab]           = useState('overview')
  const [projects, setProjects] = useState([])
  const [sprintMap, setSprintMap] = useState({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    setLoading(true)
    getProjects()
      .then(async (projs) => {
        setProjects(projs)
        const entries = await Promise.all(
          projs.map((p) =>
            getSprintsByProject(p.projectId)
              .then((sprints) => [p.projectId, sprints])
              .catch(() => [p.projectId, []])
          )
        )
        setSprintMap(Object.fromEntries(entries))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your projects, sprints, and team productivity</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <Overview projects={projects} sprintMap={sprintMap} navigate={navigate} />
      )}
      {tab === 'kpis' && (
        <TeamKPIs projects={projects} sprintMap={sprintMap} />
      )}
    </div>
  )
}
