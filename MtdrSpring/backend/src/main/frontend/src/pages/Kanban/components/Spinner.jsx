import { Loader2 } from 'lucide-react'

export default function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
    </div>
  )
}
