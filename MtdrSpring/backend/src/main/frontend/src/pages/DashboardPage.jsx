import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getProjects, getSprintsByProject,
  getEmployees, getTasksByEmployee, getTasksByProject,
} from '../lib/api'
import {
  Loader2, FolderKanban, Zap, Clock, CheckCircle2, AlertCircle,
  TrendingUp, Users, BarChart3, Timer, Lightbulb,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { cn, parseLocalDate } from '../lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  planning:  { label: 'Planning',   className: 'bg-muted text-muted-foreground' },
  active:    { label: 'Active',     className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  completed: { label: 'Completed',  className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  on_hold:   { label: 'On Hold',    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
}

const DEV_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

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

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ bars, unit = '', chartHeight = 160 }) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1)
  const innerH = chartHeight - 48

  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height: `${chartHeight}px` }}>
      {bars.map((bar, i) => {
        const barH = Math.round((bar.value / maxVal) * innerH)
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0">
            <span
              className="text-xs font-bold whitespace-nowrap"
              style={{ color: bar.value > 0 ? bar.color : '#9ca3af' }}
            >
              {bar.value > 0 ? `${bar.value}${unit}` : '0'}
            </span>
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{
                height: `${Math.max(barH, bar.value > 0 ? 6 : 2)}px`,
                backgroundColor: bar.value > 0 ? bar.color : '#e5e7eb',
              }}
            />
            <span
              className="truncate w-full text-center leading-tight mt-0.5"
              style={{ fontSize: '10px', color: '#6b7280' }}
            >
              {bar.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Developer Card ───────────────────────────────────────────────────────────

function DevCard({ emp, done, total, inProg, blocked, hours, rate, color }) {
  const initials = `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()
  const avgH = done > 0 && hours > 0 ? (hours / done).toFixed(1) : null

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">
            {emp.firstName} {emp.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{emp.position || emp.email}</p>
        </div>
        <span
          className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {rate}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${rate}%`, backgroundColor: color }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-bold text-foreground">{done}</p>
          <p className="text-xs text-muted-foreground">Done</p>
        </div>
        <div>
          <p className="text-xl font-bold text-muted-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color: hours > 0 ? '#f59e0b' : undefined }}>
            {hours > 0 ? `${hours.toFixed(1)}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Hrs reales</p>
        </div>
      </div>

      {/* Pills */}
      <div className="flex gap-1.5 flex-wrap">
        {inProg > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {inProg} en progreso
          </span>
        )}
        {blocked > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            {blocked} bloqueado{blocked > 1 ? 's' : ''}
          </span>
        )}
        {avgH && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            ~{avgH}h/task
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Insights ─────────────────────────────────────────────────────────────────

function Insights({ devStats }) {
  const insights = useMemo(() => {
    const active = devStats.filter((d) => d.total > 0)
    if (active.length < 2) return []
    const list = []

    const byRate  = [...active].sort((a, b) => b.rate - a.rate)
    const byDone  = [...active].sort((a, b) => b.done - a.done)
    const byHours = [...active].sort((a, b) => b.hours - a.hours)

    const top = byRate[0]
    const low = byRate[byRate.length - 1]

    if (top.rate - low.rate > 15) {
      list.push({
        type: 'gap',
        msg: `Brecha de ${top.rate - low.rate}% en tasa de completado: ${top.emp.firstName} (${top.rate}%) vs ${low.emp.firstName} (${low.rate}%). Considerar redistribución de carga o sesión de pair programming.`,
      })
    }

    const mostDone = byDone[0]
    if (mostDone.done > 0) {
      list.push({
        type: 'top',
        msg: `${mostDone.emp.firstName} completó más tareas (${mostDone.done}). Reconocer el desempeño y compartir buenas prácticas con el equipo.`,
      })
    }

    const mostHours = byHours[0]
    if (mostHours.hours > 0) {
      list.push({
        type: 'hours',
        msg: `${mostHours.emp.firstName} registró el mayor número de horas reales (${mostHours.hours.toFixed(1)}h). Verificar si la carga de trabajo está bien balanceada entre el equipo.`,
      })
    }

    const blockedDevs = active.filter((d) => d.blocked > 0)
    if (blockedDevs.length > 0) {
      const names = blockedDevs.map((d) => `${d.emp.firstName} (${d.blocked})`).join(', ')
      list.push({
        type: 'blocked',
        msg: `Tareas bloqueadas en: ${names}. Agendar standup enfocado en remover impedimentos para desbloquear el progreso.`,
      })
    }

    const withHours = active.filter((d) => d.done > 0 && d.hours > 0)
    if (withHours.length >= 2) {
      const efficient = [...withHours].sort((a, b) => (a.hours / a.done) - (b.hours / b.done))[0]
      list.push({
        type: 'efficiency',
        msg: `${efficient.emp.firstName} tiene el mejor ratio de eficiencia (~${(efficient.hours / efficient.done).toFixed(1)}h/tarea). Documentar su flujo de trabajo como referencia del equipo.`,
      })
    }

    return list.slice(0, 4)
  }, [devStats])

  if (insights.length === 0) return null

  const meta = {
    gap:        { icon: '📊', cls: 'border-amber-400/40 bg-amber-500/5' },
    top:        { icon: '🏆', cls: 'border-green-400/40 bg-green-500/5' },
    hours:      { icon: '⏱️', cls: 'border-blue-400/40 bg-blue-500/5' },
    blocked:    { icon: '🚧', cls: 'border-red-400/40 bg-red-500/5' },
    efficiency: { icon: '⚡', cls: 'border-violet-400/40 bg-violet-500/5' },
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">Insights & Acciones de Mejora</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((ins, i) => {
          const m = meta[ins.type] ?? { icon: '💡', cls: 'border-border bg-card' }
          return (
            <div key={i} className={cn('rounded-lg border p-3.5 text-sm leading-snug', m.cls)}>
              <span className="mr-2">{m.icon}</span>
              {ins.msg}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Team KPIs Tab ────────────────────────────────────────────────────────────

function TeamKPIs({ projects, sprintMap }) {
  const [employees, setEmployees]       = useState([])
  const [empTasksMap, setEmpTasksMap]   = useState({})
  const [projTasksMap, setProjTasksMap] = useState({})
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [selectedSprintId, setSelectedSprintId] = useState('all')

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

  // All sprints that appear in any employee's tasks
  const allSprints = useMemo(() => {
    const map = new Map()
    Object.values(empTasksMap).flat().forEach((t) => {
      if (t.sprint?.sprintId) map.set(t.sprint.sprintId, t.sprint)
    })
    return Array.from(map.values()).sort((a, b) => a.sprintId - b.sprintId)
  }, [empTasksMap])

  // All unique tasks (de-duplicated)
  const uniqueTasks = useMemo(() => {
    const seen = new Set()
    return Object.values(empTasksMap).flat().filter((t) => {
      if (seen.has(t.taskId)) return false
      seen.add(t.taskId)
      return true
    })
  }, [empTasksMap])

  // Filtered unique tasks for summary cards
  const filteredTasks = useMemo(() =>
    selectedSprintId === 'all'
      ? uniqueTasks
      : uniqueTasks.filter((t) => t.sprint?.sprintId === selectedSprintId),
  [uniqueTasks, selectedSprintId])

  const developers = useMemo(() => employees.filter((e) => e.role === 'developer'), [employees])
  const numDevs    = developers.length || 1

  const totalTasks     = filteredTasks.length
  const doneTasks      = filteredTasks.filter((t) => t.status === 'done').length
  const totalHours     = filteredTasks
    .filter((t) => t.status === 'done' && t.actualHours)
    .reduce((s, t) => s + Number(t.actualHours), 0)
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const avgTasksPerDev = (doneTasks / numDevs).toFixed(1)
  const avgHoursPerDev = (totalHours / numDevs).toFixed(1)

  // Per-developer stats (respects sprint filter)
  const devStats = useMemo(() =>
    developers.map((emp, i) => {
      const tasks   = (empTasksMap[emp.employeeId] ?? []).filter((t) =>
        selectedSprintId === 'all' || t.sprint?.sprintId === selectedSprintId
      )
      const done    = tasks.filter((t) => t.status === 'done').length
      const inProg  = tasks.filter((t) => t.status === 'in_progress').length
      const blocked = tasks.filter((t) => t.status === 'blocked').length
      const hours   = tasks
        .filter((t) => t.status === 'done' && t.actualHours)
        .reduce((s, t) => s + Number(t.actualHours), 0)
      const rate    = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
      const color   = DEV_COLORS[i % DEV_COLORS.length]
      return { emp, total: tasks.length, done, inProg, blocked, hours, rate, color }
    }),
  [developers, empTasksMap, selectedSprintId])

  // Sprint velocity (always all-time, separate from filter)
  const allProjTasks  = useMemo(() => Object.values(projTasksMap).flat(), [projTasksMap])
  const allSprintsVel = useMemo(() => Object.values(sprintMap).flat(), [sprintMap])
  const velocityData  = useMemo(() => {
    const relevant = allSprintsVel.filter((s) => s.status === 'completed' || s.status === 'active')
    return relevant.map((sprint) => {
      const sprintTasks  = allProjTasks.filter((t) => t.sprint?.sprintId === sprint.sprintId)
      const completedPts = sprintTasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      const totalPts     = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      return { sprint, completedPts, totalPts }
    }).slice(-8)
  }, [allSprintsVel, allProjTasks])
  const maxVelocity = Math.max(...velocityData.map((d) => d.totalPts), 1)

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

  if (uniqueTasks.length === 0) {
    return (
      <div className="text-center py-14 rounded-lg border bg-card">
        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No hay datos de tareas para calcular KPIs.</p>
      </div>
    )
  }

  const sprintLabel = selectedSprintId === 'all'
    ? 'Todos los sprints'
    : (allSprints.find((s) => s.sprintId === selectedSprintId)?.name ?? 'Sprint seleccionado')

  const tasksChartBars = devStats.map((d) => ({
    label: d.emp.firstName,
    value: d.done,
    color: d.color,
  }))

  const hoursChartBars = devStats.map((d) => ({
    label: d.emp.firstName,
    value: parseFloat(d.hours.toFixed(1)),
    color: d.color,
  }))

  return (
    <div className="space-y-6">

      {/* ── Sprint filter + title ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Resumen de Indicadores</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{sprintLabel}</p>
        </div>
        <select
          value={selectedSprintId === 'all' ? 'all' : String(selectedSprintId)}
          onChange={(e) =>
            setSelectedSprintId(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="text-xs border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Todos los sprints</option>
          {allSprints.map((s) => (
            <option key={s.sprintId} value={String(s.sprintId)}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={CheckCircle2}
          label="# Tasks"
          value={totalTasks}
          sub={`${doneTasks} completadas`}
        />
        <StatCard
          icon={Timer}
          label="# Horas Reales"
          value={`${totalHours.toFixed(1)}h`}
          sub="horas registradas"
        />
        <StatCard
          icon={TrendingUp}
          label="Promedio Tasks/Dev"
          value={avgTasksPerDev}
          sub="tasks completadas"
        />
        <StatCard
          icon={Clock}
          label="Promedio Horas/Dev"
          value={`${avgHoursPerDev}h`}
          sub="horas reales"
        />
      </div>

      {/* ── Team progress bar ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground font-medium">Progreso del equipo</span>
          <span className="text-xs text-muted-foreground">
            {doneTasks} / {totalTasks} tareas ({completionRate}%)
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* ── Bar Charts ── */}
      {devStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tasks completadas */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Tasks Completadas por Developer</h2>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">{sprintLabel}</p>
            <BarChart bars={tasksChartBars} unit="" chartHeight={180} />
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
              {devStats.map((d) => (
                <div key={d.emp.employeeId} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground">{d.emp.firstName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Horas reales */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Horas Reales por Developer</h2>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">{sprintLabel}</p>
            <BarChart bars={hoursChartBars} unit="h" chartHeight={180} />
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
              {devStats.map((d) => (
                <div key={d.emp.employeeId} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground">{d.emp.firstName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Insights ── */}
      {devStats.length >= 2 && <Insights devStats={devStats} />}

      {/* ── Individual Developer KPI Cards ── */}
      {devStats.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">KPIs Individuales por Developer</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devStats.map(({ emp, total, done, inProg, blocked, hours, rate, color }) => (
              <DevCard
                key={emp.employeeId}
                emp={emp}
                total={total}
                done={done}
                inProg={inProg}
                blocked={blocked}
                hours={hours}
                rate={rate}
                color={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Detailed table ── */}
      {devStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Tabla de Productividad</h2>
          <div className="rounded-lg border bg-card overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Developer</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Done</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">En&nbsp;Progreso</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Bloqueadas</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Hrs&nbsp;Reales</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">h/Task</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Completado</th>
                </tr>
              </thead>
              <tbody>
                {devStats.map(({ emp, total, done, inProg, blocked, hours, rate, color }) => (
                  <tr key={emp.employeeId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                          style={{ fontSize: '9px', backgroundColor: color }}
                        >
                          {`${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground leading-tight">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground">{emp.position || emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{total}</td>
                    <td className="px-4 py-3 text-center font-medium text-green-600 dark:text-green-400">{done}</td>
                    <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400">{inProg}</td>
                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{blocked}</td>
                    <td className="px-4 py-3 text-center font-medium text-amber-600 dark:text-amber-400">
                      {hours > 0 ? `${hours.toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {done > 0 && hours > 0 ? `${(hours / done).toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${rate}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sprint Velocity ── */}
      {velocityData.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Sprint Velocity (Story Points)</h2>
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-end gap-3" style={{ height: '120px' }}>
              {velocityData.map(({ sprint, completedPts, totalPts }) => {
                const barH  = Math.round((totalPts / maxVelocity) * 96)
                const doneH = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FolderKanban} label="Total Projects"     value={projects.length} />
        <StatCard icon={Zap}          label="Active Projects"    value={totalActive} />
        <StatCard icon={Clock}        label="Active Sprints"     value={activeSprints} />
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
              const sprints      = sprintMap[project.projectId] || []
              const activeSprint = sprints.find((s) => s.status === 'active')
              const statusCfg    = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview',  icon: FolderKanban },
  { key: 'kpis',     label: 'Team KPIs', icon: BarChart3 },
]

export default function DashboardPage() {
  const navigate                    = useNavigate()
  const [tab, setTab]               = useState('overview')
  const [projects, setProjects]     = useState([])
  const [sprintMap, setSprintMap]   = useState({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

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
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview de proyectos, sprints y productividad del equipo
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

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

      {tab === 'overview' && (
        <Overview projects={projects} sprintMap={sprintMap} navigate={navigate} />
      )}
      {tab === 'kpis' && (
        <TeamKPIs projects={projects} sprintMap={sprintMap} />
      )}
    </div>
  )
}
