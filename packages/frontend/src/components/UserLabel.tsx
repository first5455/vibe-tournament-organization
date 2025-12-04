import { cn } from '../lib/utils'
import { Link } from 'react-router-dom'

interface UserLabelProps {
  username?: string | null
  color?: string | null
  className?: string
  as?: 'span' | 'div'
  userId?: number
}

export function UserLabel({ username, color, className, as: Component = 'span', userId }: UserLabelProps) {
  if (!username) return null

  const hasColor = color && color !== '#ffffff'

  const content = (
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

  if (userId) {
    return (
      <Link 
        to={`/users/${userId}`}
        className={cn("font-medium hover:underline decoration-indigo-500/50 underline-offset-4", className)}
        style={{ color: color || undefined }}
      >
        {username}
      </Link>
    )
  }

  return content
}
