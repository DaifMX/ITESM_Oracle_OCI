import { useState, useEffect, useMemo } from 'react'
import { Loader2, AlertCircle, BarChart3, CheckCircle2, Timer, TrendingUp, Clock } from 'lucide-react'
import { getEmployees, getTasksByEmployee, getTasksByProject } from '../../lib/api'
import { DEV_COLORS } from './constants'
import StatCard from './components/StatCard'
import BarChart from './components/BarChart'
import Insights from './components/Insights'
import DevLegend from './components/DevLegend'
import SprintVelocityChart from './components/SprintVelocityChart'
import ProductivityTable from './components/ProductivityTable'

export default function TeamKPIs({ projects, sprintMap }) {
  const [employees, setEmployees] = useState([])
  const [empTasksMap, setEmpTasksMap] = useState({})
  const [projTasksMap, setProjTasksMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  const allSprints = useMemo(() => {
    const map = new Map()
    Object.values(empTasksMap).flat().forEach((t) => {
      if (t.sprint?.sprintId) map.set(t.sprint.sprintId, t.sprint)
    })
    return Array.from(map.values()).sort((a, b) => a.sprintId - b.sprintId)
  }, [empTasksMap])

  const uniqueTasks = useMemo(() => {
    const seen = new Set()
    return Object.values(empTasksMap).flat().filter((t) => {
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

  const developers = useMemo(() => employees.filter((e) => e.role === 'developer'), [employees])
  const numDevs = developers.length || 1

  const totalTasks = filteredTasks.length
  const doneTasks = filteredTasks.filter((t) => t.status === 'done').length
  const totalHours = filteredTasks
    .filter((t) => t.status === 'done' && t.actualHours)
    .reduce((s, t) => s + Number(t.actualHours), 0)
  const avgTasksPerDev = (doneTasks / numDevs).toFixed(1)
  const avgHoursPerDev = (totalHours / numDevs).toFixed(1)

  const devStats = useMemo(() =>
    developers.map((emp, i) => {
      const tasks = (empTasksMap[emp.employeeId] ?? []).filter((t) =>
        selectedSprintId === 'all' || t.sprint?.sprintId === selectedSprintId
      )
      const done = tasks.filter((t) => t.status === 'done').length
      const inProg = tasks.filter((t) => t.status === 'in_progress').length
      const blocked = tasks.filter((t) => t.status === 'blocked').length
      const hours = tasks
        .filter((t) => t.status === 'done' && t.actualHours)
        .reduce((s, t) => s + Number(t.actualHours), 0)
      const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
      const color = DEV_COLORS[i % DEV_COLORS.length]
      return { emp, total: tasks.length, done, inProg, blocked, hours, rate, color }
    }),
    [developers, empTasksMap, selectedSprintId])

  const allProjTasks = useMemo(() => Object.values(projTasksMap).flat(), [projTasksMap])
  const allSprintsVel = useMemo(() => Object.values(sprintMap).flat(), [sprintMap])
  const velocityData = useMemo(() => {
    const relevant = allSprintsVel.filter((s) => s.status === 'completed' || s.status === 'active')
    return relevant.map((sprint) => {
      const sprintTasks = allProjTasks.filter((t) => t.sprint?.sprintId === sprint.sprintId)
      const completedPts = sprintTasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      const totalPts = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)
      return { sprint, completedPts, totalPts }
    }).slice(-8)
  }, [allSprintsVel, allProjTasks])

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

  return (
    <div className="space-y-6">
      {/* Sprint filter + title */}
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="# Tasks" value={totalTasks} sub={`${doneTasks} completadas`} />
        <StatCard icon={Timer} label="# Horas Reales" value={`${totalHours.toFixed(1)}h`} sub="horas registradas" />
        <StatCard icon={TrendingUp} label="Promedio Tasks/Dev" value={avgTasksPerDev} sub="tasks completadas" />
        <StatCard icon={Clock} label="Promedio Horas/Dev" value={`${avgHoursPerDev}h`} sub="horas reales" />
      </div>

      {/* Bar Charts */}
      {devStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Tasks Completadas por Developer</h2>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">{sprintLabel}</p>
            <BarChart
              bars={devStats.map((d) => ({ label: d.emp.firstName, value: d.done, color: d.color }))}
              unit=""
              chartHeight={180}
            />
            <DevLegend devStats={devStats} />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Horas Reales por Developer</h2>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">{sprintLabel}</p>
            <BarChart
              bars={devStats.map((d) => ({ label: d.emp.firstName, value: parseFloat(d.hours.toFixed(1)), color: d.color }))}
              unit="h"
              chartHeight={180}
            />
            <DevLegend devStats={devStats} />
          </div>
        </div>
      )}

      {velocityData.length > 0 && <SprintVelocityChart velocityData={velocityData} />}

      {devStats.length >= 2 && <Insights devStats={devStats} />}

      {devStats.length > 0 && <ProductivityTable devStats={devStats} />}
    </div>
  )
}
