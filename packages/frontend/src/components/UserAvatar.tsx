import { cn } from '../lib/utils'

interface UserAvatarProps {
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function UserAvatar({ username, displayName, avatarUrl, className, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-16 w-16 text-base',
    md: 'h-[4.5rem] w-[4.5rem] text-lg',
    lg: 'h-32 w-32 text-xl',
    xl: 'h-48 w-48 text-3xl'
  }

  return (
    <div className={cn(
      "relative rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border border-zinc-700",
      sizeClasses[size],
      className
    )}>
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={username} 
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to icon on error
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
      ) : null}
      <div className={cn("flex items-center justify-center w-full h-full text-zinc-400", avatarUrl ? "hidden" : "")}>
        <span className="font-bold uppercase">{(displayName || username).substring(0, 2)}</span>
      </div>
    </div>
  )
}
