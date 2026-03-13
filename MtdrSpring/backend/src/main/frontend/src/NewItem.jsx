import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function NewItem({ addItem, isInserting }) {
  const [item, setItem] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!item.trim()) return
    addItem(item)
    setItem('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <Input
        id="newiteminput"
        placeholder="Add a new task…"
        type="text"
        autoComplete="off"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
        className="flex-1"
      />
      <Button
        type="submit"
        size="default"
        disabled={isInserting || !item.trim()}
      >
        {isInserting ? 'Adding…' : 'Add'}
      </Button>
    </form>
  )
}
