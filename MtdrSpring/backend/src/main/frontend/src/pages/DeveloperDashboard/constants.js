import { ListTodo, CheckCircle2, AlertCircle, CircleDot } from 'lucide-react'

export const STATUS_OPTIONS = ['todo', 'in_progress', 'done', 'blocked']

export const STATUS_CONFIG = {
  todo:        { label: 'To Do',       className: 'bg-muted text-muted-foreground',                    icon: ListTodo },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',   icon: CircleDot },
  done:        { label: 'Done',        className: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
  blocked:     { label: 'Blocked',     className: 'bg-red-500/10 text-red-600 dark:text-red-400',       icon: AlertCircle },
}

export const PRIORITY_CONFIG = {
  low:      { label: 'Low',      className: 'bg-muted text-muted-foreground' },
  medium:   { label: 'Medium',   className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  high:     { label: 'High',     className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
}

export const KANBAN_COLUMNS = [
  { key: 'todo',        label: 'To Do',       headerClass: 'bg-muted/60',       dotClass: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', headerClass: 'bg-yellow-500/10',  dotClass: 'bg-yellow-500' },
  { key: 'done',        label: 'Done',        headerClass: 'bg-green-500/10',   dotClass: 'bg-green-500' },
  { key: 'blocked',     label: 'Blocked',     headerClass: 'bg-destructive/10', dotClass: 'bg-destructive' },
]

export const MAIN_TABS = [
  { key: 'tasks',   label: 'My Tasks', },
  { key: 'backlog', label: 'Backlog',  },
]
