export const COLUMNS = [
  { key: 'todo',        label: 'To Do',      headerClass: 'bg-muted/60',        dotClass: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', headerClass: 'bg-yellow-500/10',   dotClass: 'bg-yellow-500' },
  { key: 'done',        label: 'Done',        headerClass: 'bg-green-500/10',    dotClass: 'bg-green-500' },
  { key: 'blocked',     label: 'Blocked',     headerClass: 'bg-destructive/10',  dotClass: 'bg-destructive' },
]

export const PRIORITIES = ['low', 'medium', 'high', 'critical']

export const PRIORITY_CONFIG = {
  low:      { label: 'Low',      className: 'text-muted-foreground' },
  medium:   { label: 'Medium',   className: 'text-yellow-600 dark:text-yellow-400' },
  high:     { label: 'High',     className: 'text-orange-500 dark:text-orange-400' },
  critical: { label: 'Critical', className: 'text-destructive font-semibold' },
}

export const EMPTY_TASK_FORM = {
  title: '', description: '', status: 'todo', priority: 'medium',
  storyPoints: '', estimatedHours: '', startDate: '', expectedEndDate: '',
}
