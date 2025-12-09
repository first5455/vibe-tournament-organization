import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { UserLabel } from '../components/UserLabel'
import { UserAvatar } from '../components/UserAvatar'
import { useNavigate, Link } from 'react-router-dom'
import { Check, X, MoreVertical, Shield, Key, Trophy, Palette, Image as ImageIcon, Trash2, Edit2, Users, UserPlus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { UserSearchSelect } from '../components/UserSearchSelect'
import { CreateUserDialog } from '../components/CreateUserDialog'
import { User, Deck } from '../types'

const formatDate = (dateDict?: string) => {
  if (!dateDict) return ''
  return new Date(dateDict).toLocaleString()
}



export default function AdminPortal() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'tournaments' | 'duels'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [duels, setDuels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingColorId, setEditingColorId] = useState<number | null>(null)
  const [tempColor, setTempColor] = useState('')
  const [editDuelOpen, setEditDuelOpen] = useState(false)
  const [editingDuel, setEditingDuel] = useState<any>(null)
  const [editDuelForm, setEditDuelForm] = useState({
    player1Score: 0,
    player2Score: 0,
    player1Note: '',
    player2Note: '',
    player1Id: 0,
    player2Id: 0 as number | null,
    player1DeckId: undefined as number | undefined,
    player2DeckId: undefined as number | undefined,
    status: 'open'
  })
  const [player1Decks, setPlayer1Decks] = useState<Deck[]>([])
  const [player2Decks, setPlayer2Decks] = useState<Deck[]>([])
  const [createDuelOpen, setCreateDuelOpen] = useState(false)
  const [createDuelForm, setCreateDuelForm] = useState({
    name: '',
    player1Id: 0 as number | null,
    player2Id: 0 as number | null
  })
  
  // Tournament Management State
  const [editingTournament, setEditingTournament] = useState<any>(null)
  const [editTournamentOpen, setEditTournamentOpen] = useState(false)
  const [editTournamentForm, setEditTournamentForm] = useState({
    name: '',
    status: 'pending' as 'pending' | 'active' | 'completed'
  })
  
  const [managingParticipants, setManagingParticipants] = useState<any>(null)
  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [currentParticipants, setCurrentParticipants] = useState<any[]>([])
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)

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
      if (user?.id === targetUser.id) {
        refreshUser()
      }
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
    const newMMR = prompt(`Enter new MMR for ${targetUser.username}:`, (targetUser.mmr || 1000).toString())
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
      if (user?.id === targetUser.id) {
        refreshUser()
      }
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
      if (user?.id === targetUser.id) {
        refreshUser()
      }
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
      if (user?.id === targetUser.id) {
        refreshUser()
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const openEditDuel = (duel: any) => {
    setEditingDuel(duel)
    const [s1, s2] = duel.result ? duel.result.split('-') : ['0', '0']
    setEditDuelForm({
      player1Score: parseInt(s1),
      player2Score: parseInt(s2),
      player1Note: duel.player1Note || '',
      player2Note: duel.player2Note || '',
      player1Id: duel.player1Id,
      player2Id: duel.player2Id,
      player1DeckId: duel.player1DeckId,
      player2DeckId: duel.player2DeckId,
      status: duel.status
    })
    
    // Fetch decks
    if (duel.player1Id) {
        api(`/decks?userId=${duel.player1Id}`).then(setPlayer1Decks).catch(console.error)
    } else {
        setPlayer1Decks([])
    }
    if (duel.player2Id) {
        api(`/decks?userId=${duel.player2Id}`).then(setPlayer2Decks).catch(console.error)
    } else {
        setPlayer2Decks([])
    }

    setEditDuelOpen(true)
  }

  const handleSaveDuel = async () => {
    if (!editingDuel) return
    if (!editingDuel) return
    try {
      if (!user?.id) {
        alert('User ID missing')
        return
      }
      await api(`/duels/${editingDuel.id}/admin-update`, {
        method: 'PUT',
        body: JSON.stringify({
          userId: user?.id,
          player1Score: editDuelForm.status === 'completed' ? editDuelForm.player1Score : undefined,
          player2Score: editDuelForm.status === 'completed' ? editDuelForm.player2Score : undefined,
          player1Note: editDuelForm.player1Note,
          player2Note: editDuelForm.player2Note,
          player1Id: editDuelForm.player1Id,
          player2Id: editDuelForm.player2Id || null,
          player1DeckId: editDuelForm.player1DeckId,
          player2DeckId: editDuelForm.player2DeckId,
          status: editDuelForm.status
        })
      })
      setEditDuelOpen(false)
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCreateDuel = async () => {
    if (!createDuelForm.player1Id) {
      alert('Player 1 is required')
      return
    }

    try {
      let roomName = createDuelForm.name.trim() 

      if (!roomName) {
        const timeRes = await api('/time')
        roomName = timeRes.formatted
      }

      await api('/duels', {
        method: 'POST',
        body: JSON.stringify({
          name: roomName,
          createdBy: user?.id,
          player1Id: createDuelForm.player1Id,
          player2Id: createDuelForm.player2Id || undefined
        })
      })
      setCreateDuelOpen(false)
      setCreateDuelForm({ name: '', player1Id: null, player2Id: null })
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const openEditTournament = (t: any) => {
    setEditingTournament(t)
    setEditTournamentForm({
      name: t.name,
      status: t.status
    })
    setEditTournamentOpen(true)
  }

  const saveTournament = async () => {
    if (!editingTournament) return
    try {
      await api(`/tournaments/${editingTournament.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          name: editTournamentForm.name,
          // Status update might need separate endpoint if it has complex logic, but for now assuming simple update or manual db update via same put if supported, 
          // actually existing PUT only updates name. We might need to allow status update for admin.
          // Let's modify the frontend to just update name for now, or if we want status, we need to check backend.
          // Backend PUT /:id only updates name.
          // To update status, we usually use start/stop endpoints. 
          // But as admin we might want to force status.
          // Let's stick to name for now to be safe, or just name.
          createdBy: user?.id
        })
      })
      setEditTournamentOpen(false)
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const openManageParticipants = async (t: any) => {
    setManagingParticipants(t)
    setParticipantsOpen(true)
    loadParticipants(t.id)
  }

  const loadParticipants = async (tournamentId: number) => {
    try {
      const data = await api(`/tournaments/${tournamentId}/participants`)
      setCurrentParticipants(data)
    } catch (err: any) {
      console.error(err)
    }
  }

  const removeParticipant = async (participantId: number) => {
    if (!confirm('Remove this participant?')) return
    if (!managingParticipants) return

    try {
      await api(`/tournaments/${managingParticipants.id}/participants/${participantId}`, {
        method: 'DELETE',
        body: JSON.stringify({ createdBy: user?.id })
      })
      loadParticipants(managingParticipants.id)
      loadData() // To update participant count
    } catch (err: any) {
      alert(err.message)
    }
  }

  const addRegisteredParticipant = async (userToAdd: { id: number }) => {
    if (!managingParticipants) return
    try {
      await api(`/tournaments/${managingParticipants.id}/participants`, {
        method: 'POST',
        body: JSON.stringify({ userId: userToAdd.id, createdBy: user?.id })
      })
      setShowAddParticipant(false)
      loadParticipants(managingParticipants.id)
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const addGuestParticipant = async () => {
    if (!managingParticipants) return
    const name = prompt('Enter guest name:')
    if (!name) return

    try {
      await api(`/tournaments/${managingParticipants.id}/guests`, {
        method: 'POST',
        body: JSON.stringify({ name, createdBy: user?.id })
      })
      loadParticipants(managingParticipants.id)
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
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white">Users</h2>
             <Button onClick={() => setShowCreateUser(true)}>
               <UserPlus className="mr-2 h-4 w-4" />
               Create User
             </Button>
          </div>
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
                  <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
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
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-zinc-400 hover:text-white"
                      title="Edit Tournament"
                      onClick={() => openEditTournament(t)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-zinc-400 hover:text-white"
                      title="Manage Participants"
                      onClick={() => openManageParticipants(t)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
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
          <div className="flex justify-end mb-4">
            <Button onClick={() => {
              setCreateDuelForm({
                name: '',
                player1Id: null,
                player2Id: null
              })
              setCreateDuelOpen(true)
            }}>Create Duel Room</Button>
          </div>
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
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <UserAvatar username={d.player1Name} displayName={d.player1DisplayName} avatarUrl={d.player1Avatar} size="sm" />
                        <UserLabel username={d.player1Name} displayName={d.player1DisplayName} color={d.player1Color} />
                      </div>
                      {d.player1Note && (
                        <div className="text-xs text-zinc-500 italic ml-8 truncate max-w-[200px]" title={d.player1Note}>
                          Note: {d.player1Note}
                        </div>
                      )}
                      {d.player1DeckName && (
                        <div className="ml-8 mt-1 flex items-center gap-1">
                             <span className="text-xs text-zinc-500 font-medium">Deck:</span>
                             {d.player1DeckLink ? (
                                <a href={d.player1DeckLink} target="_blank" rel="noreferrer" className="text-xs font-medium hover:underline" style={{ color: d.player1DeckColor || '#fff' }}>
                                    {d.player1DeckName}
                                </a>
                            ) : (
                                <span className="text-xs font-medium" style={{ color: d.player1DeckColor || '#fff' }}>
                                    {d.player1DeckName}
                                </span>
                            )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {d.player2Id ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <UserAvatar username={d.player2Name} displayName={d.player2DisplayName} avatarUrl={d.player2Avatar} size="sm" />
                          <UserLabel username={d.player2Name} displayName={d.player2DisplayName} color={d.player2Color} />
                        </div>
                        {d.player2Note && (
                          <div className="text-xs text-zinc-500 italic ml-8 truncate max-w-[200px]" title={d.player2Note}>
                            Note: {d.player2Note}
                          </div>
                        )}
                        {d.player2DeckName && (
                            <div className="ml-8 mt-1 flex items-center gap-1">
                                 <span className="text-xs text-zinc-500 font-medium">Deck:</span>
                                 {d.player2DeckLink ? (
                                    <a href={d.player2DeckLink} target="_blank" rel="noreferrer" className="text-xs font-medium hover:underline" style={{ color: d.player2DeckColor || '#fff' }}>
                                        {d.player2DeckName}
                                    </a>
                                ) : (
                                    <span className="text-xs font-medium" style={{ color: d.player2DeckColor || '#fff' }}>
                                        {d.player2DeckName}
                                    </span>
                                )}
                            </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600 italic">Waiting...</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{d.result || '-'}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-zinc-400 hover:text-white"
                      onClick={() => openEditDuel(d)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
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

      {/* Edit Duel Dialog */}
      {editDuelOpen && editingDuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Edit Duel</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Player 1</label>
              <div className="text-sm text-zinc-300 mb-1">
                Current ID: {editDuelForm.player1Id}
              </div>
              <UserSearchSelect 
                placeholder="Search to change Player 1..."
                initialValue={editingDuel.player1DisplayName || editingDuel.player1Name}
                onSelect={(user) => {
                    setEditDuelForm({...editDuelForm, player1Id: user.id})
                    api(`/decks?userId=${user.id}`).then(setPlayer1Decks).catch(console.error)
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Player 1 Deck</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                value={editDuelForm.player1DeckId || ''}
                onChange={e => setEditDuelForm({...editDuelForm, player1DeckId: e.target.value ? parseInt(e.target.value) : undefined})}
              >
                <option value="">No Deck</option>
                {player1Decks.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Player 2 (Optional)</label>
              <div className="text-sm text-zinc-300 mb-1">
                Current ID: {editDuelForm.player2Id || 'None'}
              </div>
              <UserSearchSelect 
                placeholder="Search to change Player 2..."
                initialValue={editingDuel.player2DisplayName || editingDuel.player2Name || ''}
                onSelect={(user) => {
                    setEditDuelForm({...editDuelForm, player2Id: user.id})
                    api(`/decks?userId=${user.id}`).then(setPlayer2Decks).catch(console.error)
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Player 2 Deck</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                value={editDuelForm.player2DeckId || ''}
                onChange={e => setEditDuelForm({...editDuelForm, player2DeckId: e.target.value ? parseInt(e.target.value) : undefined})}
              >
                <option value="">No Deck</option>
                {player2Decks.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                ))}
              </select>
            </div>

            {editDuelForm.status === 'completed' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Score</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                    value={editDuelForm.player1Score}
                    onChange={e => setEditDuelForm({...editDuelForm, player1Score: parseInt(e.target.value)})}
                  />
                  <span className="text-zinc-500">-</span>
                  <input 
                    type="number" 
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                    value={editDuelForm.player2Score}
                    onChange={e => setEditDuelForm({...editDuelForm, player2Score: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Note for Player 1</label>
              <textarea 
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white min-h-[60px]"
                value={editDuelForm.player1Note}
                onChange={e => setEditDuelForm({...editDuelForm, player1Note: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Note for Player 2</label>
              <textarea 
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white min-h-[60px]"
                value={editDuelForm.player2Note}
                onChange={e => setEditDuelForm({...editDuelForm, player2Note: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setEditDuelOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveDuel}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
      {/* Create Duel Dialog */}
      {createDuelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Create Duel Room</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Room Name (Optional)</label>
              <input 
                type="text" 
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                placeholder="Default: DD-MM-YYYY HH:mm"
                value={createDuelForm.name}
                onChange={e => setCreateDuelForm({...createDuelForm, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Player 1 (Required)</label>
              <UserSearchSelect 
                onSelect={(user) => setCreateDuelForm({...createDuelForm, player1Id: user.id})}
                placeholder="Search for Player 1..."
              />
              {createDuelForm.player1Id && (
                <div className="text-xs text-green-400">Selected ID: {createDuelForm.player1Id}</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Player 2 (Optional)</label>
              <UserSearchSelect 
                onSelect={(user) => setCreateDuelForm({...createDuelForm, player2Id: user.id})}
                placeholder="Search for Player 2..."
              />
              {createDuelForm.player2Id && (
                <div className="text-xs text-green-400">Selected ID: {createDuelForm.player2Id}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setCreateDuelOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateDuel} disabled={!createDuelForm.player1Id}>Create Room</Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Tournament Dialog */}
      {editTournamentOpen && editingTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Edit Tournament: {editingTournament.name}</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Name</label>
              <input 
                type="text" 
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
                value={editTournamentForm.name}
                onChange={e => setEditTournamentForm({...editTournamentForm, name: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setEditTournamentOpen(false)}>Cancel</Button>
              <Button onClick={saveTournament}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Participants Dialog */}
      {participantsOpen && managingParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Participants: {managingParticipants.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setParticipantsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                 onClick={() => setShowAddParticipant(!showAddParticipant)} 
                 variant={showAddParticipant ? "secondary" : "outline"}
                 size="sm"
              >
                Add Registered User
              </Button>
              <Button onClick={addGuestParticipant} variant="outline" size="sm">
                Add Guest
              </Button>
            </div>

            {showAddParticipant && (
              <div className="p-4 bg-zinc-950/50 rounded border border-zinc-800 space-y-2">
                <label className="text-sm font-medium text-zinc-400">Search User</label>
                <UserSearchSelect 
                  onSelect={addRegisteredParticipant} 
                  placeholder="Search user to add..."
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto border rounded border-zinc-800">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-zinc-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {currentParticipants.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-900/50">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <UserAvatar username={p.username || p.guestName} displayName={p.displayName} avatarUrl={p.userAvatarUrl} size="sm" className="h-6 w-6" />
                          <UserLabel username={p.username || p.guestName} displayName={p.displayName} color={p.userColor} />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {p.dropped ? <span className="text-red-500">Dropped</span> : <span className="text-green-500">Active</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => removeParticipant(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {currentParticipants.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">No participants</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      <CreateUserDialog 
        isOpen={showCreateUser} 
        onClose={() => setShowCreateUser(false)} 
        onSuccess={() => loadData()}
        requesterId={user?.id || 0}
      />
    </div>
  )
}
