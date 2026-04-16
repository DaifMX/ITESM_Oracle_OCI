import { Plus, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import Spinner from './Spinner'
import SectionLabel from './SectionLabel'
import EmployeeRow from './EmployeeRow'

export default function AssigneesTab({ assignees, employees, loading, onAssign, onUnassign }) {
  const assignedIds = new Set(assignees.map((a) => a.employee?.employeeId))
  const unassigned  = employees.filter((e) => !assignedIds.has(e.employeeId))

  if (loading) return <Spinner />

  return (
    <div className="px-5 py-4 space-y-4">
      {assignees.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Assigned</SectionLabel>
          {assignees.map((a) => {
            const emp = a.employee
            return (
              <EmployeeRow key={emp?.employeeId} emp={emp}>
                <Button variant="ghost" size="icon-sm" className="hover:text-destructive"
                  onClick={() => onUnassign(emp?.employeeId)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </EmployeeRow>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        <SectionLabel>Add assignee</SectionLabel>
        {unassigned.length === 0
          ? <p className="text-xs text-muted-foreground">All employees assigned.</p>
          : unassigned.map((emp) => (
              <EmployeeRow key={emp.employeeId} emp={emp}>
                <Button variant="secondary" size="sm" onClick={() => onAssign(emp.employeeId)}>
                  <Plus className="w-3 h-3" />Assign
                </Button>
              </EmployeeRow>
            ))
        }
      </div>
    </div>
  )
}
