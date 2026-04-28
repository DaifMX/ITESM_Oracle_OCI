import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Loader2, Bot } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { sendChatMessage } from '../lib/api'
import { getUser } from '../lib/auth'

const WELCOME = 'Hi! I\'m your project assistant. Ask me anything about your tasks, sprints, or projects.'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const user = getUser()

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 50)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const data = await sendChatMessage(text)
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleOpen() {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          'bg-oracle-red text-white hover:bg-[#A32100] active:scale-95',
          open && 'opacity-0 pointer-events-none'
        )}
        aria-label="Open AI Assistant"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-5 right-5 z-50 flex flex-col rounded-xl shadow-2xl border bg-card overflow-hidden',
          'w-80 sm:w-96 transition-all duration-200 origin-bottom-right',
          open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'
        )}
        style={{ height: '500px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-oracle-red text-white shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <div>
              <p className="font-semibold text-sm leading-none">Project Assistant</p>
              {user && (
                <p className="text-xs text-white/70 mt-0.5 capitalize">{user.role} view</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-oracle-red text-white rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t px-3 py-2.5 flex gap-2 items-end bg-card">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            disabled={loading}
            className={cn(
              'flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-oracle-red/50 focus:border-oracle-red',
              'disabled:opacity-50 max-h-28 transition-colors'
            )}
            style={{ lineHeight: '1.4' }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-oracle-red hover:bg-[#A32100] shrink-0 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
