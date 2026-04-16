import { useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { cn } from '../../lib/utils'

const INSIGHT_META = {
  gap: { icon: '📊', cls: 'border-amber-400/40 bg-amber-500/5' },
  top: { icon: '🏆', cls: 'border-green-400/40 bg-green-500/5' },
  hours: { icon: '⏱️', cls: 'border-blue-400/40 bg-blue-500/5' },
  blocked: { icon: '🚧', cls: 'border-red-400/40 bg-red-500/5' },
  efficiency: { icon: '⚡', cls: 'border-violet-400/40 bg-violet-500/5' },
}

export default function Insights({ devStats }) {
  const insights = useMemo(() => {
    const active = devStats.filter((d) => d.total > 0)
    if (active.length < 2) return []
    const list = []

    const byRate = [...active].sort((a, b) => b.rate - a.rate)
    const byDone = [...active].sort((a, b) => b.done - a.done)
    const byHours = [...active].sort((a, b) => b.hours - a.hours)

    const top = byRate[0]
    const low = byRate[byRate.length - 1]

    if (top.rate - low.rate > 15) {
      list.push({
        type: 'gap',
        msg: `${top.rate - low.rate}% completion rate gap: ${top.emp.firstName} (${top.rate}%) vs ${low.emp.firstName} (${low.rate}%). Consider rebalancing workload or scheduling a pair programming session.`,
      })
    }

    const mostDone = byDone[0]
    if (mostDone.done > 0) {
      list.push({
        type: 'top',
        msg: `${mostDone.emp.firstName} completed the most tasks (${mostDone.done}). Acknowledge their performance and share best practices with the team.`,
      })
    }

    const mostHours = byHours[0]
    if (mostHours.hours > 0) {
      list.push({
        type: 'hours',
        msg: `${mostHours.emp.firstName} logged the most actual hours (${mostHours.hours.toFixed(1)}h). Verify whether the workload is well balanced across the team.`,
      })
    }

    const blockedDevs = active.filter((d) => d.blocked > 0)
    if (blockedDevs.length > 0) {
      const names = blockedDevs.map((d) => `${d.emp.firstName} (${d.blocked})`).join(', ')
      list.push({
        type: 'blocked',
        msg: `Blocked tasks for: ${names}. Schedule a focused standup to remove impediments and unblock progress.`,
      })
    }

    const withHours = active.filter((d) => d.done > 0 && d.hours > 0)
    if (withHours.length >= 2) {
      const efficient = [...withHours].sort((a, b) => (a.hours / a.done) - (b.hours / b.done))[0]
      list.push({
        type: 'efficiency',
        msg: `${efficient.emp.firstName} has the best efficiency ratio (~${(efficient.hours / efficient.done).toFixed(1)}h/task). Document their workflow as a team reference.`,
      })
    }

    return list.slice(0, 4)
  }, [devStats])

  if (insights.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">Insights & Improvement Actions</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((ins, i) => {
          const m = INSIGHT_META[ins.type] ?? { icon: '💡', cls: 'border-border bg-card' }
          return (
            <div key={i} className={cn('rounded-lg border p-3.5 text-sm leading-snug', m.cls)}>
              <span className="mr-2">{m.icon}</span>
              {ins.msg}
            </div>
          )
        })}
      </div>
    </div>
  )
}
