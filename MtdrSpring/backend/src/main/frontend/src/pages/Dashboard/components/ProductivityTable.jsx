export default function ProductivityTable({ devStats }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Resumen de Productividad</h2>
      <div className="rounded-lg border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Developer</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Total</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Done</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">En&nbsp;Progreso</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Bloqueadas</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Hrs&nbsp;Reales</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">h/Task</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Completado</th>
            </tr>
          </thead>
          <tbody>
            {devStats.map(({ emp, total, done, inProg, blocked, hours, rate, color }) => (
              <tr key={emp.employeeId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ fontSize: '9px', backgroundColor: color }}
                    >
                      {`${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground leading-tight">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.position || emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">{total}</td>
                <td className="px-4 py-3 text-center font-medium text-green-600 dark:text-green-400">{done}</td>
                <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400">{inProg}</td>
                <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{blocked}</td>
                <td className="px-4 py-3 text-center font-medium text-amber-600 dark:text-amber-400">
                  {hours > 0 ? `${hours.toFixed(1)}h` : '—'}
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {done > 0 && hours > 0 ? `${(hours / done).toFixed(1)}h` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${rate}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{rate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
