import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { UserAvatar } from '../components/UserAvatar'
import { UserLabel } from '../components/UserLabel'
import { Swords, RefreshCw, Edit2 } from 'lucide-react'
import { useRefresh } from '../hooks/useRefresh'
import { useFocusRevalidate } from '../hooks/useFocusRevalidate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { UserSearchSelect } from '../components/UserSearchSelect'

interface Player {
  id: number
  username: string
  displayName?: string
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
  player1Note?: string
  player2Note?: string
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

  useFocusRevalidate(fetchDuel, 10000)

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

  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null)
  const [noteContent, setNoteContent] = useState('')

  const openNoteDialog = (playerId: number, currentNote?: string) => {
    setEditingPlayerId(playerId)
    setNoteContent(currentNote || '')
    setNoteDialogOpen(true)
  }

  const handleSaveNote = async () => {
    if (!user || !editingPlayerId) return
    try {
      await api(`/duels/${id}/note`, {
        method: 'POST',
        body: JSON.stringify({
          targetPlayerId: editingPlayerId,
          note: noteContent,
          userId: user.id
        })
      })
      setNoteDialogOpen(false)
      fetchDuel()
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }

  const [editResultOpen, setEditResultOpen] = useState(false)
  const [editScore1, setEditScore1] = useState('0')
  const [editScore2, setEditScore2] = useState('0')

  const handleOpenEditResult = () => {
    if (!duel?.result) return
    const [s1, s2] = duel.result.split('-')
    setEditScore1(s1)
    setEditScore2(s2)
    setEditResultOpen(true)
  }

  const handleSaveResult = async () => {
    if (!user) return
    try {
      await api(`/duels/${id}/result`, {
        method: 'PUT',
        body: JSON.stringify({
          player1Score: parseInt(editScore1),
          player2Score: parseInt(editScore2),
          userId: user.id
        })
      })
      setEditResultOpen(false)
      fetchDuel()
    } catch (error) {
      console.error('Failed to update result:', error)
    }
  }

  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  const [addPlayerId, setAddPlayerId] = useState('')

  const handleAddPlayer = async () => {
    if (!user || !addPlayerId) return
    try {
      await api(`/duels/${id}/admin-update`, {
        method: 'PUT',
        body: JSON.stringify({
          userId: user.id,
          player2Id: parseInt(addPlayerId),
          status: 'ready'
        })
      })
      setAddPlayerOpen(false)
      fetchDuel()
    } catch (error: any) {
      alert('Failed to add player: ' + error.message)
    }
  }

  const handleRematch = async () => {
    if (!user || !duel) return

    const getDefaultRoomName = () => {
      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const year = now.getFullYear()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      return `${day}-${month}-${year} ${hours}:${minutes}`
    }

    try {
      const { duel: newDuel } = await api('/duels', {
        method: 'POST',
        body: JSON.stringify({
          name: getDefaultRoomName(),
          createdBy: user.id,
          player1Id: duel.player1Id,
          player2Id: duel.player2Id,
          player1Note: duel.player1Note,
          player2Note: duel.player2Note
        })
      })
      navigate(`/duels/${newDuel.id}`)
    } catch (error: any) {
      alert('Failed to create rematch: ' + error.message)
    }
  }

  if (loading) return <div className="text-center p-8 text-zinc-500">Loading...</div>
  if (!duel) return <div className="text-center p-8 text-red-400">Duel not found</div>

  const isPlayer1 = user?.id === duel.player1?.id
  const isPlayer2 = user?.id === duel.player2?.id
  const isAdmin = user?.role === 'admin'
  const isParticipant = isPlayer1 || isPlayer2
  const canJoin = user && !isParticipant && duel.status === 'open' && !duel.player2

  console.log('DuelRoom Debug:', { isAdmin, isParticipant, status: duel.status, userRole: user?.role, userId: user?.id })
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
          {isAdmin && duel.status === 'completed' && (
            <Button variant="outline" onClick={handleOpenEditResult}>Edit Result</Button>
          )}
          {(isParticipant || isAdmin) && duel.status === 'completed' && (
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleRematch}>Rematch</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Player 1 */}
        <div className={`bg-zinc-900/50 rounded-xl p-8 border ${duel.winnerId === duel.player1Id ? 'border-green-500/50 bg-green-900/10' : 'border-white/5'} flex flex-col items-center gap-4`}>
          <UserAvatar username={duel.player1?.username} displayName={duel.player1?.displayName} avatarUrl={duel.player1?.avatarUrl} size="lg" />
          <div className="text-center">
            <UserLabel username={duel.player1?.username} displayName={duel.player1?.displayName} color={duel.player1?.color} userId={duel.player1?.id} className="text-xl" />
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
          
          {/* Note Section */}
          <div className="w-full mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Note</span>
              {(isPlayer1 || isAdmin) && (
                <button 
                  onClick={() => openNoteDialog(duel.player1Id, duel.player1Note)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="text-sm text-zinc-400 bg-black/20 p-3 rounded-md min-h-[60px] whitespace-pre-wrap">
              {duel.player1Note || <span className="text-zinc-600 italic">No notes</span>}
            </div>
          </div>
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
        <div className={`bg-zinc-900/50 rounded-xl p-8 border ${duel.winnerId === duel.player2Id ? 'border-green-500/50 bg-green-900/10' : 'border-white/5'} flex flex-col items-center gap-4`}>
          {duel.player2 ? (
            <>
              <UserAvatar username={duel.player2.username} displayName={duel.player2.displayName} avatarUrl={duel.player2.avatarUrl} size="lg" />
              <div className="text-center">
                <UserLabel username={duel.player2.username} displayName={duel.player2.displayName} color={duel.player2.color} userId={duel.player2.id} className="text-xl" />
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

              {/* Note Section */}
              <div className="w-full mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Note</span>
                  {(isPlayer2 || isAdmin) && (
                    <button 
                      onClick={() => openNoteDialog(duel.player2Id!, duel.player2Note)}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-400 italic">
                  {duel.player2Note || "No notes"}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-zinc-500 gap-4">
              <div>Waiting for player...</div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setAddPlayerOpen(true)}>
                  Add Player
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter note about this player..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editResultOpen} onOpenChange={setEditResultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match Result</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">{duel.player1?.username}</span>
              <input
                type="number"
                min="0"
                className="w-16 p-2 rounded bg-zinc-800 border border-zinc-700 text-center"
                value={editScore1}
                onChange={(e) => setEditScore1(e.target.value)}
              />
            </div>
            <span className="text-xl font-bold text-zinc-500">-</span>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">{duel.player2?.username}</span>
              <input
                type="number"
                min="0"
                className="w-16 p-2 rounded bg-zinc-800 border border-zinc-700 text-center"
                value={editScore2}
                onChange={(e) => setEditScore2(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditResultOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveResult}>Save Result</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player to Duel</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Search User</label>
              <UserSearchSelect 
                onSelect={(user) => setAddPlayerId(user.id.toString())}
                placeholder="Search by name..."
              />
              {addPlayerId && (
                <div className="text-xs text-green-400">
                  Selected User ID: {addPlayerId}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddPlayerOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPlayer} disabled={!addPlayerId}>Add Player</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
