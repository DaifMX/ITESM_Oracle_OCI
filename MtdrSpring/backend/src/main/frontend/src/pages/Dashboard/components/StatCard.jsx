export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4 flex items-center gap-4">
      <div className="p-2 rounded-md bg-muted">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
