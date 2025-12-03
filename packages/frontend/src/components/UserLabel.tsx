import { cn } from '../lib/utils'

interface UserLabelProps {
  username?: string | null
  color?: string | null
  className?: string
  as?: 'span' | 'div'
}

export function UserLabel({ username, color, className, as: Component = 'span' }: UserLabelProps) {
  if (!username) return null

  const hasColor = color && color !== '#ffffff'

  return (
    <Component
      className={cn(
        "font-medium transition-all duration-300",
        hasColor && "animate-pulse",
        className
      )}
      style={hasColor ? {
        color: color,
        textShadow: `0 0 10px ${color}40`, // Add a subtle glow
        filter: `drop-shadow(0 0 2px ${color}80)`
      } : undefined}
    >
      {username}
    </Component>
  )
}
