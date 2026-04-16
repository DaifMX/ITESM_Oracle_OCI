import { COLUMNS, PRIORITIES, PRIORITY_CONFIG } from '../constants'
import Field from './Field'
import ErrorMsg from './ErrorMsg'

export default function TaskForm({ form, setForm, onSubmit, error }) {
  return (
    <form id="task-form" onSubmit={onSubmit} className="px-5 py-4 space-y-4">
      <Field label="Title *">
        <input
          className="field"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Task title"
        />
      </Field>

      <Field label="Description">
        <textarea
          className="field resize-none"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional description"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select className="field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="field" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Story Points">
          <input type="number" min="0" className="field" value={form.storyPoints}
            onChange={(e) => setForm((f) => ({ ...f, storyPoints: e.target.value }))} placeholder="—" />
        </Field>
        <Field label="Est. Hours">
          <input type="number" min="0" step="0.5" className="field" value={form.estimatedHours}
            onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} placeholder="—" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <input type="date" className="field" value={form.startDate}
            max={form.expectedEndDate || undefined}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
        </Field>
        <Field label="Due Date">
          <input type="date" className="field" value={form.expectedEndDate}
            min={form.startDate || undefined}
            onChange={(e) => setForm((f) => ({ ...f, expectedEndDate: e.target.value }))} />
        </Field>
      </div>

      {error && <ErrorMsg>{error}</ErrorMsg>}
    </form>
  )
}
