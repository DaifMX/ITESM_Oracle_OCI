import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useSWR from 'swr'
import { ChevronRight, FolderKanban, Inbox, Plus } from 'lucide-react'
import { fetcher } from '../../lib/fetcher'
import { Button } from '../../components/ui/button'
import BacklogView from '../DeveloperDashboard/components/BacklogView'
import TaskModal from '../Kanban/components/TaskModal'

export default function BacklogPage() {
  const { projectId } = useParams()
  const [modal, setModal]       = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: projects = [] } = useSWR('/projects', fetcher)
  const { data: employees = [] } = useSWR('/employees', fetcher)
  const project = projects.find((p) => String(p.projectId) === projectId)

  function handleSaved() {
    setModal(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-foreground transition-colors flex items-center gap-1">
          <FolderKanban className="w-3.5 h-3.5" /> Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/projects/${projectId}/sprints`} className="hover:text-foreground transition-colors">
          {project?.name ?? '…'}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium flex items-center gap-1">
          <Inbox className="w-3.5 h-3.5" /> Backlog
        </span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Backlog</h1>
        <Button size="sm" onClick={() => setModal(true)}>
          <Plus className="w-3.5 h-3.5" />New task
        </Button>
      </div>

      <BacklogView projectId={Number(projectId)} refreshKey={refreshKey} />

      {modal && (
        <TaskModal
          task={null}
          sprint={null}
          sprintId={null}
          projectId={projectId}
          employees={employees}
          onClose={() => setModal(false)}
          onSave={handleSaved}
        />
      )}
    </div>
  )
}
