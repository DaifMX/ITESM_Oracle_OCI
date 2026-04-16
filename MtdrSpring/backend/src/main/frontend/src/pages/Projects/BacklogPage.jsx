import { useParams, Link } from 'react-router-dom'
import useSWR from 'swr'
import { ChevronRight, FolderKanban, Inbox } from 'lucide-react'
import { fetcher } from '../../lib/fetcher'
import BacklogView from '../DeveloperDashboard/components/BacklogView'

export default function BacklogPage() {
  const { projectId } = useParams()
  const { data: projects = [] } = useSWR('/projects', fetcher)
  const project = projects.find((p) => String(p.projectId) === projectId)

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

      <BacklogView projectId={Number(projectId)} />
    </div>
  )
}
