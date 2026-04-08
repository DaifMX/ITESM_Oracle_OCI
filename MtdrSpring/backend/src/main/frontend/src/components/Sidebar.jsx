import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, LogOut, Sun, Moon, ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { clearTokens, clearUser, getUser } from '../lib/auth'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

const MANAGER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
]

const DEVELOPER_NAV = [
  { to: '/developer-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
]

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const user = getUser()
  const navItems = user?.role === 'developer' ? DEVELOPER_NAV : MANAGER_NAV

  function handleLogout() {
    clearTokens()
    clearUser()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r bg-card h-full">
      {/* Brand */}
      <div className="h-1 bg-oracle-red" />
      <div className="px-4 py-4 border-b">
        <span className="font-bold text-oracle-red text-sm tracking-[0.15em] select-none">TEAM31</span>
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
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-2 py-3 space-y-1">
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
