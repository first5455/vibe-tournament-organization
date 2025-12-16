import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Plus, Calendar, Trophy, RefreshCw, ChevronDown, ChevronRight, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { UserLabel } from '../components/UserLabel'
import { UserAvatar } from '../components/UserAvatar'
import { useRefresh } from '../hooks/useRefresh'
import { formatDate } from '../lib/utils'
import { useGame } from '../contexts/GameContext'

interface Tournament {
  id: number
  name: string
  status: 'pending' | 'active' | 'completed'
  totalRounds: number
  currentRound: number
  createdAt: string
  participantCount: number
  type: 'swiss' | 'round_robin'
  createdByName: string
  createdByDisplayName?: string
  createdByColor?: string
  createdByAvatarUrl?: string
  startDate?: string
  endDate?: string
  winnerName?: string
  winnerDisplayName?: string
  winnerAvatarUrl?: string
  winnerColor?: string
}

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false) // Default to collapsed to keep view clean? User said "can collapse", but having it clean is nice. I will default to false (collapsed) if that's what "can collapse" often leads to in requests (cleaner UI). Wait, better to start Expanded to mimic previous state, then let them collapse. Let's start TRUE (Expanded).
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'swiss' | 'round_robin'>('swiss')
  const { user, hasPermission } = useAuth()

  const { selectedGame } = useGame()

  useEffect(() => {
    if (selectedGame) {
      loadTournaments()
    }
  }, [selectedGame])

  useEffect(() => {
    let ws: WebSocket | null = null

    if (import.meta.env.VITE_USE_WEBSOCKETS === 'true') {
        ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws')

        ws.onopen = () => {
            ws?.send(JSON.stringify({ type: 'SUBSCRIBE_TOURNAMENTS' }))
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'UPDATE_TOURNAMENTS_LIST') {
                    if (selectedGame) {
                        loadTournaments()
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
    }

    const interval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }))
        }
    }, 30000)

    return () => {
        clearInterval(interval)
        ws?.close()
    }
  }, [selectedGame])

  const loadTournaments = async () => {
    if (!selectedGame) return

    try {
      setIsLoading(true)
      const data = await api(`/tournaments?gameId=${selectedGame.id}`)
      setTournaments(data)
    } catch (err) {
      console.error('Failed to load tournaments', err)
    } finally {
      setIsLoading(false)
    }
  }

  const { handleRefresh, isCoolingDown } = useRefresh(loadTournaments)

  const createTournament = async () => {
    if (!selectedGame) return

    if (!newName.trim()) {
      alert('Tournament name is required')
      return
    }

    try {
      await api('/tournaments', {
        method: 'POST',
        body: JSON.stringify({ 
          name: newName, 
          createdBy: user?.id,
          type: newType,
          gameId: selectedGame.id
        }),
      })
      setIsCreating(false)
      setNewName('')
      setNewType('swiss')
      loadTournaments()
    } catch (err: any) {
      console.error(err)
      alert('Failed to create tournament: ' + (err.message || 'Unknown error'))
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tournaments</h1>
          <p className="text-zinc-400">Manage and join tournaments</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={isCoolingDown}
            className={`text-zinc-400 hover:text-white ${isCoolingDown ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isCoolingDown ? "Please wait..." : "Refresh list"}
          >
            <RefreshCw className={`h-6 w-6 ${isCoolingDown ? 'animate-spin' : ''}`} />
          </Button>
          {(hasPermission('tournaments.manage_own') || hasPermission('tournaments.manage_all')) && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-white">Create Tournament</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Tournament Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter name..."
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Tournament Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('swiss')}
                    className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      newType === 'swiss'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {newType === 'swiss' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    Swiss System
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('round_robin')}
                    className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      newType === 'round_robin'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {newType === 'round_robin' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    Round Robin
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={createTournament}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-zinc-500">Loading tournaments...</div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-zinc-700" />
          <h3 className="mt-4 text-lg font-medium text-white">No tournaments yet</h3>
          <p className="mt-2 text-zinc-400">Create your first tournament to get started.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active & Pending Tournaments */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-white">Active Tournaments</h2>
            {tournaments.filter(t => t.status !== 'completed').length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                <p className="text-zinc-400">No active tournaments running right now.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tournaments
                  .filter(t => t.status !== 'completed')
                  .map((tournament) => (
                    <Link
                      key={tournament.id}
                      to={`/tournaments/${tournament.id}`}
                      className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-indigo-400">
                            {tournament.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                              tournament.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {tournament.status}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{tournament.type.replace('_', ' ')}</span>
                          </div>
                          {tournament.createdByName && (
                            <div className="mt-1 text-xs text-zinc-500 flex items-center gap-2">
                              <UserAvatar username={tournament.createdByName} displayName={tournament.createdByDisplayName} avatarUrl={tournament.createdByAvatarUrl} size="sm" className="h-4 w-4" />
                              <span className="flex items-center gap-1">
                                by <UserLabel username={tournament.createdByName} displayName={tournament.createdByDisplayName} color={tournament.createdByColor} />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created: {formatDate(tournament.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          <span>Players: {tournament.participantCount}</span>
                        </div>
                      </div>
                    </Link>
                ))}
              </div>
            )}
          </section>

          {/* Completed Tournaments */}
          {tournaments.filter(t => t.status === 'completed').length > 0 && (
            <section>
              <button 
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className="flex items-center gap-2 mb-4 text-xl font-bold text-white hover:text-indigo-400 transition-colors"
              >
                {isCompletedExpanded ? <ChevronDown className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
                Completed Tournaments
              </button>
              
              {isCompletedExpanded && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tournaments
                  .filter(t => t.status === 'completed')
                  .map((tournament) => (
                    <Link
                      key={tournament.id}
                      to={`/tournaments/${tournament.id}`}
                      className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-zinc-300 group-hover:text-white">
                            {tournament.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                            <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-bold uppercase text-zinc-500">
                              Completed
                            </span>
                            <span>•</span>
                            <span className="capitalize">{tournament.type.replace('_', ' ')}</span>
                          </div>
                   
                        </div>
                      </div>
                      
                      {tournament.winnerName && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-yellow-500/10 p-2 text-yellow-500">
                          <Crown className="h-4 w-4" />
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-xs uppercase tracking-wider opacity-75">Winner</span>
                            <div className="flex items-center gap-1.5 font-semibold">
                              <UserAvatar 
                                username={tournament.winnerName} 
                                displayName={tournament.winnerDisplayName} 
                                avatarUrl={tournament.winnerAvatarUrl} 
                                size="xs" 
                                className="h-5 w-5" 
                              />
                              <UserLabel 
                                username={tournament.winnerName} 
                                displayName={tournament.winnerDisplayName} 
                                color={tournament.winnerColor} 
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <div className="flex flex-col gap-0.5">
                            {tournament.endDate && (
                              <span>Ended: {formatDate(tournament.endDate)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          <span>Players: {tournament.participantCount}</span>
                        </div>
                      </div>
                    </Link>
                ))}
              </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
