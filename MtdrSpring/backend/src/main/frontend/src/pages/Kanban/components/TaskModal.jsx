import { useState, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'
import { createTask, updateTask, getTaskAssignees, assignEmployee, unassignEmployee, getComments } from '../../../lib/api'
import { EMPTY_TASK_FORM } from '../constants'
import TaskForm from './TaskForm'
import AssigneesTab from './AssigneesTab'
import CommentsTab from './CommentsTab'

export default function TaskModal({ task, sprint, sprintId, projectId, employees, onClose, onSave }) {
  const isEdit = !!task
  const [form, setForm] = useState(task ? {
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    storyPoints: task.storyPoints ?? '',
    estimatedHours: task.estimatedHours ?? '',
    totalHours: task.totalHours ?? '',
    startDate: task.startDate || '',
    expectedEndDate: task.expectedEndDate || '',
  } : EMPTY_TASK_FORM)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [tab, setTab]                 = useState('details')
  const [assignees, setAssignees]     = useState([])
  const [comments, setComments]       = useState([])
  const [loadingMeta, setLoadingMeta] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    setLoadingMeta(true)
    Promise.all([getTaskAssignees(task.taskId), getComments(task.taskId)])
      .then(([a, c]) => { setAssignees(a); setComments(c) })
      .catch(() => {})
      .finally(() => setLoadingMeta(false))
  }, [isEdit])

  async function handleSubmit(e) {
    e.preventDefault()
    if (sprint) {
      const sd = sprint.startDate
      const ed = sprint.endDate
      if (
        (form.startDate && sd && form.startDate < sd) ||
        (form.startDate && ed && form.startDate > ed) ||
        (form.expectedEndDate && ed && form.expectedEndDate > ed) ||
        (form.expectedEndDate && sd && form.expectedEndDate < sd)
      ) {
        setError("You can't set a date outside the scope of this sprint")
        return
      }
    }
    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        sprint: { sprintId: Number(sprintId) },
        project: { projectId: Number(projectId) },
        storyPoints: form.storyPoints !== '' ? Number(form.storyPoints) : null,
        estimatedHours: form.estimatedHours !== '' ? Number(form.estimatedHours) : null,
        totalHours: form.totalHours !== '' ? Number(form.totalHours) : null,
        startDate: form.startDate || null,
        expectedEndDate: form.expectedEndDate || null,
      }
      const saved = isEdit ? await updateTask(task.taskId, payload) : await createTask(payload)
      onSave(saved, isEdit)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleAssign(employeeId) {
    await assignEmployee(task.taskId, employeeId)
    setAssignees(await getTaskAssignees(task.taskId))
  }

  async function handleUnassign(employeeId) {
    await unassignEmployee(task.taskId, employeeId)
    setAssignees((prev) => prev.filter((a) => a.employee?.employeeId !== employeeId))
  }

  const tabs = [
    { id: 'details',   label: 'Details' },
    { id: 'assignees', label: `Assignees${assignees.length ? ` (${assignees.length})` : ''}` },
    { id: 'comments',  label: `Comments${comments.length ? ` (${comments.length})` : ''}` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-foreground">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Tabs (edit only) */}
        {isEdit && (
          <div className="flex border-b shrink-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-2.5 text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {(tab === 'details' || !isEdit) && (
            <TaskForm form={form} setForm={setForm} onSubmit={handleSubmit} error={error} />
          )}
          {tab === 'assignees' && isEdit && (
            <AssigneesTab
              assignees={assignees}
              employees={employees}
              loading={loadingMeta}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
            />
          )}
          {tab === 'comments' && isEdit && (
            <CommentsTab taskId={task.taskId} initialComments={comments} />
          )}
        </div>

        {/* Footer */}
        {(tab === 'details' || !isEdit) && (
          <div className="border-t px-5 py-3 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="task-form" size="sm" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
