import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export default function Register({ onRegister }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
    modality: '',
    position: '',
    role: '',
    phoneNumber: '',
    telegramChatId: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.password.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setError('First name, last name, email and password are required')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          modality: form.modality || null,
          position: form.position || null,
          role: form.role || null,
          phoneNumber: form.phoneNumber || null,
          telegramChatId: form.telegramChatId || null,
        }),
      })

      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch {}
        setError(errorMsg)
        return
      }

      onRegister()
    } catch {
      setError('Unable to connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-200">
      <div className="h-1 bg-oracle-red flex-shrink-0" />

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center gap-1.5">
          <span className="font-bold text-oracle-red text-2xl tracking-[0.18em] select-none">
            TEAM31
          </span>
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            Agile Project Management
          </span>
        </div>

        <div className="w-full max-w-lg rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="px-8 pt-7 pb-5 border-b">
            <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
            <p className="text-muted-foreground text-sm mt-1">Fill in your details to register</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={form.firstName}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="user@oracle.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            {/* Password row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm password *</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                placeholder="e.g. Software Engineer"
                value={form.position}
                onChange={handleChange}
              />
            </div>

            {/* Modality & Role row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="modality">Work modality</Label>
                <select
                  id="modality"
                  name="modality"
                  value={form.modality}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Select…</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Select…</option>
                  <option value="developer">Developer</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            {/* Phone & Telegram row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phoneNumber">Phone number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={form.phoneNumber}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                <Input
                  id="telegramChatId"
                  name="telegramChatId"
                  placeholder="e.g. 123456789"
                  value={form.telegramChatId}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <span className="text-destructive text-xs">{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="px-8 pb-7 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-oracle-red hover:text-oracle-red-dark font-medium underline-offset-2 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-10 text-muted-foreground text-xs">
          © {new Date().getFullYear()} TEAM31
        </p>
      </div>
    </div>
  )
}
