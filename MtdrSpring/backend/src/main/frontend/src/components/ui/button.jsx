import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    'ring-offset-background transition-colors duration-150 select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary:   'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80',
        ghost:       'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        destructive: 'text-destructive bg-card border border-border hover:bg-destructive/10',
        outline:     'border border-border bg-transparent hover:bg-accent text-foreground',
        link:        'text-primary underline-offset-4 hover:underline h-auto p-0',
      },
      size: {
        default:  'h-9 px-4 py-2',
        sm:       'h-7 px-3 text-xs gap-1',
        lg:       'h-10 px-6',
        icon:     'h-9 w-9 p-0',
        'icon-sm':'h-7 w-7 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { buttonVariants }
