export default function GroupedBarChart({ sprints, groups, unit = '', chartHeight = 220 }) {
  // groups: [{ label, color, values: [{ sprintId, value }] }]
  // sprints: [{ sprintId, name }]

  const allValues = groups.flatMap((g) => g.values.map((v) => v.value))
  const maxVal = Math.max(...allValues, 1)
  const barAreaH = chartHeight - 56 // leave room for value labels + sprint labels

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="flex items-end justify-around gap-2"
        style={{ height: `${chartHeight}px`, minWidth: `${sprints.length * (groups.length * 28 + 24)}px` }}
      >
        {sprints.map((sprint) => (
          <div key={sprint.sprintId} className="flex flex-col items-center flex-1 min-w-0">
            {/* bars for this sprint */}
            <div className="flex items-end gap-0.5 px-1">
              {groups.map((g) => {
                const val = g.values.find((v) => v.sprintId === sprint.sprintId)?.value ?? 0
                const barH = Math.max(Math.round((val / maxVal) * barAreaH), val > 0 ? 4 : 1)
                return (
                  <div key={g.label} className="flex flex-col items-center gap-0.5">
                    <span
                      className="text-xs font-semibold leading-none"
                      style={{ color: val > 0 ? g.color : '#9ca3af', fontSize: '10px' }}
                    >
                      {val > 0 ? `${val}${unit}` : ''}
                    </span>
                    <div
                      className="w-5 rounded-t transition-all duration-500"
                      style={{
                        height: `${barH}px`,
                        backgroundColor: val > 0 ? g.color : '#e5e7eb',
                      }}
                    />
                  </div>
                )
              })}
            </div>
            {/* sprint label */}
            <span
              className="text-center leading-tight mt-1.5 text-muted-foreground truncate w-full px-1"
              style={{ fontSize: '11px' }}
            >
              {sprint.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
