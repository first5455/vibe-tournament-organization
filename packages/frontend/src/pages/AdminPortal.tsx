import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { UserLabel } from '../components/UserLabel'
import { useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'

interface User {
  id: number
  username: string
  role: string
  mmr: number
  createdAt: string
  color?: string
}

export default function AdminPortal() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingColorId, setEditingColorId] = useState<number | null>(null)
  const [tempColor, setTempColor] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
      return
    }
    loadUsers()
  }, [user])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await api(`/users?requesterId=${user?.id}`)
      setUsers(data.users)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await api(`/users/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ requesterId: user?.id })
      })
      loadUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const toggleRole = async (targetUser: User) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change role to ${newRole}?`)) return
    
    try {
      await api(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          requesterId: user?.id,
          role: newRole 
        })
      })
      loadUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const changePassword = async (targetUser: User) => {
    const newPassword = prompt(`Enter new password for ${targetUser.username}:`)
    if (!newPassword) return
    
    try {
      await api(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          requesterId: user?.id,
          password: newPassword 
        })
      })
      alert('Password updated successfully')
    } catch (err: any) {
      alert(err.message)
    }
  }

  const editMMR = async (targetUser: User) => {
    const newMMR = prompt(`Enter new MMR for ${targetUser.username}:`, targetUser.mmr.toString())
    if (newMMR === null) return
    
    const mmrValue = parseInt(newMMR)
    if (isNaN(mmrValue)) {
      alert('Invalid MMR value')
      return
    }

    try {
      await api(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          requesterId: user?.id,
          mmr: mmrValue
        })
      })
      loadUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const startEditColor = (targetUser: User) => {
    setEditingColorId(targetUser.id)
    setTempColor(targetUser.color || '#ffffff')
  }

  const cancelEditColor = () => {
    setEditingColorId(null)
    setTempColor('')
  }

  const saveColor = async (targetUser: User) => {
    try {
      await api(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          requesterId: user?.id,
          color: tempColor
        })
      })
      loadUsers()
      setEditingColorId(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
        <div className="flex gap-2">
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            size="sm"
            onClick={async () => {
              if (!confirm('WARNING: This will delete ALL tournaments, matches, and participants. This action cannot be undone. Are you sure?')) return
              try {
                await api(`/admin/data?requesterId=${user?.id}`, { method: 'DELETE' })
                alert('All data deleted successfully')
              } catch (err: any) {
                alert(err.message)
              }
            }}
          >
            Delete All Data
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={async () => {
              if (!confirm('WARNING: This will reset the MMR of ALL users to 1000. This action cannot be undone. Are you sure?')) return
              try {
                await api(`/admin/reset-leaderboard?requesterId=${user?.id}`, { method: 'POST' })
                alert('Leaderboard reset successfully')
                loadUsers()
              } catch (err: any) {
                alert(err.message)
              }
            }}
          >
            Reset Leaderboard
          </Button>
          <Button onClick={loadUsers} variant="outline" size="sm">Refresh</Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded border border-red-500/20">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">MMR</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-900/80">
                <td className="px-4 py-3 font-mono">{u.id}</td>
                <td className="px-4 py-3 font-bold">
                  <UserLabel username={u.username} color={u.color} />
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{u.mmr}</td>
                <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <div className="flex gap-2 justify-end items-center">
                    <div className="w-24 flex justify-end">
                      {u.id !== user?.id && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="w-full"
                          onClick={() => toggleRole(u)}
                        >
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </Button>
                      )}
                    </div>
                    <div className="w-32">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => changePassword(u)}
                      >
                        Reset Password
                      </Button>
                    </div>
                    <div className="w-28">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => editMMR(u)}
                      >
                        Edit MMR
                      </Button>
                    </div>
                    <div className="w-36 flex items-center justify-end gap-1">
                      {editingColorId === u.id ? (
                        <>
                          <input 
                            type="color" 
                            value={tempColor}
                            onChange={(e) => setTempColor(e.target.value)}
                            className="h-8 w-8 bg-transparent cursor-pointer rounded border border-zinc-700"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => saveColor(u)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-300"
                            onClick={cancelEditColor}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full"
                          onClick={() => startEditColor(u)}
                        >
                          Edit Color
                        </Button>
                      )}
                    </div>
                    <div className="w-20 flex justify-end">
                      {u.id !== user?.id && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => deleteUser(u.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
