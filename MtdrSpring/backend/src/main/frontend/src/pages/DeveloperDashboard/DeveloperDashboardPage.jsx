import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { AlertCircle, ListTodo, Package, TrendingUp } from 'lucide-react'
import { getUser } from '../../lib/auth'
import { updateTask } from '../../lib/api'
import { fetcher } from '../../lib/fetcher'
import { parseLocalDate, cn } from '../../lib/utils'
import { Skeleton } from '../../components/ui/Skeleton'
import { MAIN_TABS } from './constants'
import KpiCards from './components/KpiCards'
import ProgressBar from './components/ProgressBar'
import TaskControls from './components/TaskControls'
import TaskRow from './components/TaskRow'
import KanbanBoard from './components/KanbanBoard'
import BacklogView from './components/BacklogView'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-2 rounded-full" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    </div>
  )
}

export default function DeveloperDashboardPage() {
  const user = getUser()
  const swrKey = user?.employeeId ? `/tasks/employee/${user.employeeId}` : null

  const { data: tasks = [], error, isLoading, mutate } = useSWR(swrKey, fetcher)

  const [filterStatus, setFilterStatus] = useState('all')
  const [mainTab, setMainTab]           = useState('tasks')
  const [view, setView]                 = useState('list')

  const handleUpdate = useCallback(async (task, newStatus) => {
    const updated = await updateTask(task.taskId, { ...task, status: newStatus })
    mutate(tasks.map((t) => (t.taskId === updated.taskId ? updated : t)), { revalidate: false })
  }, [tasks, mutate])

  const total       = tasks.length
  const done        = tasks.filter((t) => t.status === 'done').length
  const inProgress  = tasks.filter((t) => t.status === 'in_progress').length
  const blocked     = tasks.filter((t) => t.status === 'blocked').length
  const overdue     = tasks.filter(
    (t) => t.expectedEndDate && t.status !== 'done' && parseLocalDate(t.expectedEndDate) < new Date()
  ).length
  const totalPoints = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0)

  const filtered = filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus)

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, {user?.firstName ?? 'Developer'} — here are your assigned tasks
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error.message}
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <KpiCards total={total} done={done} inProgress={inProgress} blocked={blocked} overdue={overdue} totalPoints={totalPoints} />
          <ProgressBar done={done} total={total} />

          {/* Main Tabs */}
          <div className="flex items-center border-b">
            {MAIN_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMainTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  mainTab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {key === 'tasks' ? <ListTodo className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>

          {mainTab === 'tasks' && (
            <div className="space-y-4">
              <TaskControls
                tasks={tasks}
                total={total}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                view={view}
                setView={setView}
              />
              {filtered.length === 0 ? (
                <div className="text-center py-14 rounded-lg border bg-card">
                  <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {total === 0 ? 'No tasks have been assigned to you yet.' : 'No tasks match this filter.'}
                  </p>
                </div>
              ) : view === 'list' ? (
                <div className="space-y-3">
                  {filtered.map((task) => <TaskRow key={task.taskId} task={task} onUpdate={handleUpdate} />)}
                </div>
              ) : (
                <KanbanBoard tasks={filtered} onUpdate={handleUpdate} />
              )}
            </div>
          )}

          {mainTab === 'backlog' && <BacklogView />}
        </>
      )}
    </div>
  )
}
