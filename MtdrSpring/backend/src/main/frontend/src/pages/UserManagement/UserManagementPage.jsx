import { useState } from 'react'
import useSWR from 'swr'
import { createUser, updateEmployee, deleteEmployee } from '../../lib/api'
import { fetcher } from '../../lib/fetcher'
import { getUser } from '../../lib/auth'
import { Loader2, UserPlus, Trash2, AlertCircle, X, Shield, Users, Pencil } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../lib/utils'

const ROLE_META = {
  admin:     { label: 'Admin',     className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  manager:   { label: 'Manager',   className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  developer: { label: 'Developer', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
}

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', password: '',
  role: 'developer', position: '', modality: '', phoneNumber: '', telegramChatId: '',
}

function UsersSkeleton() {
  return (
    <div className="space-y-5">
      {[...Array(2)].map((_, g) => (
        <div key={g}>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="rounded-lg border bg-card overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={cn('flex items-center gap-4 px-4 py-3', i < 2 && 'border-b')}>
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, type = 'text', placeholder, autoComplete }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
  )
}

function SelectInput({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
      {children}
    </select>
  )
}

function CreateUserModal({ creatableRoles, onClose, onCreated }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, role: creatableRoles[0] })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function set(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim()) {
      setError('First name, last name, email and password are required.'); return
    }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSubmitting(true); setError('')
    try {
      await createUser({
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim(), password: form.password, role: form.role,
        position: form.position.trim() || null, modality: form.modality || null,
        phoneNumber: form.phoneNumber.trim() || null, telegramChatId: form.telegramChatId.trim() || null,
      })
      onCreated()
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-card rounded-xl border shadow-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">New User</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required><TextInput value={form.firstName} onChange={set('firstName')} placeholder="John" /></Field>
            <Field label="Last name" required><TextInput value={form.lastName} onChange={set('lastName')} placeholder="Doe" /></Field>
          </div>
          <Field label="Email" required>
            <TextInput type="email" value={form.email} onChange={set('email')} placeholder="user@oracle.com" autoComplete="off" />
          </Field>
          <Field label="Password" required>
            <TextInput type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" autoComplete="new-password" />
          </Field>
          <Field label="Role" required>
            <SelectInput value={form.role} onChange={set('role')}>
              {creatableRoles.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </SelectInput>
          </Field>
          <Field label="Position"><TextInput value={form.position} onChange={set('position')} placeholder="e.g. Backend Developer" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modality">
              <SelectInput value={form.modality} onChange={set('modality')}>
                <option value="">— Select —</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </SelectInput>
            </Field>
            <Field label="Phone"><TextInput value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+52 55 0000 0000" /></Field>
          </div>
          <Field label="Telegram Chat ID"><TextInput value={form.telegramChatId} onChange={set('telegramChatId')} placeholder="Optional" /></Field>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </form>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" disabled={submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {submitting ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditUserModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName:      employee.firstName      ?? '',
    lastName:       employee.lastName       ?? '',
    email:          employee.email          ?? '',
    role:           employee.role           ?? 'developer',
    position:       employee.position       ?? '',
    modality:       employee.modality       ?? '',
    phoneNumber:    employee.phoneNumber    ?? '',
    telegramChatId: employee.telegramChatId ?? '',
  })
  const [error, setError]           = useState('')
  const [submitting, setSubmitting] = useState(false)

  function set(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('First name, last name and email are required.'); return
    }
    setSubmitting(true); setError('')
    try {
      const saved = await updateEmployee(employee.employeeId, {
        firstName:      form.firstName.trim(),
        lastName:       form.lastName.trim(),
        email:          form.email.trim(),
        role:           form.role,
        position:       form.position.trim()  || null,
        modality:       form.modality         || null,
        phoneNumber:    form.phoneNumber.trim()    || null,
        telegramChatId: form.telegramChatId.trim() || null,
      })
      onSaved(saved)
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-card rounded-xl border shadow-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Edit User</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required><TextInput value={form.firstName} onChange={set('firstName')} placeholder="John" /></Field>
            <Field label="Last name" required><TextInput value={form.lastName} onChange={set('lastName')} placeholder="Doe" /></Field>
          </div>
          <Field label="Email" required>
            <TextInput type="email" value={form.email} onChange={set('email')} placeholder="user@oracle.com" autoComplete="off" />
          </Field>
          <Field label="Role" required>
            <SelectInput value={form.role} onChange={set('role')}>
              {['developer', 'manager', 'admin'].map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Position"><TextInput value={form.position} onChange={set('position')} placeholder="e.g. Backend Developer" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modality">
              <SelectInput value={form.modality} onChange={set('modality')}>
                <option value="">— Select —</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </SelectInput>
            </Field>
            <Field label="Phone"><TextInput value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+52 55 0000 0000" /></Field>
          </div>
          <Field label="Telegram Chat ID"><TextInput value={form.telegramChatId} onChange={set('telegramChatId')} placeholder="Optional" /></Field>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </form>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" disabled={submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ employee, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await deleteEmployee(employee.employeeId)
      onDeleted(employee.employeeId)
    } catch (err) { setError(err.message); setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-card rounded-xl border shadow-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-destructive/10 shrink-0">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Delete user</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{employee.firstName} {employee.lastName}</span>?
              This action cannot be undone.
            </p>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  const currentUser = getUser()
  const isAdmin     = currentUser?.role === 'admin'
  const isManager   = currentUser?.role === 'manager'
  const creatableRoles = isAdmin ? ['developer', 'manager', 'admin'] : ['developer']

  const { data: employees = [], error, isLoading, mutate } = useSWR('/employees', fetcher)
  const [showCreate, setShowCreate]     = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function canDelete(emp) {
    if (emp.employeeId === currentUser?.employeeId) return false
    if (isAdmin) return true
    if (isManager) return emp.role === 'developer' || emp.role == null
    return false
  }

  function handleCreated() { setShowCreate(false); mutate() }
  function handleSaved(saved) {
    setEditTarget(null)
    mutate(employees.map((e) => e.employeeId === saved.employeeId ? saved : e), { revalidate: false })
  }
  function handleDeleted(id) {
    setDeleteTarget(null)
    mutate(employees.filter((e) => e.employeeId !== id), { revalidate: false })
  }

  const admins   = employees.filter((e) => e.role === 'admin')
  const managers = employees.filter((e) => e.role === 'manager')
  const devs     = employees.filter((e) => e.role === 'developer' || e.role == null)
  const groups   = [
    ...(isAdmin ? [{ label: 'Admins',    list: admins }]   : []),
    ...(isAdmin ? [{ label: 'Managers',  list: managers }] : []),
    { label: 'Developers', list: devs },
  ]

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin ? 'Create and manage admin, manager, and developer accounts' : 'Create and manage developer accounts'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <UserPlus className="w-4 h-4 mr-2" />New user
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error.message}
        </div>
      )}

      {isLoading ? (
        <UsersSkeleton />
      ) : employees.length === 0 ? (
        <div className="text-center py-14 rounded-lg border bg-card">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ label, list }) => list.length === 0 ? null : (
            <div key={label}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {label} ({list.length})
              </h2>
              <div className="rounded-lg border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Email</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Role</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Position</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Modality</th>
                      <th className="px-4 py-2.5 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((emp) => {
                      const role = emp.role ?? 'developer'
                      const roleMeta = ROLE_META[role] ?? ROLE_META.developer
                      const isSelf = emp.employeeId === currentUser?.employeeId
                      return (
                        <tr key={emp.employeeId} className={cn('border-b last:border-0 transition-colors', isSelf ? 'bg-primary/5' : 'hover:bg-muted/20')}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                                style={{ fontSize: '10px', backgroundColor: role === 'admin' ? '#ef4444' : role === 'manager' ? '#3b82f6' : '#10b981' }}>
                                {`${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()}
                              </div>
                              <p className="font-medium text-foreground leading-tight">
                                {emp.firstName} {emp.lastName}
                                {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {role === 'admin' && <Shield className="w-3 h-3 text-red-500" />}
                              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleMeta.className)}>{roleMeta.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{emp.position || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{emp.modality || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {isAdmin && (
                                <button onClick={() => setEditTarget(emp)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit user">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete(emp) && (
                                <button onClick={() => setDeleteTarget(emp)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete user">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateUserModal creatableRoles={creatableRoles} onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editTarget && <EditUserModal employee={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />}
      {deleteTarget && <DeleteConfirmModal employee={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
    </div>
  )
}
