import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-primary text-primary-foreground px-2 py-0.5',
        secondary: 'bg-secondary text-secondary-foreground border border-border px-2 py-0.5',
        outline:   'border border-border text-foreground px-2 py-0.5',
      },
    },
    defaultVariants: { variant: 'secondary' },
  }
)

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
