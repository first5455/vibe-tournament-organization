import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Plus, Swords, RefreshCw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { UserAvatar } from '../components/UserAvatar'
import { UserLabel } from '../components/UserLabel'
import { useRefresh } from '../hooks/useRefresh'
import { useGame } from '../contexts/GameContext'

interface Duel {
  id: number
  name: string
  status: 'open' | 'ready' | 'active' | 'completed'
  player1Id: number
  player2Id?: number
  winnerId?: number
  result?: string
  createdAt: string
  player1Name: string
  player1DisplayName?: string
  player1Avatar?: string
  player1Color?: string
  player2Name?: string
  player2DisplayName?: string
  player2Avatar?: string
  player2Color?: string
  player1DeckName?: string
  player1DeckColor?: string
  player2DeckName?: string
  player2DeckColor?: string
  player1DeckLink?: string
  player2DeckLink?: string
}

interface Deck {
  id: number
  name: string
}

export default function DuelDashboard() {
  const [duels, setDuels] = useState<Duel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [userDecks, setUserDecks] = useState<Deck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<number | undefined>(undefined)
  const { user } = useAuth()
  const navigate = useNavigate()

  const { selectedGame } = useGame()

  const loadDuels = async () => {
    if (!selectedGame) return

    try {
      setIsLoading(true)
      const data = await api(`/duels?gameId=${selectedGame.id}`)
      setDuels(data)
    } catch (err) {
      console.error('Failed to load duels', err)
    } finally {
      setIsLoading(false)
    }
  }

  const { handleRefresh, isCoolingDown } = useRefresh(loadDuels)

  useEffect(() => {
    if (selectedGame) {
      loadDuels()
    }

    let ws: WebSocket | null = null
    if (import.meta.env.VITE_USE_WEBSOCKETS === 'true' && selectedGame) {
      try {
        ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws')
        
        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: 'SUBSCRIBE_DUELS' }))
        }

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === 'UPDATE_DUELS_LIST') {
            loadDuels()
          }
        }
        
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
      if (ws) ws.close()
    }
  }, [selectedGame?.id])

  useEffect(() => {
    const fetchDecks = async () => {
      // Decks should also be filtered by game if backend logic requires it.
      // Assuming GET /decks supports gameId filtering
      if (user?.id && selectedGame) {
        try {
          const decks = await api(`/decks?userId=${user.id}&gameId=${selectedGame.id}`)
          setUserDecks(decks)
        } catch (e) {
          console.error('Failed to fetch decks', e)
        }
      }
    }
    fetchDecks()
  }, [user, selectedGame])

  const createDuel = async () => {
    if (!user || !selectedGame) return

    try {
      let roomName = newName.trim()
      
      if (!roomName) {
        const timeRes = await api('/time')
        roomName = timeRes.formatted
      }

      const { duel } = await api('/duels', {
        method: 'POST',
        body: JSON.stringify({ 
          name: roomName, 
          createdBy: user.id,
          player1DeckId: selectedDeckId,
          gameId: selectedGame.id
        }),
      })

      setIsCreating(false)
      setNewName('')
      navigate(`/duels/${duel.id}`)
    } catch (err) {
      alert('Failed to create duel')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Swords className="h-8 w-8 text-indigo-500" />
            Duel Rooms
          </h1>
          <p className="text-zinc-400">Challenge others to 1v1 duels</p>
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
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Room
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-white">Create Duel Room</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Room Name (Optional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Default: DD-MM-YYYY HH:mm"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Select Deck (Optional)</label>
                <select
                  value={selectedDeckId || ''}
                  onChange={(e) => setSelectedDeckId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">No Deck</option>
                  {userDecks.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={createDuel}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-zinc-500">Loading duels...</div>
      ) : duels.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Swords className="mx-auto h-12 w-12 text-zinc-700" />
          <h3 className="mt-4 text-lg font-medium text-white">No active duels</h3>
          <p className="mt-2 text-zinc-400">Create a room to start a duel.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {duels.map((duel) => (
            <Link
              key={duel.id}
              to={`/duels/${duel.id}`}
              className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-indigo-400">
                    {duel.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                      duel.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      duel.status === 'ready' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {duel.status === 'open' ? 'Waiting for player' : 
                       duel.status === 'ready' ? 'Ready to Start' : 'In Progress'}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                    <div className="flex flex-col items-center">
                      <UserAvatar username={duel.player1Name} displayName={duel.player1DisplayName} avatarUrl={duel.player1Avatar} size="sm" className="h-8 w-8 mb-1" />
                      <UserLabel username={duel.player1Name} displayName={duel.player1DisplayName} color={duel.player1Color} className="text-sm" />
                      {duel.player1DeckName && (
                        duel.player1DeckLink ? (
                            <a 
                                href={duel.player1DeckLink} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium truncate max-w-[100px] hover:underline" 
                                style={{ color: duel.player1DeckColor || '#fff' }}
                            >
                                {duel.player1DeckName}
                            </a>
                        ) : (
                            <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: duel.player1DeckColor || '#fff' }}>
                                {duel.player1DeckName}
                            </span>
                        )
                      )}
                    </div>
                    
                    <span className="text-zinc-600 font-bold text-sm">VS</span>
                    
                    <div className="flex flex-col items-center">
                      {duel.player2Name ? (
                        <>
                          <UserAvatar username={duel.player2Name} displayName={duel.player2DisplayName} avatarUrl={duel.player2Avatar} size="sm" className="h-8 w-8 mb-1" />
                          <UserLabel username={duel.player2Name} displayName={duel.player2DisplayName} color={duel.player2Color} className="text-sm" />
                          {duel.player2DeckName && (
                            duel.player2DeckLink ? (
                                <a 
                                    href={duel.player2DeckLink} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs font-medium truncate max-w-[100px] hover:underline" 
                                    style={{ color: duel.player2DeckColor || '#fff' }}
                                >
                                    {duel.player2DeckName}
                                </a>
                            ) : (
                                <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: duel.player2DeckColor || '#fff' }}>
                                    {duel.player2DeckName}
                                </span>
                            )
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-zinc-500 italic h-full flex items-center">Waiting...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
