import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { UserAvatar } from './UserAvatar'
import { Search } from 'lucide-react'

interface User {
  id: number
  username: string
  displayName?: string
  avatarUrl?: string
}

interface UserSearchSelectProps {
  onSelect: (user: User) => void
  placeholder?: string
}

export function UserSearchSelect({ onSelect, placeholder = "Search user..." }: UserSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const data = await api(`/users/search?q=${encodeURIComponent(query)}`)
        setResults(data)
      } catch (error) {
        console.error('Search failed', error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSelect = (user: User) => {
    onSelect(user)
    setQuery(user.displayName || user.username)
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length >= 2) setIsOpen(true)
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-sm text-zinc-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No users found</div>
          ) : (
            <div className="py-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-zinc-800"
                  onClick={() => handleSelect(user)}
                >
                  <UserAvatar username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {user.displayName || user.username}
                    </div>
                    {user.displayName && (
                      <div className="text-xs text-zinc-500">@{user.username}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
