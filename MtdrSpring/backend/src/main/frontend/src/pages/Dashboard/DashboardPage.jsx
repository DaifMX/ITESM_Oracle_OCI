import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, FolderKanban, BarChart3 } from 'lucide-react'
import { getProjects, getSprintsByProject } from '../../lib/api'
import { cn } from '../../lib/utils'
import Overview from './Overview'
import TeamKPIs from './TeamKPIs'

const TABS = [
  { key: 'overview', label: 'Overview', icon: FolderKanban },
  { key: 'kpis', label: 'Team KPIs', icon: BarChart3 },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [projects, setProjects] = useState([])
  const [sprintMap, setSprintMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
          Overview of projects, sprints and team productivity
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
