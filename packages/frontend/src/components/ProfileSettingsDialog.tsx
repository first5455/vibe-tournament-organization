import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { UserAvatar } from './UserAvatar'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

interface User {
  id: number
  username: string
  mmr: number
  color?: string
  avatarUrl?: string
  createdAt: string
}

interface ProfileSettingsDialogProps {
  children: React.ReactNode
  user: User
  onUpdate: () => void
}

export function ProfileSettingsDialog({ children, user, onUpdate }: ProfileSettingsDialogProps) {
  const { user: currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    avatarUrl: '',
    color: '',
    password: ''
  })

  useEffect(() => {
    if (open) {
      setFormData({
        username: user.username,
        avatarUrl: user.avatarUrl || '',
        color: user.color || '#ffffff',
        password: ''
      })
    }
  }, [open, user])

  const handleSave = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const body: any = {
        requesterId: currentUser.id,
        username: formData.username,
        avatarUrl: formData.avatarUrl,
        color: formData.color,
      }
      
      if (formData.password) {
        body.password = formData.password
      }

      await api(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      })
      
      onUpdate()
      setOpen(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentUser) return
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
    
    setLoading(true)
    try {
      await api(`/users/${user.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ requesterId: currentUser.id })
      })
      
      logout()
      navigate('/')
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Profile Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Profile Picture URL</label>
            <Input 
              value={formData.avatarUrl}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              placeholder="https://example.com/avatar.png"
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Preview</label>
            <div className="flex items-center gap-4">
              <UserAvatar username={formData.username} avatarUrl={formData.avatarUrl} size="lg" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Username</label>
            <Input 
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Custom Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded bg-transparent"
              />
              <span className="text-sm text-zinc-500">Pick a color to stand out!</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">New Password (leave blank to keep current)</label>
            <Input 
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>

          <div className="pt-4 mt-4 border-t border-zinc-800">
            <h4 className="text-red-500 font-medium mb-2">Danger Zone</h4>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
              className="w-full"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
