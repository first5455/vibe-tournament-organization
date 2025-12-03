import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Trophy, Medal } from 'lucide-react'

interface User {
  id: number
  username: string
  mmr: number
}

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()

    // WebSocket connection
    // WebSocket connection
    let ws: WebSocket | null = null
    if (import.meta.env.VITE_USE_WEBSOCKETS === 'true') {
      try {
        ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws')
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === 'UPDATE_LEADERBOARD') {
            loadLeaderboard()
          }
        }
      } catch (e) {
        console.error('WS Error', e)
      }
    }

    return () => {
      if (ws) ws.close()
    }
  }, [])

  const loadLeaderboard = async () => {
    try {
      const data = await api('/users/leaderboard')
      setUsers(data)
    } catch (err) {
      console.error('Failed to load leaderboard', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Global Leaderboard
        </h1>
        <p className="mt-2 text-zinc-400">Top players by MMR</p>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading rankings...</div>
        ) : (
          <table className="w-full text-left">
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
                    <div className="truncate max-w-[120px] sm:max-w-none">
                      {user.username}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-right font-mono text-indigo-400">
                    {user.mmr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
