import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { api } from '../lib/api'
import { X } from 'lucide-react'
import { User } from '../types'

interface EditPointsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: User | null
  requesterId: number
  pointDisplayName: string
}

export function EditPointsDialog({ isOpen, onClose, onSuccess, user, requesterId, pointDisplayName }: EditPointsDialogProps) {
  const [points, setPoints] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      setPoints((user.points ?? 0).toString())
      setError('')
    }
  }, [isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      await api(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          requesterId,
          points: parseInt(points)
        })
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || `Failed to update ${pointDisplayName}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Edit {pointDisplayName} for {user.displayName || user.username}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{pointDisplayName} Balance</label>
            <input
              required
              type="number"
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white placeholder-zinc-500"
              value={points}
              onChange={e => setPoints(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-zinc-500">Set the {pointDisplayName.toLowerCase()} balance for this user.</p>
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
