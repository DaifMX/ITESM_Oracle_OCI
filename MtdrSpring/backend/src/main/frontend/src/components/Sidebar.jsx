import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, LogOut, Sun, Moon, Users, Shield } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { clearTokens, clearUser, getUser } from '../lib/auth'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

const MANAGER_NAV = [
  { to: '/dashboard',         label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/projects',          label: 'Projects',        icon: FolderKanban },
  { to: '/user-management',   label: 'Users',           icon: Users },
]

const DEVELOPER_NAV = [
  { to: '/developer-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
]

const ROLE_META = {
  admin:     { label: 'Admin',     className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  manager:   { label: 'Manager',   className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  developer: { label: 'Developer', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
}

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const user = getUser()
  const navItems = user?.role === 'developer' ? DEVELOPER_NAV : MANAGER_NAV
  const roleMeta = ROLE_META[user?.role] ?? ROLE_META.developer

  function handleLogout() {
    clearTokens()
    clearUser()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r bg-card h-full">
      {/* Brand accent */}
      <div className="h-1 bg-oracle-red" />
      <div className="px-4 py-4 border-b">
        <div className="flex items-center justify-between">
          <span className="font-bold text-oracle-red text-sm tracking-[0.15em] select-none">TEAM31</span>
          {user?.role === 'admin' && (
            <Shield className="w-3.5 h-3.5 text-red-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Project Manager</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-100',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + Footer */}
      <div className="border-t px-3 py-3 space-y-2">
        {/* Current user badge */}
        {user && (
          <div className="px-1 py-1.5">
            <p className="text-xs font-medium text-foreground truncate">
              {user.firstName} {user.lastName}
            </p>
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block', roleMeta.className)}>
              {roleMeta.label}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-muted-foreground"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
