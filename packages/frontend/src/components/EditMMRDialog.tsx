import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { api } from '../lib/api'
import { X } from 'lucide-react'
import { User } from '../types'

interface EditMMRDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: User | null
  games: any[]
  requesterId: number
  initialGameId?: string 
}

export function EditMMRDialog({ isOpen, onClose, onSuccess, user, games, requesterId, initialGameId }: EditMMRDialogProps) {
  const [mmr, setMmr] = useState<string>('')
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      let initialMmr = 1000
      let gId = ''

      if (initialGameId && initialGameId !== 'all') {
        gId = initialGameId
        if (user.stats) {
            const stat = user.stats.find(s => s.gameId === parseInt(initialGameId))
            if (stat) initialMmr = stat.mmr
        }
      } else if (games.length > 0) {
         // Default to first game if 'all' or nothing selected
         gId = games[0].id.toString()
         if (user.stats) {
            const stat = user.stats.find(s => s.gameId === games[0].id)
            if (stat) initialMmr = stat.mmr
         }
      }

      setMmr(initialMmr.toString())
      setSelectedGameId(gId)
    }
  }, [isOpen, user, initialGameId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    setError('')

    try {
      const body: any = {
        requesterId,
        mmr: parseInt(mmr)
      }
      
      if (selectedGameId && selectedGameId !== 'all') {
          body.gameId = parseInt(selectedGameId)
      } else {
          throw new Error("Please select a game")
      }

      await api(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      })
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update MMR')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Edit MMR for {user.username}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Game</label>
            <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
            >
                <option value="" disabled>Select a Game</option>
                {games.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                ))}
            </select>
            <p className="text-xs text-zinc-500">MMR is now strictly game-specific.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">New MMR</label>
            <input 
              required
              type="number" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white placeholder-zinc-500"
              value={mmr}
              onChange={e => setMmr(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
