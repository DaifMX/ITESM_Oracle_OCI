export default function ProgressBar({ done, total }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground font-medium">Overall progress</span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
