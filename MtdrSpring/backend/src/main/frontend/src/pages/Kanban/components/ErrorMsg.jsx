import { AlertCircle } from 'lucide-react'

export default function ErrorMsg({ children }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5" />{children}
    </p>
  )
}
