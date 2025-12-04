import { cn } from '../lib/utils'
import { UserProfileDialog } from './UserProfileDialog'

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
      <UserProfileDialog userId={userId} username={username}>
        {content}
      </UserProfileDialog>
    )
  }

  return content
}
