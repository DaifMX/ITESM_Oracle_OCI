import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'block text-sm font-medium leading-none text-foreground mb-1.5',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
}
