import { useState } from 'react'
import { Button } from './ui/button'
import { api } from '../lib/api'
import { X } from 'lucide-react'

interface CreateUserDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any) => void
  requesterId: number
}

export function CreateUserDialog({ isOpen, onClose, onSuccess, requesterId }: CreateUserDialogProps) {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          requesterId
        })
      })
      
      onSuccess(res.user)
      setForm({ username: '', displayName: '', password: '' })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Create New User</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Username *</label>
            <input 
              required
              type="text" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white placeholder-zinc-500"
              placeholder="jdoe"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Display Name</label>
            <input 
              type="text" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white placeholder-zinc-500"
              placeholder="John Doe"
              value={form.displayName}
              onChange={e => setForm({...form, displayName: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Password</label>
            <input 
              type="password" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white placeholder-zinc-500"
              placeholder="Leave empty for default 'password'"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
