import { User } from 'lucide-react'

export default function EmployeeRow({ emp, children }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2.5 bg-background">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm">{emp?.firstName} {emp?.lastName}</span>
        {emp?.role && <span className="text-xs text-muted-foreground capitalize">{emp.role}</span>}
      </div>
      {children}
    </div>
  )
}
