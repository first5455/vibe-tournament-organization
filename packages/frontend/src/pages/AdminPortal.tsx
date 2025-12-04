import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { UserLabel } from '../components/UserLabel'
import { UserAvatar } from '../components/UserAvatar'
import { useNavigate, Link } from 'react-router-dom'
import { Check, X, MoreVertical, Shield, Key, Trophy, Palette, Image as ImageIcon, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

interface User {
  id: number
  username: string
  displayName?: string
  role: string
  mmr: number
  createdAt: string
  color?: string
  avatarUrl?: string
}

export default function AdminPortal() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'tournaments' | 'duels'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [duels, setDuels] = useState<any[]>([])
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
    loadData()
  }, [user, activeTab])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'users') {
        const data = await api(`/users?requesterId=${user?.id}`)
        setUsers(data.users)
      } else if (activeTab === 'tournaments') {
        const data = await api('/tournaments')
        setTournaments(data)
      } else if (activeTab === 'duels') {
        const data = await api(`/duels?admin=true&requesterId=${user?.id}`)
        setDuels(data)
      }
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
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const deleteTournament = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return
    try {
      await api(`/tournaments/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ createdBy: user?.id })
      })
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const deleteDuel = async (id: number) => {
    if (!confirm('Are you sure you want to delete this duel room?')) return
    try {
      await api(`/duels/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: user?.id })
      })
      loadData()
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
      loadData()
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
      loadData()
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
      loadData()
      setEditingColorId(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const editAvatar = async (targetUser: User) => {
    const newAvatarUrl = prompt(`Enter avatar URL for ${targetUser.username}:`, targetUser.avatarUrl || '')
    if (newAvatarUrl === null) return

    try {
      await api(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          requesterId: user?.id,
          avatarUrl: newAvatarUrl
        })
      })
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading && !users.length && !tournaments.length && !duels.length) return <div className="p-8 text-center text-zinc-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            size="sm"
            onClick={async () => {
              if (!confirm('WARNING: This will delete ALL tournaments, matches, and participants. This action cannot be undone. Are you sure?')) return
              try {
                await api(`/admin/data?requesterId=${user?.id}`, { method: 'DELETE' })
                alert('All data deleted successfully')
                loadData()
              } catch (err: any) {
                alert(err.message)
              }
            }}
          >
            Delete All History Data
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={async () => {
              if (!confirm('WARNING: This will reset the MMR of ALL users to 1000. This action cannot be undone. Are you sure?')) return
              try {
                await api(`/admin/reset-leaderboard?requesterId=${user?.id}`, { method: 'POST' })
                alert('Leaderboard reset successfully')
                loadData()
              } catch (err: any) {
                alert(err.message)
              }
            }}
          >
            Reset Leaderboard
          </Button>
          <Button onClick={loadData} variant="outline" size="sm">Refresh</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-zinc-800 pb-1 overflow-x-auto no-scrollbar justify-center">
        <Button 
          variant={activeTab === 'users' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('users')}
          className="whitespace-nowrap"
        >
          Users
        </Button>
        <Button 
          variant={activeTab === 'tournaments' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('tournaments')}
          className="whitespace-nowrap"
        >
          Tournaments
        </Button>
        <Button 
          variant={activeTab === 'duels' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('duels')}
          className="whitespace-nowrap"
        >
          Duel Rooms
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded border border-red-500/20">
          {error}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="w-full">
          <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
            <table className="w-full text-left text-sm text-zinc-400 min-w-[800px]">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Avatar</th>
                <th className="px-4 py-3 font-medium">Display Name</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">MMR</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((u, index) => (
                <tr key={u.id} className="hover:bg-zinc-900/80">
                  <td className="px-4 py-3 font-mono">{u.id}</td>
                  <td className="px-4 py-3">
                    <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size="sm" />
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: u.color || '#ffffff' }}>
                    {u.displayName || '-'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    <Link to={`/users/${u.id}`} className="hover:underline hover:text-white">
                      {u.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{u.mmr}</td>
                  <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {editingColorId === u.id ? (
                      <div className="flex items-center justify-end gap-1">
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
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side={index >= users.length - 3 ? 'top' : 'bottom'}>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {u.id !== user?.id && (
                            <DropdownMenuItem onClick={() => toggleRole(u)}>
                              <Shield className="mr-2 h-4 w-4" />
                              {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => changePassword(u)}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editMMR(u)}>
                            <Trophy className="mr-2 h-4 w-4" />
                            Edit MMR
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startEditColor(u)}>
                            <Palette className="mr-2 h-4 w-4" />
                            Edit Color
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editAvatar(u)}>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Edit Avatar
                          </DropdownMenuItem>
                          {u.id !== user?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                variant="destructive"
                                onClick={() => deleteUser(u.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'tournaments' && (
        <div className="w-full">
          <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
            <table className="w-full text-left text-sm text-zinc-400 min-w-[800px]">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium">Participants</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {tournaments.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900/80">
                  <td className="px-4 py-3 font-mono">{t.id}</td>
                  <td className="px-4 py-3 font-bold text-white">
                    <Link to={`/tournaments/${t.id}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${
                      t.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      t.status === 'completed' ? 'bg-zinc-800 text-zinc-500' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{t.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar username={t.createdByName} displayName={t.createdByDisplayName} avatarUrl={t.createdByAvatarUrl} size="sm" />
                      <UserLabel username={t.createdByName} displayName={t.createdByDisplayName} color={t.createdByColor} />
                    </div>
                  </td>
                  <td className="px-4 py-3">{t.participantCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deleteTournament(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No tournaments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'duels' && (
        <div className="w-full">
          <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
            <table className="w-full text-left text-sm text-zinc-400 min-w-[800px]">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Player 1</th>
                <th className="px-4 py-3 font-medium">Player 2</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {duels.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-900/80">
                  <td className="px-4 py-3 font-mono">{d.id}</td>
                  <td className="px-4 py-3 font-bold text-white">
                    <Link to={`/duels/${d.id}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${
                      d.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      d.status === 'completed' ? 'bg-zinc-800 text-zinc-500' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar username={d.player1Name} displayName={d.player1DisplayName} avatarUrl={d.player1Avatar} size="sm" />
                      <UserLabel username={d.player1Name} displayName={d.player1DisplayName} color={d.player1Color} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {d.player2Id ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar username={d.player2Name} displayName={d.player2DisplayName} avatarUrl={d.player2Avatar} size="sm" />
                        <UserLabel username={d.player2Name} displayName={d.player2DisplayName} color={d.player2Color} />
                      </div>
                    ) : (
                      <span className="text-zinc-600 italic">Waiting...</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{d.result || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deleteDuel(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {duels.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No duel rooms found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
