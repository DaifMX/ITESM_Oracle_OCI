import { useState } from 'react'
import { Loader2, Check, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { createComment, deleteComment } from '../../../lib/api'
import { parseLocalDate } from '../../../lib/utils'
import ErrorMsg from './ErrorMsg'

export default function CommentsTab({ taskId, initialComments }) {
  const [comments, setComments]           = useState(initialComments)
  const [newComment, setNewComment]       = useState('')
  const [sending, setSending]             = useState(false)
  const [error, setError]                 = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    setSending(true)
    try {
      const c = await createComment(taskId, newComment.trim())
      setComments((prev) => [...prev, c])
      setNewComment('')
    } catch (err) { setError(err.message) }
    finally { setSending(false) }
  }

  async function handleDelete(commentId) {
    await deleteComment(commentId)
    setComments((prev) => prev.filter((c) => c.commentId !== commentId))
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className="field flex-1"
          placeholder="Add a comment…"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={sending || !newComment.trim()}>
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </Button>
      </form>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {comments.length === 0
        ? <p className="text-xs text-muted-foreground text-center py-6">No comments yet.</p>
        : (
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.commentId} className="group rounded-md border bg-background px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1">
                      <span className="text-xs font-medium">{c.employee?.firstName} {c.employee?.lastName}</span>
                      {c.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          {parseLocalDate(c.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{c.content}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon-sm" shrink-0
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                    onClick={() => handleDelete(c.commentId)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
