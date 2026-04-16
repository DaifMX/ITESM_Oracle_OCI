export default function BarChart({ bars, unit = '', chartHeight = 160 }) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1)
  const innerH = chartHeight - 48

  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height: `${chartHeight}px` }}>
      {bars.map((bar, i) => {
        const barH = Math.round((bar.value / maxVal) * innerH)
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0">
            <span
              className="text-xs font-bold whitespace-nowrap"
              style={{ color: bar.value > 0 ? bar.color : '#9ca3af' }}
            >
              {bar.value > 0 ? `${bar.value}${unit}` : '0'}
            </span>
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{
                height: `${Math.max(barH, bar.value > 0 ? 6 : 2)}px`,
                backgroundColor: bar.value > 0 ? bar.color : '#e5e7eb',
              }}
            />
            <span
              className="truncate w-full text-center leading-tight mt-0.5"
              style={{ fontSize: '10px', color: '#6b7280' }}
            >
              {bar.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
