import { useState } from 'react'
import { FolderKanban, BarChart3, Inbox } from 'lucide-react'
import { cn } from '../../lib/utils'
import Overview from './Overview'
import TeamKPIs from './TeamKPIs'
import BacklogView from '../DeveloperDashboard/components/BacklogView'

const TABS = [
  { key: 'overview', label: 'Overview',  icon: FolderKanban },
  { key: 'kpis',     label: 'Team KPIs', icon: BarChart3 },
  { key: 'backlog',  label: 'Backlog',   icon: Inbox },
]

export default function DashboardPage() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of projects, sprints and team productivity
        </p>
      </div>

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

      {tab === 'overview' && <Overview />}
      {tab === 'kpis'     && <TeamKPIs />}
      {tab === 'backlog'  && <BacklogView />}
    </div>
  )
}
