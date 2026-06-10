import { useState } from 'react'
import useSWR from 'swr'
import { Plus } from 'lucide-react'
import { Button } from './ui/button'
import { fetcher } from '../lib/fetcher'
import TaskModal from '../pages/Kanban/components/TaskModal'

/**
 * Always-available "New task" button for any user. Opens the shared task form
 * in standalone mode, where the project and (optional) sprint are chosen in the
 * form rather than derived from a board context.
 *
 * @param {() => void} [props.onSaved] called after a task is created so the
 *   caller can refresh its own data.
 */
export default function CreateTaskButton({ onSaved, label = 'New task', size = 'sm', variant, className }) {
  const [open, setOpen] = useState(false)
  const { data: projects = [] }  = useSWR('/projects', fetcher)
  const { data: employees = [] } = useSWR('/employees', fetcher)

  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" />{label}
      </Button>
      {open && (
        <TaskModal
          task={null}
          projects={projects}
          employees={employees}
          onClose={() => setOpen(false)}
          onSave={() => { setOpen(false); onSaved?.() }}
        />
      )}
    </>
  )
}
