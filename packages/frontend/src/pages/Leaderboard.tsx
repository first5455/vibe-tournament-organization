import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Trophy, Medal, RefreshCw } from 'lucide-react'
import { UserLabel } from '../components/UserLabel'
import { UserAvatar } from '../components/UserAvatar'
import { Button } from '../components/ui/button'
import { useRefresh } from '../hooks/useRefresh'
import { useFocusRevalidate } from '../hooks/useFocusRevalidate'
import { useGame } from '../contexts/GameContext'

interface User {
  id: number
  username: string
  displayName?: string
  mmr: number
  color?: string
  avatarUrl?: string
}

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { selectedGame } = useGame()

  const loadLeaderboard = async () => {
    if (!selectedGame) return

    try {
      setIsLoading(true)
      const data = await api(`/users/leaderboard?gameId=${selectedGame.id}`)
      setUsers(data)
    } catch (err) {
      console.error('Failed to load leaderboard', err)
    } finally {
      setIsLoading(false)
    }
  }

  const { handleRefresh, isCoolingDown } = useRefresh(loadLeaderboard)

  useEffect(() => {
    if (selectedGame) {
      loadLeaderboard()
    }

    // WebSocket connection
    let ws: WebSocket | null = null
    if (import.meta.env.VITE_USE_WEBSOCKETS === 'true' && selectedGame) {
      try {
        ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws')
        
        ws.onopen = () => {
          // Connected
        }

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === 'UPDATE_LEADERBOARD') {
            loadLeaderboard()
          }
        }
        
        // Suppress simple errors in dev to avoid noise
        ws.onerror = () => {}

      } catch (e) {
        console.error('WS Exception', e)
      }
    }

    // Heartbeat
    const interval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }))
        }
    }, 30000)

    return () => {
      clearInterval(interval)
      if (ws) {
        ws.close()
      }
    }
  }, [selectedGame?.id])

  useFocusRevalidate(loadLeaderboard, 30000)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Global Leaderboard
          </h1>
          <p className="mt-2 text-zinc-400">Top players by MMR</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={isCoolingDown}
          className={`text-zinc-400 hover:text-white ${isCoolingDown ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isCoolingDown ? "Please wait..." : "Refresh leaderboard"}
        >
          <RefreshCw className={`h-6 w-6 ${isCoolingDown ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading rankings...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-3 sm:px-6 py-4 font-medium">Rank</th>
                  <th className="px-3 sm:px-6 py-4 font-medium">Player</th>
                  <th className="px-3 sm:px-6 py-4 font-medium text-right">MMR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Medal className="h-5 w-5 text-yellow-500" />}
                        {index === 1 && <Medal className="h-5 w-5 text-zinc-400" />}
                        {index === 2 && <Medal className="h-5 w-5 text-amber-700" />}
                        <span className={`font-mono ${index < 3 ? 'font-bold text-white' : 'text-zinc-500'}`}>
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <UserAvatar username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
                        <div className="truncate max-w-[120px] sm:max-w-none">
                          <UserLabel username={user.username} displayName={user.displayName} color={user.color} userId={user.id} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right font-mono text-indigo-400">
                      {user.mmr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
