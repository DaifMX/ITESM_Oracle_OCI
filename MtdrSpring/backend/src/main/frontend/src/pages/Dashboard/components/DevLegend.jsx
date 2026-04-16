export default function DevLegend({ devStats }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
      {devStats.map((d) => (
        <div key={d.emp.employeeId} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
          <span className="text-xs text-muted-foreground">{d.emp.firstName}</span>
        </div>
      ))}
    </div>
  )
}
