import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { AlertCircle, BarChart3, CheckCircle2, Timer, TrendingUp, Clock } from 'lucide-react'
import { fetcher } from '../../lib/fetcher'
import { Skeleton } from '../../components/ui/Skeleton'
import { DEV_COLORS } from './constants'
import StatCard from './components/StatCard'
import BarChart from './components/BarChart'
import Insights from './components/Insights'
import DevLegend from './components/DevLegend'
import SprintVelocityChart from './components/SprintVelocityChart'
import ProductivityTable from './components/ProductivityTable'

function KpiSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

export default function TeamKPIs() {
  // Projects + sprints (shared with Overview via SWR cache)
  const { data: projects } = useSWR('/projects', fetcher)
  const { data: sprintMap } = useSWR(
    projects ? ['sprintMap', ...projects.map((p) => p.projectId)] : null,
    async () => {
      const entries = await Promise.all(
        projects.map((p) =>
          fetcher(`/sprints/project/${p.projectId}`)
            .then((s) => [p.projectId, s])
            .catch(() => [p.projectId, []])
        )
      )
      return Object.fromEntries(entries)
    }
  )

  // Employees
  const { data: employees, error, isLoading } = useSWR('/employees', fetcher)

  // Per-employee tasks (dependent on employees)
  const { data: empTasksMap } = useSWR(
    employees ? ['emp-tasks', ...employees.map((e) => e.employeeId)] : null,
    async () => {
      const rows = await Promise.all(
        employees.map((e) =>
          fetcher(`/tasks/employee/${e.employeeId}`)
            .then((t) => [e.employeeId, t])
            .catch(() => [e.employeeId, []])
        )
      )
      return Object.fromEntries(rows)
    }
  )

  // Per-project tasks (dependent on projects)
  const { data: projTasksMap } = useSWR(
    projects ? ['proj-tasks', ...projects.map((p) => p.projectId)] : null,
    async () => {
      const rows = await Promise.all(
        projects.map((p) =>
          fetcher(`/tasks/project/${p.projectId}`)
            .then((t) => [p.projectId, t])
            .catch(() => [p.projectId, []])
        )
      )
      return Object.fromEntries(rows)
    }
  )

  const [selectedSprintId, setSelectedSprintId] = useState('all')

  const allSprints = useMemo(() => {
    const map = new Map()
    Object.values(empTasksMap ?? {}).flat().forEach((t) => {
      if (t.sprint?.sprintId) map.set(t.sprint.sprintId, t.sprint)
    })
    return Array.from(map.values()).sort((a, b) => a.sprintId - b.sprintId)
  }, [empTasksMap])

  const uniqueTasks = useMemo(() => {
    const seen = new Set()
    return Object.values(empTasksMap ?? {}).flat().filter((t) => {
      if (seen.has(t.taskId)) return false
      seen.add(t.taskId)
      return true
    })
  }, [empTasksMap])

  const filteredTasks = useMemo(() =>
    selectedSprintId === 'all'
      ? uniqueTasks
      : uniqueTasks.filter((t) => t.sprint?.sprintId === selectedSprintId),
    [uniqueTasks, selectedSprintId])

  const developers = useMemo(() => (employees ?? []).filter((e) => e.role === 'developer'), [employees])
  const numDevs    = developers.length || 1

  const totalTasks    = filteredTasks.length
  const doneTasks     = filteredTasks.filter((t) => t.status === 'done').length
  const totalHours    = filteredTasks.filter((t) => t.status === 'done' && t.actualHours).reduce((s, t) => s + Number(t.actualHours), 0)
  const avgTasksPerDev = (doneTasks / numDevs).toFixed(1)
  const avgHoursPerDev = (totalHours / numDevs).toFixed(1)

  const devStats = useMemo(() =>
    developers.map((emp, i) => {
      const tasks   = (empTasksMap?.[emp.employeeId] ?? []).filter((t) => selectedSprintId === 'all' || t.sprint?.sprintId === selectedSprintId)
      const done    = tasks.filter((t) => t.status === 'done').length
      const inProg  = tasks.filter((t) => t.status === 'in_progress').length
      const blocked = tasks.filter((t) => t.status === 'blocked').length
      const hours   = tasks.filter((t) => t.status === 'done' && t.actualHours).reduce((s, t) => s + Number(t.actualHours), 0)
      const rate    = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
      const color   = DEV_COLORS[i % DEV_COLORS.length]
      return { emp, total: tasks.length, done, inProg, blocked, hours, rate, color }
    }),
    [developers, empTasksMap, selectedSprintId])

  const allProjTasks  = useMemo(() => Object.values(projTasksMap ?? {}).flat(), [projTasksMap])
  const allSprintsVel = useMemo(() => Object.values(sprintMap ?? {}).flat(), [sprintMap])
  const velocityData  = useMemo(() => {
    const relevant = allSprintsVel.filter((s) => s.status === 'completed' || s.status === 'active')
    return relevant.map((sprint) => {
      const sprintTasks   = allProjTasks.filter((t) => t.sprint?.sprintId === sprint.sprintId)
      const completedPts  = sprintTasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      const totalPts      = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      return { sprint, completedPts, totalPts }
    }).slice(-8)
  }, [allSprintsVel, allProjTasks])

  // Still loading employees or tasks
  if (isLoading || !empTasksMap) return <KpiSkeleton />

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error.message}
      </div>
    )
  }

  if (uniqueTasks.length === 0) {
    return (
      <div className="text-center py-14 rounded-lg border bg-card">
        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No task data available to calculate KPIs.</p>
      </div>
    )
  }

  const sprintLabel = selectedSprintId === 'all'
    ? 'All sprints'
    : (allSprints.find((s) => s.sprintId === selectedSprintId)?.name ?? 'Selected sprint')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">KPI Summary</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{sprintLabel}</p>
        </div>
        <select
          value={selectedSprintId === 'all' ? 'all' : String(selectedSprintId)}
          onChange={(e) => setSelectedSprintId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="text-xs border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All sprints</option>
          {allSprints.map((s) => <option key={s.sprintId} value={String(s.sprintId)}>{s.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Tasks"         value={`${doneTasks} / ${totalTasks}`} />
        <StatCard icon={Timer}        label="Total Hours"  value={`${totalHours.toFixed(1)}h`} />
        <StatCard icon={TrendingUp}   label="Avg Tasks/Dev" value={avgTasksPerDev} />
        <StatCard icon={Clock}        label="Avg Hours/Dev" value={`${avgHoursPerDev}h`} />
      </div>

      {devStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Completed Tasks by Developer</h2>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">{sprintLabel}</p>
            <BarChart bars={devStats.map((d) => ({ label: d.emp.firstName, value: d.done, color: d.color }))} unit="" chartHeight={180} />
            <DevLegend devStats={devStats} />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Hours by Developer</h2>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">{sprintLabel}</p>
            <BarChart bars={devStats.map((d) => ({ label: d.emp.firstName, value: parseFloat(d.hours.toFixed(1)), color: d.color }))} unit="h" chartHeight={180} />
            <DevLegend devStats={devStats} />
          </div>
        </div>
      )}

      {velocityData.length > 0 && <SprintVelocityChart velocityData={velocityData} />}
      {devStats.length >= 2   && <Insights devStats={devStats} />}
      {devStats.length > 0    && <ProductivityTable devStats={devStats} />}
    </div>
  )
}

