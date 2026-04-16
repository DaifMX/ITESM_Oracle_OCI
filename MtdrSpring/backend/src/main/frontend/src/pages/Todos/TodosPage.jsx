import { useState, useEffect } from 'react'
import NewItem from '../../NewItem'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Trash2, CheckCircle, RotateCcw, Loader2 } from 'lucide-react'
import { authFetch } from '../../lib/auth'
import { cn } from '../../lib/utils'

const API_LIST = '/todolist'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SectionHeader({ label, count }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b bg-muted/40">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <Badge variant="secondary">{count}</Badge>
    </div>
  )
}

export default function TodosPage() {
  const [isLoading, setLoading] = useState(false)
  const [isInserting, setInserting] = useState(false)
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    authFetch(API_LIST)
      .then((res) => { if (!res.ok) throw new Error('Failed to load items'); return res.json() })
      .then((result) => { setLoading(false); setItems(result) })
      .catch((err) => { setLoading(false); setError(err) })
  }, [])

  async function deleteItem(id) {
    try {
      const res = await authFetch(`${API_LIST}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err)
    }
  }

  async function toggleDone(id, description, done) {
    try {
      const res = await authFetch(`${API_LIST}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ description, done }),
      })
      if (!res.ok) throw new Error('Update failed')
      const updated = await authFetch(`${API_LIST}/${id}`)
      const data = await updated.json()
      setItems((prev) => prev.map((item) => (item.id === id ? data : item)))
    } catch (err) {
      setError(err)
    }
  }

  async function addItem(text) {
    setInserting(true)
    try {
      const res = await authFetch(API_LIST, {
        method: 'POST',
        body: JSON.stringify({ description: text }),
      })
      if (!res.ok) throw new Error('Insert failed')
      const id = res.headers.get('location')
      setItems((prev) => [{ id, description: text, done: false }, ...prev])
    } catch (err) {
      setError(err)
    } finally {
      setInserting(false)
    }
  }

  const pending = items.filter((i) => !i.done)
  const done = items.filter((i) => i.done)

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Todo List</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Legacy task list</p>
      </div>

      {/* Add task */}
      <div className="rounded-lg border bg-card shadow-sm px-4 py-3.5">
        <NewItem addItem={addItem} isInserting={isInserting} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5">
          <span className="text-destructive text-xs">{error.message}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      {/* Pending tasks */}
      {!isLoading && pending.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <SectionHeader label="Pending" count={pending.length} />
          <ul>
            {pending.map((item, idx) => (
              <li
                key={item.id}
                className={cn(
                  'group flex items-center gap-3 px-5 py-3.5',
                  'hover:bg-muted/40 transition-colors duration-100',
                  idx < pending.length - 1 && 'border-b border-border/60'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-px" />
                <span className="flex-1 text-sm text-foreground leading-snug">{item.description}</span>
                {item.createdAt && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:block">
                    {formatDate(item.createdAt)}
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleDone(item.id, item.description, true)}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Done
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completed tasks */}
      {!isLoading && done.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <SectionHeader label="Completed" count={done.length} />
          <ul>
            {done.map((item, idx) => (
              <li
                key={item.id}
                className={cn(
                  'group flex items-center gap-3 px-5 py-3.5',
                  'hover:bg-muted/40 transition-colors duration-100',
                  idx < done.length - 1 && 'border-b border-border/60'
                )}
              >
                <CheckCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm text-muted-foreground line-through">{item.description}</span>
                {item.createdAt && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:block">
                    {formatDate(item.createdAt)}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleDone(item.id, item.description, false)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">No tasks yet. Add one above.</p>
        </div>
      )}
    </div>
  )
}
