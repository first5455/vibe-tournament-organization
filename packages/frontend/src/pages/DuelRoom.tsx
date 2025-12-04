import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { UserAvatar } from '../components/UserAvatar'
import { UserLabel } from '../components/UserLabel'
import { Swords, RefreshCw } from 'lucide-react'
import { useRefresh } from '../hooks/useRefresh'

interface Player {
  id: number
  username: string
  avatarUrl?: string
  color?: string
  mmr: number
}

interface Duel {
  id: number
  name: string
  status: 'open' | 'ready' | 'active' | 'completed'
  player1Id: number
  player2Id?: number
  winnerId?: number
  result?: string
  player1: Player
  player2?: Player
  createdAt: string
}

export default function DuelRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [duel, setDuel] = useState<Duel | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDuel = async () => {
    try {
      const { duel } = await api(`/duels/${id}`)
      setDuel(duel)
    } catch (err) {
      console.error('Failed to load duel', err)
    } finally {
      setLoading(false)
    }
  }

  const { handleRefresh, isCoolingDown } = useRefresh(fetchDuel)

  useEffect(() => {
    fetchDuel()
  }, [id])

  const handleJoin = async () => {
    if (!user) return
    try {
      await api(`/duels/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      })
      fetchDuel()
    } catch (error) {
      console.error('Failed to join duel:', error)
      alert('Failed to join duel. Room might be full.')
    }
  }

  const handleLeave = async () => {
    if (!user) return
    try {
      await api(`/duels/${id}/leave`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      })
      fetchDuel()
    } catch (error) {
      console.error('Failed to leave duel:', error)
    }
  }

  const handleStart = async () => {
    if (!user) return
    try {
      await api(`/duels/${id}/start`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      })
      fetchDuel()
    } catch (error) {
      console.error('Failed to start duel:', error)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this room?')) return
    try {
      await api(`/duels/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: user.id })
      })
      navigate('/duels')
    } catch (error) {
      console.error('Failed to delete duel:', error)
    }
  }

  const handleReport = async (winnerId: number) => {
    if (!user) return
    
    // For simple "Report Win" buttons, we imply a 1-0 score
    const player1Score = winnerId === duel?.player1Id ? 1 : 0
    const player2Score = winnerId === duel?.player2Id ? 1 : 0

    try {
      await api(`/duels/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ 
          player1Score, 
          player2Score, 
          reportedBy: user.id 
        })
      })
      fetchDuel()
    } catch (error) {
      console.error('Failed to report result:', error)
    }
  }

  if (loading) return <div className="text-center p-8 text-zinc-500">Loading...</div>
  if (!duel) return <div className="text-center p-8 text-red-400">Duel not found</div>

  const isPlayer1 = user?.id === duel.player1?.id
  const isPlayer2 = user?.id === duel.player2?.id
  const isAdmin = user?.role === 'admin'
  const isParticipant = isPlayer1 || isPlayer2
  const canJoin = user && !isParticipant && duel.status === 'open' && !duel.player2

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Swords className="text-indigo-500" />
            {duel.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
              duel.status === 'active' ? 'bg-green-500/20 text-green-400' :
              duel.status === 'completed' ? 'bg-zinc-800 text-zinc-400' :
              duel.status === 'ready' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {duel.status}
            </span>
            <span className="text-zinc-500 text-sm">Created {new Date(duel.createdAt).toLocaleDateString()}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isCoolingDown}
              className={`ml-2 text-zinc-500 hover:text-zinc-300 transition-all ${isCoolingDown ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isCoolingDown ? "Please wait..." : "Refresh"}
            >
              <RefreshCw className={`w-6 h-6 ${isCoolingDown ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2">
          {(isPlayer1 || isAdmin) && (duel.status === 'open' || duel.status === 'ready') && (
            <Button variant="destructive" onClick={handleDelete}>Delete Room</Button>
          )}
          {(isPlayer1 || isAdmin) && duel.status === 'ready' && (
            <Button variant="primary" onClick={handleStart} className="bg-green-600 hover:bg-green-700">Start Match</Button>
          )}
          {isPlayer2 && duel.status === 'ready' && (
            <Button variant="outline" onClick={handleLeave}>Leave Room</Button>
          )}
          {canJoin && (
            <Button onClick={handleJoin} className="bg-indigo-600 hover:bg-indigo-700">Join Duel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Player 1 */}
        <div className={`bg-zinc-900/50 rounded-xl p-8 border ${duel.winnerId === duel.player1Id ? 'border-green-500/50 bg-green-900/10' : 'border-white/5'} flex flex-col items-center gap-4`}>
          <UserAvatar username={duel.player1?.username} avatarUrl={duel.player1?.avatarUrl} size="lg" />
          <div className="text-center">
            <UserLabel username={duel.player1?.username} color={duel.player1?.color} userId={duel.player1?.id} className="text-xl" />
            <div className="text-zinc-500 text-sm mt-1">MMR: {duel.player1?.mmr}</div>
          </div>
          {duel.status === 'active' && (isParticipant || isAdmin) && (
            <Button 
              variant="outline" 
              className="w-full mt-4 border-green-500/20 hover:bg-green-500/10 hover:text-green-400"
              onClick={() => handleReport(duel.player1Id)}
            >
              Report Win
            </Button>
          )}
          {duel.winnerId === duel.player1Id && (
            <div className="mt-4 text-green-400 font-bold text-lg">WINNER</div>
          )}
        </div>

        {/* VS */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-4xl font-black text-zinc-800 italic">VS</div>
          {duel.status === 'open' && (
            <div className="text-zinc-500 text-sm animate-pulse">Waiting for opponent...</div>
          )}
          {duel.status === 'ready' && (
            <div className="text-yellow-500 text-sm font-medium">Ready to start!</div>
          )}
        </div>

        {/* Player 2 */}
        <div className={`bg-zinc-900/50 rounded-xl p-8 border ${duel.winnerId === duel.player2Id ? 'border-green-500/50 bg-green-900/10' : 'border-white/5'} flex flex-col items-center gap-4 min-h-[300px] justify-center`}>
          {duel.player2 ? (
            <>
              <UserAvatar username={duel.player2.username} avatarUrl={duel.player2.avatarUrl} size="lg" />
              <div className="text-center">
                <UserLabel username={duel.player2.username} color={duel.player2.color} userId={duel.player2.id} className="text-xl" />
                <div className="text-zinc-500 text-sm mt-1">MMR: {duel.player2.mmr}</div>
              </div>
              {duel.status === 'active' && (isParticipant || isAdmin) && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-green-500/20 hover:bg-green-500/10 hover:text-green-400"
                  onClick={() => handleReport(duel.player2Id!)}
                >
                  Report Win
                </Button>
              )}
              {duel.winnerId === duel.player2Id && (
                <div className="mt-4 text-green-400 font-bold text-lg">WINNER</div>
              )}
            </>
          ) : (
            <div className="text-zinc-600 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">?</div>
              <span>Empty Slot</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
