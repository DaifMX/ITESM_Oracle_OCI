import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { setTokens } from '@/lib/auth'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        let errorMsg = 'Invalid credentials'
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch {}
        setError(errorMsg)
        return
      }

      const data = await res.json()
      setTokens(data.accessToken, data.refreshToken)
      onLogin()
    } catch {
      setError('Unable to connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-200">
      {/* Brand accent stripe */}
      <div className="h-1 bg-oracle-red flex-shrink-0" />

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Wordmark */}
        <div className="mb-8 flex flex-col items-center gap-1.5">
          <span className="font-bold text-oracle-red text-2xl tracking-[0.18em] select-none">
            TEAM31
          </span>
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            Todo List Application
          </span>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="px-8 pt-7 pb-5 border-b">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. user@oracle.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <span className="text-destructive text-xs">{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="px-8 pb-7 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-oracle-red hover:text-oracle-red-dark font-medium underline-offset-2 hover:underline">
                Create one
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
