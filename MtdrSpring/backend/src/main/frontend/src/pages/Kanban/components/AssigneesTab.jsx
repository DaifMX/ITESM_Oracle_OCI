import { Plus, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import Spinner from './Spinner'
import SectionLabel from './SectionLabel'
import EmployeeRow from './EmployeeRow'

export default function AssigneesTab({ assignees, employees, loading, onAssign, onUnassign }) {
  // assignees is now List<Employee> with 0 or 1 elements
  const assignee = assignees[0] ?? null

  // Only developers can be assigned to tasks
  const developers = employees.filter((e) => e.role === 'developer')

  if (loading) return <Spinner />

  return (
    <div className="px-5 py-4 space-y-4">
      {assignee ? (
        <div className="space-y-2">
          <SectionLabel>Assigned developer</SectionLabel>
          <EmployeeRow emp={assignee}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:text-destructive"
              onClick={() => onUnassign(assignee.employeeId)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </EmployeeRow>
        </div>
      ) : (
        <div className="space-y-2">
          <SectionLabel>Assign developer</SectionLabel>
          {developers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No developers available.</p>
          ) : (
            developers.map((emp) => (
              <EmployeeRow key={emp.employeeId} emp={emp}>
                <Button variant="secondary" size="sm" onClick={() => onAssign(emp.employeeId)}>
                  <Plus className="w-3 h-3" />Assign
                </Button>
              </EmployeeRow>
            ))
          )}
        </div>
      )}
    </div>
  )
}
