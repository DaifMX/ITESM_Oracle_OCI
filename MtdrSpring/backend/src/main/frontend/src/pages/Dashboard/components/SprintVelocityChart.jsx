export default function SprintVelocityChart({ velocityData }) {
  const maxVelocity = Math.max(...velocityData.map((d) => d.totalPts), 1)

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Sprint Velocity</h2>
      <div className="rounded-lg border bg-card p-5">
        <div className="flex gap-3">
          {velocityData.map(({ sprint, completedPts, totalPts }) => {
            const barH = Math.round((totalPts / maxVelocity) * 88)
            const doneH = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0
            return (
              <div key={sprint.sprintId} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-xs font-semibold text-foreground whitespace-nowrap h-4 leading-4">
                  {completedPts}pts
                </span>
                <div className="w-full flex items-end" style={{ height: '88px' }}>
                  <div
                    className="w-full rounded-t-sm overflow-hidden relative bg-muted"
                    style={{ height: `${Math.max(barH, 4)}px` }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-sm transition-all duration-500"
                      style={{ height: `${doneH}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground truncate w-full text-center leading-tight">
                  {sprint.name}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-xs text-muted-foreground">Completed pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
            <span className="text-xs text-muted-foreground">Total pts</span>
          </div>
        </div>
      </div>
    </div>
  )
}
