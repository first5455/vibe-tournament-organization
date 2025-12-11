import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { RoleManagement } from '../components/admin/RoleManagement'
import { ChangeRoleDialog } from '../components/admin/ChangeRoleDialog'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { UserLabel } from '../components/UserLabel'
import { UserAvatar } from '../components/UserAvatar'
import { useNavigate, Link } from 'react-router-dom'
import { Check, X, MoreVertical, Shield, Key, Trophy, Palette, Image as ImageIcon, Trash2, Edit2, Users, UserPlus, RefreshCw, Plus } from 'lucide-react'
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
import { useGame } from '../contexts/GameContext'
import { EditMMRDialog } from '../components/EditMMRDialog'

import { DeckModal } from '../components/DeckModal'
import { User, Deck } from '../types'

interface AdminDeck extends Deck {
  username?: string
  displayName?: string
  userAvatarUrl?: string
  winRate?: number
  totalGames?: number
}

const formatDate = (dateDict?: string) => {
  if (!dateDict) return ''
  return new Date(dateDict).toLocaleString()
}



export default function AdminPortal() {
  const { user, refreshUser, hasPermission, isLoading: authLoading } = useAuth()
  const { refreshGames } = useGame()
  const [activeTab, setActiveTab] = useState<'users' | 'tournaments' | 'duels' | 'decks' | 'games' | 'settings' | 'roles'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])

  const [duels, setDuels] = useState<any[]>([])
  const [decks, setDecks] = useState<AdminDeck[]>([])
  const [games, setGames] = useState<any[]>([])
  const [availableRoles, setAvailableRoles] = useState<{id: number, name: string, isSystem: boolean}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingColorId, setEditingColorId] = useState<number | null>(null)
  const [filterGameId, setFilterGameId] = useState<string>('all')
  
  // Games Management State
  const [gameModalOpen, setGameModalOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<any>(null)
  const [gameForm, setGameForm] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: ''
  })

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    defaultRoleId: undefined as number | undefined
  })

  // Settings Save Handler
  const saveSettings = async () => {
    try {
        await api('/settings', {
            method: 'POST',
            body: JSON.stringify({
                userId: user?.id,
                maintenanceMode: settingsForm.maintenanceMode,
                maintenanceMessage: settingsForm.maintenanceMessage,
                defaultRoleId: settingsForm.defaultRoleId
            })
        })
        alert('Settings saved successfully')
    } catch (err: any) {
        alert(err.message)
    }
  }

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
  const [editMMRDialogIsOpen, setEditMMRDialogIsOpen] = useState(false)
  const [editMMRUser, setEditMMRUser] = useState<User | null>(null)

  // Deck Management State
  const [deckModalOpen, setDeckModalOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<AdminDeck | null>(null)

  const [createDeckUserId, setCreateDeckUserId] = useState<number | null>(null)

  const [changeRoleOpen, setChangeRoleOpen] = useState(false)
  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    console.log('AdminPortal Effect:', { authLoading, user, permissions: user?.permissions })
    if (authLoading) return

    if (!user) {
      navigate('/login')
      return
    }

    const canAccess = hasPermission('admin.access')
    if (!canAccess) {
      navigate('/')
      return
    }
    loadData()
  }, [user, authLoading, activeTab, filterGameId])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'users') {
        const query = filterGameId !== 'all' ? `&gameId=${filterGameId}` : ''
        const data = await api(`/users?requesterId=${user?.id}${query}`)
        setUsers(data.users)
      } else if (activeTab === 'tournaments') {
        const query = filterGameId !== 'all' ? `?gameId=${filterGameId}` : ''
        const data = await api(`/tournaments${query}`)
        setTournaments(data)
      } else if (activeTab === 'duels') {
        const query = filterGameId !== 'all' ? `&gameId=${filterGameId}` : ''
        const data = await api(`/duels?admin=true&requesterId=${user?.id}${query}`)
        setDuels(data)
      } else if (activeTab === 'decks') {
        const query = filterGameId !== 'all' ? `?gameId=${filterGameId}` : ''
        const data = await api(`/decks${query}`)
        setDecks(data)
      } else if (activeTab === 'games') {
        const data = await api('/games')
        setGames(data)
      } else if (activeTab === 'settings') {
        const data = await api('/settings')
        const rolesData = await api('/roles')
        setSettingsForm({
            maintenanceMode: data.maintenanceMode,
            maintenanceMessage: data.maintenanceMessage,
            defaultRoleId: data.defaultRoleId
        })
        setAvailableRoles(rolesData)
      }
      
      // Always fetch games for filter list if we don't have them
      if (games.length === 0) {
          const gamesData = await api('/games')
          setGames(gamesData)
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

  const editMMR = (targetUser: User) => {
    setEditMMRUser(targetUser)
    setEditMMRDialogIsOpen(true)
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Context:</span>
            <select
              className="bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
              value={filterGameId}
              onChange={(e) => setFilterGameId(e.target.value)}
            >
              <option value="all">All Games (Global)</option>
              {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-zinc-800 rounded-lg p-4 bg-zinc-900/30">
            {/* Global Actions */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    {filterGameId === 'all' ? 'System-Wide Actions' : 'Global Actions'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {hasPermission('settings.manage') && (
                    <>
                    <Button 
                        className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-900"
                        size="sm"
                        onClick={async () => {
                        if (!confirm('CRITICAL WARNING:\nThis will delete ALL matches, tournaments, and history for ALL GAMES.\nUser accounts will be preserved but their stats reset.\n\nAre you sure you want to proceed?')) return
                        try {
                            await api(`/admin/data?requesterId=${user?.id}`, { method: 'DELETE' })
                            alert('System-wide data wipe successful')
                            loadData()
                        } catch (err: any) {
                            alert(err.message)
                        }
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ALL History
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm"
                        className="border border-zinc-700"
                        onClick={async () => {
                        if (!confirm('WARNING: This will reset MMR for ALL users in ALL games to 1000.\n\nAre you sure?')) return
                        try {
                            await api(`/admin/reset-leaderboard?requesterId=${user?.id}`, { method: 'POST' })
                            alert('Global Leaderboard reset successful')
                            loadData()
                        } catch (err: any) {
                            alert(err.message)
                        }
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset All MMR
                    </Button>
                    </>
                  )}
                </div>
            </div>

            {/* Game Specific Actions */}
            <div className={`space-y-2 ${filterGameId === 'all' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
                   {filterGameId === 'all' ? 'Select a Game to Enable' : `Actions for ${games.find(g=>g.id.toString()===filterGameId)?.name || 'Game'}`}
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        className="bg-orange-900/50 hover:bg-orange-800 text-orange-200 border border-orange-900"
                        size="sm"
                        disabled={filterGameId === 'all'}
                        onClick={async () => {
                            if (filterGameId === 'all') return
                            const gameName = games.find(g => g.id.toString() === filterGameId)?.name
                            if (!confirm(`WARNING:\nThis will delete history only for "${gameName}".\nMatches and Tournaments for this game will be wiped.\nUser MMR for this game will be reset.\n\nAre you sure?`)) return
                            try {
                                await api(`/admin/data?requesterId=${user?.id}&gameId=${filterGameId}`, { method: 'DELETE' })
                                alert(`History for ${gameName} deleted successfully`)
                                loadData()
                            } catch (err: any) {
                                alert(err.message)
                            }
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Wipe Game History
                    </Button>
                    <Button 
                        variant="secondary"
                        size="sm"
                        className="border border-zinc-700"
                        disabled={filterGameId === 'all'}
                        onClick={async () => {
                            if (filterGameId === 'all') return
                            const gameName = games.find(g => g.id.toString() === filterGameId)?.name
                            if (!confirm(`This will reset MMR for all users in "${gameName}" to 1000.\n\nAre you sure?`)) return
                            try {
                                await api(`/admin/reset-leaderboard?requesterId=${user?.id}&gameId=${filterGameId}`, { method: 'POST' })
                                alert(`MMR for ${gameName} reset successfully`)
                                loadData()
                            } catch (err: any) {
                                alert(err.message)
                            }
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Game MMR
                    </Button>
                </div>
            </div>
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
        <Button 
          variant={activeTab === 'decks' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('decks')}
          className="whitespace-nowrap"
        >
          Decks
        </Button>
        <Button 
          variant={activeTab === 'games' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('games')}
          className="whitespace-nowrap"
        >
          Games
        </Button>
        <Button 
          variant={activeTab === 'roles' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('roles')}
          className="whitespace-nowrap"
        >
          Roles
        </Button>
        <Button 
          variant={activeTab === 'settings' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('settings')}
          className="whitespace-nowrap"
        >
          Settings
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded border border-red-500/20">
          {error}
        </div>
      )}
      {activeTab === 'roles' && (
        <RoleManagement />
      )}
      
      <ChangeRoleDialog 
        isOpen={changeRoleOpen} 
        onClose={() => setChangeRoleOpen(false)} 
        user={userToChangeRole}
        onSuccess={() => {
            loadData()
            refreshUser()
        }}
      />

      {activeTab === 'users' && (
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white">Users</h2>
             {(hasPermission('users.manage')) && (
               <Button onClick={() => setShowCreateUser(true)}>
                 <UserPlus className="mr-2 h-4 w-4" />
                 Create User
               </Button>
             )}
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
                    <span className={`px-2 py-1 rounded text-xs ${u.assignedRole?.name === 'Admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                      {u.assignedRole?.name || 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {filterGameId !== 'all' && u.stats 
                        ? (u.stats.find(s => s.gameId === parseInt(filterGameId))?.mmr ?? '-') 
                        : '-'}
                  </td>
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
                          {(hasPermission('users.manage')) && (
                            <>
                              {u.id !== user?.id ? (
                                <DropdownMenuItem onClick={() => {
                                    setUserToChangeRole(u)
                                    setChangeRoleOpen(true)
                                }}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                              ) : null}
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
                <th className="px-4 py-3 font-medium">Winner</th>
                <th className="px-4 py-3 font-medium">Game</th>
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
                  <td className="px-4 py-3">
                    {t.winnerName ? (
                        <div className="flex items-center gap-2">
                        <UserAvatar username={t.winnerName} displayName={t.winnerDisplayName} avatarUrl={t.winnerAvatarUrl} size="sm" />
                        <UserLabel username={t.winnerName} displayName={t.winnerDisplayName} color={t.winnerColor} />
                        </div>
                    ) : (
                        <span className="text-zinc-500 italic">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{t.gameName}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    {(hasPermission('tournaments.manage')) && (
                      <>
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
                      </>
                    )}
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
            {(hasPermission('duels.manage')) && (
              <Button onClick={() => {
                setCreateDuelForm({
                  name: '',
                  player1Id: null,
                  player2Id: null
                })
                setCreateDuelOpen(true)
              }}>Create Duel Room</Button>
            )}
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
                <th className="px-4 py-3 font-medium">Game</th>
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
                        {d.firstPlayerId === d.player1Id && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1 rounded border border-zinc-700" title="Went First">1st</span>
                        )}
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
                          {d.firstPlayerId === d.player2Id && (
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1 rounded border border-zinc-700" title="Went First">1st</span>
                          )}
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
                      <span className="text-zinc-500 italic">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{d.gameName}</td>
                  <td className="px-4 py-3 font-mono">
                    {d.status === 'completed' ? (
                      <span className="font-bold">
                        {d.result || '-'}
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(hasPermission('duels.manage')) && (
                      <div className="flex justify-end gap-2">
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
                      </div>
                    )}
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

      {activeTab === 'decks' && (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white">All Decks</h2>
                    <span className="text-zinc-500 text-sm">{decks.length} total</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="w-full sm:w-64">
                         <UserSearchSelect 
                             onSelect={(u) => setCreateDeckUserId(u.id)}
                             placeholder="Select user to create deck..."
                         />
                    </div>
                    <Button 
                        disabled={!createDeckUserId}
                        onClick={() => {
                             setEditingDeck(null)
                             setDeckModalOpen(true)
                        }}
                        className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Deck
                    </Button>
                </div>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
                <table className="w-full text-left text-sm text-zinc-400 min-w-[800px]">
                    <thead className="bg-zinc-900 text-zinc-200">
                        <tr>
                            <th className="px-4 py-3 font-medium">ID</th>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Owner</th>
                            <th className="px-4 py-3 font-medium">Stats</th>
                            <th className="px-4 py-3 font-medium">Created</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {decks.map(deck => (
                            <tr key={deck.id} className="hover:bg-zinc-900/80">
                                <td className="px-4 py-3 font-mono">{deck.id}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: deck.color }}></div>
                                        <span className="font-medium text-white">{deck.name}</span>
                                        {deck.link && (
                                            <a href={deck.link} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-blue-400">
                                                <Users className="w-3 h-3" /> {/* Using Users icon as generic link icon for now or external link */}
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <UserAvatar username={deck.username || '?'} displayName={deck.displayName} avatarUrl={deck.userAvatarUrl} size="sm" />
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{deck.displayName || deck.username}</span>
                                            <span className="text-xs text-zinc-500">#{deck.userId}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${
                                            (deck.winRate || 0) >= 50 ? 'text-green-400' : 'text-zinc-500'
                                        }`}>
                                            {deck.winRate || 0}%
                                        </span>
                                        <span className="text-zinc-600 text-xs">
                                            ({deck.totalGames || 0} games)
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{formatDate(deck.createdAt)}</td>
                                <td className="px-4 py-3 text-right">
                                    {(hasPermission('decks.manage')) && (
                                      <div className="flex justify-end gap-2">
                                          <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="text-zinc-400 hover:text-white"
                                              onClick={() => {
                                                  setEditingDeck(deck)
                                                  setDeckModalOpen(true)
                                              }}
                                          >
                                              <Edit2 className="h-4 w-4" />
                                          </Button>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                              onClick={async () => {
                                                  if (!confirm('Delete this deck?')) return
                                                  try {
                                                      await api(`/decks/${deck.id}`, {
                                                          method: 'DELETE',
                                                          body: JSON.stringify({ requesterId: user?.id })
                                                      })
                                                      loadData()
                                                  } catch (e: any) {
                                                      alert(e.message)
                                                  }
                                              }}
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                         {decks.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No decks found</td>
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


      {activeTab === 'games' && (
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white">Games</h2>
             {hasPermission('games.manage') && (
              <Button onClick={() => {
               setEditingGame(null)
               setGameForm({ name: '', slug: '', description: '', imageUrl: '' })
               setGameModalOpen(true)
             }}>
               <Plus className="mr-2 h-4 w-4" />
               Add Game
             </Button>
             )}
          </div>
          <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
            <table className="w-full text-left text-sm text-zinc-400 min-w-[800px]">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Image</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">URL Identifier</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {games.map((g) => (
                <tr key={g.id} className="hover:bg-zinc-900/80">
                  <td className="px-4 py-3 font-mono">{g.id}</td>
                  <td className="px-4 py-3">
                    {g.imageUrl && <img src={g.imageUrl} alt={g.name} className="h-8 w-8 rounded object-cover" />}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{g.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{g.slug}</td>
                  <td className="px-4 py-3 truncate max-w-xs">{g.description}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    {hasPermission('games.manage') && (
                    <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-zinc-400 hover:text-white"
                      onClick={() => {
                        setEditingGame(g)
                        setGameForm({
                          name: g.name,
                          slug: g.slug,
                          description: g.description || '',
                          imageUrl: g.imageUrl || ''
                        })
                        setGameModalOpen(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete this game?')) return
                        try {
                          await api(`/games/${g.id}?requesterId=${user?.id}`, { method: 'DELETE' })
                          loadData()
                          await refreshGames()
                        } catch (err: any) {
                          alert(err.message)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    </>
                    )}
                  </td>
                </tr>
              ))}
              {games.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No games found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Game Modal */}
      {gameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-white">{editingGame ? 'Edit Game' : 'Add Game'}</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Name</label>
                <input
                  type="text"
                  value={gameForm.name}
                  onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">URL Identifier</label>
                <input
                  type="text"
                  value={gameForm.slug}
                  onChange={(e) => setGameForm({ ...gameForm, slug: e.target.value })}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Description</label>
                <textarea
                  value={gameForm.description}
                  onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400">Image URL</label>
                <input
                  type="text"
                  value={gameForm.imageUrl}
                  onChange={(e) => setGameForm({ ...gameForm, imageUrl: e.target.value })}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setGameModalOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    if (editingGame) {
                      await api(`/games/${editingGame.id}?requesterId=${user?.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(gameForm)
                      })
                    } else {
                      await api(`/games?requesterId=${user?.id}`, {
                        method: 'POST',
                        body: JSON.stringify(gameForm)
                      })
                    }
                    setGameModalOpen(false)
                    loadData()
                    await refreshGames()
                  } catch (err: any) {
                    alert(err.message)
                  }
                }}>{editingGame ? 'Save Changes' : 'Create Game'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <CreateUserDialog 
        isOpen={showCreateUser} 
        onClose={() => setShowCreateUser(false)}
        onSuccess={() => {
          setShowCreateUser(false)
          loadData()
        }}
        requesterId={user?.id || 0}
      />
      <EditMMRDialog 
        isOpen={editMMRDialogIsOpen}
        onClose={() => setEditMMRDialogIsOpen(false)}
        onSuccess={() => {
            loadData()
            refreshUser()
        }}
        user={editMMRUser}
        games={games}
        requesterId={user?.id || 0}
        initialGameId={filterGameId}
      />

      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-white mb-6">System Settings</h2>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                             <Shield className="h-5 w-5 text-indigo-500" />
                             Maintenance Mode
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                            When enabled, only administrators can access the site. All other users will be redirected to the maintenance page.
                        </p>
                    </div>
                    <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settingsForm.maintenanceMode}
                                onChange={(e) => setSettingsForm({...settingsForm, maintenanceMode: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Maintenance Message</label>
                    <textarea 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={settingsForm.maintenanceMessage}
                        onChange={(e) => setSettingsForm({...settingsForm, maintenanceMessage: e.target.value})}
                        placeholder="Enter a message to display to users..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Default User Role</label>
                    <p className="text-xs text-zinc-500 mb-2">Role assigned to new users upon registration.</p>
                    <select
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={settingsForm.defaultRoleId || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, defaultRoleId: e.target.value ? parseInt(e.target.value) : undefined})}
                    >
                        <option value="">No Default Role (Guest)</option>
                        {availableRoles.filter(role => role.isSystem).map(role => (
                             <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-end">
                    <Button onClick={saveSettings}>
                        Save Settings
                    </Button>
                </div>


                <div className="pt-8 border-t border-zinc-800">
                    <h3 className="text-lg font-bold text-white mb-4">Session Management</h3>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                        <h4 className="font-medium text-red-500 mb-2">Force Global Re-login</h4>
                        <p className="text-sm text-zinc-400 mb-4">
                            This will invalidate all current user sessions and force everyone to log in again. 
                            Use this when you have updated permissions and valid immediate refresh is required.
                        </p>
                        <Button 
                            variant="destructive"
                            onClick={async () => {
                                if (!confirm('Are you sure? This will log out ALL users immediately.')) return
                                try {
                                    await api(`/admin/force-logout-all?requesterId=${user?.id}`, { method: 'POST' })
                                    alert('All users have been forced to re-login.')
                                } catch (e: any) {
                                    alert(e.message)
                                }
                            }}
                        >
                            Force Logout All Users
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modals and Dialogs */}
      {/* Create User Dialog */}
      <CreateUserDialog 
        isOpen={showCreateUser} 
        onClose={() => setShowCreateUser(false)}
        onSuccess={loadData}
        requesterId={user?.id || 0}
      />
      
      {/* Edit MMR Dialog */}
      <EditMMRDialog
        isOpen={editMMRDialogIsOpen}
        onClose={() => setEditMMRDialogIsOpen(false)}
        user={editMMRUser}
        onSuccess={loadData}
        games={games}
        requesterId={user?.id || 0}
        initialGameId={filterGameId}
      />

      {/* Edit Tournament Dialog */}
      {editingTournament && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${editTournamentOpen ? '' : 'hidden'}`}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Edit Tournament</h2>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Name</label>
              <input
                type="text"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                value={editTournamentForm.name}
                onChange={(e) => setEditTournamentForm({ ...editTournamentForm, name: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditTournamentOpen(false)}>Cancel</Button>
              <Button onClick={saveTournament}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Participants Dialog */}
      {managingParticipants && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${participantsOpen ? '' : 'hidden'}`}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Manage Participants: {managingParticipants.name}</h2>
              <Button variant="ghost" size="icon" onClick={() => setParticipantsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                 <Button variant="secondary" className="w-full" onClick={() => setShowAddParticipant(!showAddParticipant)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Registered User
                 </Button>
                 {showAddParticipant && (
                    <div className="absolute top-full left-0 w-full mt-2 z-10 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2">
                        <UserSearchSelect 
                            onSelect={addRegisteredParticipant}
                            placeholder="Search user to add..."
                        />
                    </div>
                 )}
              </div>
              <Button variant="outline" onClick={addGuestParticipant}>
                <Plus className="mr-2 h-4 w-4" />
                Add Guest
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px]">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {currentParticipants.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-2">{p.id}</td>
                      <td className="px-4 py-2 font-medium text-white">
                        {p.userId ? (
                           <div className="flex items-center gap-2">
                             <UserAvatar username={p.username} avatarUrl={p.userAvatarUrl} size="sm" className="h-6 w-6" />
                             {p.displayName || p.username}
                           </div>
                        ) : (
                            <span className="italic">{p.guestName} (Guest)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{p.userId ? 'User' : 'Guest'}</td>
                      <td className="px-4 py-2 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-red-400 hover:text-red-300"
                          onClick={() => removeParticipant(p.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {currentParticipants.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-center py-8 text-zinc-500">No participants yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Duel Dialog */}
      {createDuelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Create Duel Room</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Room Name</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  placeholder="Leave empty for auto-generated name"
                  value={createDuelForm.name}
                  onChange={(e) => setCreateDuelForm({ ...createDuelForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Player 1 (Required)</label>
                <div className="w-full">
                    <UserSearchSelect 
                        onSelect={(u) => setCreateDuelForm({ ...createDuelForm, player1Id: u.id })}
                        placeholder="Search Player 1..."
                        initialValue={createDuelForm.player1Id ? (users.find(u => u.id === createDuelForm.player1Id)?.displayName || users.find(u => u.id === createDuelForm.player1Id)?.username) : undefined}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Player 2 (Optional)</label>
                <div className="w-full">
                     <UserSearchSelect 
                        onSelect={(u) => setCreateDuelForm({ ...createDuelForm, player2Id: u.id })}
                        placeholder="Search Player 2..."
                        initialValue={createDuelForm.player2Id ? (users.find(u => u.id === createDuelForm.player2Id)?.displayName || users.find(u => u.id === createDuelForm.player2Id)?.username) : undefined}
                    />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateDuelOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateDuel}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Duel Dialog */}
      {editDuelOpen && editingDuel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white">Edit Duel: {editingDuel.name}</h2>
            
            <div className="space-y-4">
               {/* Participants */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Player 1</label>
                      <UserSearchSelect 
                          onSelect={(u) => { 
                              setEditDuelForm({ ...editDuelForm, player1Id: u.id }) 
                              // Refresh decks if player changes
                              api(`/decks?userId=${u.id}`).then(setPlayer1Decks).catch(console.error)
                          }}
                          placeholder="Player 1"
                          initialValue={editDuelForm.player1Id ? (users.find(u => u.id === editDuelForm.player1Id)?.displayName || users.find(u => u.id === editDuelForm.player1Id)?.username) : undefined}
                      />
                  </div>
                   <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Player 2</label>
                      <UserSearchSelect 
                          onSelect={(u) => { 
                              setEditDuelForm({ ...editDuelForm, player2Id: u.id })
                               // Refresh decks if player changes
                              api(`/decks?userId=${u.id}`).then(setPlayer2Decks).catch(console.error)
                          }}
                          placeholder="Player 2"
                           initialValue={editDuelForm.player2Id ? (users.find(u => u.id === editDuelForm.player2Id)?.displayName || users.find(u => u.id === editDuelForm.player2Id)?.username) : undefined}
                      />
                  </div>
               </div>

                {/* Decks */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm text-zinc-400">P1 Deck</label>
                      <select 
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm"
                          value={editDuelForm.player1DeckId || ''}
                          onChange={(e) => setEditDuelForm({ ...editDuelForm, player1DeckId: e.target.value ? parseInt(e.target.value) : undefined })}
                      >
                          <option value="">Select Deck...</option>
                          {player1Decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                  </div>
                   <div className="space-y-2">
                      <label className="text-sm text-zinc-400">P2 Deck</label>
                       <select 
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm"
                          value={editDuelForm.player2DeckId || ''}
                          onChange={(e) => setEditDuelForm({ ...editDuelForm, player2DeckId: e.target.value ? parseInt(e.target.value) : undefined })}
                      >
                          <option value="">Select Deck...</option>
                          {player2Decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                  </div>
               </div>

               {/* Status */}
               <div className="space-y-2">
                   <label className="text-sm text-zinc-400">Status</label>
                   <select 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                        value={editDuelForm.status}
                        onChange={(e) => setEditDuelForm({ ...editDuelForm, status: e.target.value })}
                   >
                       <option value="open">Open</option>
                       <option value="ready">Ready</option>
                       <option value="active">Active</option>
                       <option value="completed">Completed</option>
                   </select>
               </div>

               {/* Scores (if completed) */}
               {editDuelForm.status === 'completed' && (
                   <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="space-y-2">
                          <label className="text-sm text-zinc-400">P1 Score</label>
                          <input 
                              type="number" 
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white"
                              value={editDuelForm.player1Score}
                              onChange={(e) => setEditDuelForm({ ...editDuelForm, player1Score: parseInt(e.target.value) || 0 })}
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm text-zinc-400">P2 Score</label>
                           <input 
                              type="number" 
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white"
                              value={editDuelForm.player2Score}
                              onChange={(e) => setEditDuelForm({ ...editDuelForm, player2Score: parseInt(e.target.value) || 0 })}
                          />
                      </div>
                   </div>
               )}

               {/* Notes */}
               <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Player 1 Note</label>
                    <input 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                        value={editDuelForm.player1Note}
                        onChange={(e) => setEditDuelForm({ ...editDuelForm, player1Note: e.target.value })}
                    />
               </div>
               <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Player 2 Note</label>
                    <input 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                        value={editDuelForm.player2Note}
                        onChange={(e) => setEditDuelForm({ ...editDuelForm, player2Note: e.target.value })}
                    />
               </div>

            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <Button variant="ghost" onClick={() => setEditDuelOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveDuel}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Game Management Dialogs */}
      {/* Create/Edit Game Modal */}
      {gameModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold text-white">{editingGame ? 'Edit Game' : 'Create Game'}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Name</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  value={gameForm.name}
                  onChange={(e) => {
                      // Auto-slug
                      const val = e.target.value;
                      if (!editingGame) {
                          setGameForm(prev => ({ 
                              ...prev, 
                              name: val, 
                              slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') 
                          }))
                      } else {
                          setGameForm(prev => ({ ...prev, name: val }))
                      }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">URL Identifier (Slug)</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  value={gameForm.slug}
                  onChange={(e) => setGameForm({ ...gameForm, slug: e.target.value })}
                />
                <p className="text-xs text-zinc-500">Unique identifier for URLs (e.g. 'one-piece')</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Description</label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white min-h-[80px]"
                  value={gameForm.description}
                  onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Image URL</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  value={gameForm.imageUrl}
                  onChange={(e) => setGameForm({ ...gameForm, imageUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => {
                  setGameModalOpen(false)
                  setEditingGame(null)
                  setGameForm({ name: '', slug: '', description: '', imageUrl: '' })
              }}>Cancel</Button>
              <Button onClick={async () => {
                  if (!gameForm.name || !gameForm.slug) {
                      alert('Name and Slug are required')
                      return;
                  }
                  try {
                      if (editingGame) {
                        await api(`/games/${editingGame.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({...gameForm, requesterId: user?.id })
                        })
                      } else {
                        await api('/games', {
                            method: 'POST',
                            body: JSON.stringify({...gameForm, requesterId: user?.id })
                        })
                      }
                      setGameModalOpen(false)
                      setEditingGame(null)
                      setGameForm({ name: '', slug: '', description: '', imageUrl: '' })
                      loadData()
                  } catch (e: any) {
                      alert(e.message)
                  }
              }}>{editingGame ? 'Save Changes' : 'Create Game'}</Button>
            </div>
          </div>
        </div>
      )}
      
      <DeckModal
        isOpen={deckModalOpen}
        onClose={() => setDeckModalOpen(false)}
        initialData={editingDeck}
        title={editingDeck ? 'Edit Deck' : 'Create Deck'}
        submitLabel={editingDeck ? 'Save Changes' : 'Create Deck'}
        games={games}
        defaultGameId={filterGameId !== 'all' ? parseInt(filterGameId) : undefined}
        onSubmit={async (data) => {
            try {
                if (editingDeck) {
                    await api(`/decks/${editingDeck.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ ...data, requesterId: user?.id })
                    })
                } else {
                    await api('/decks', {
                        method: 'POST',
                        body: JSON.stringify({ ...data, gameId: data.gameId || (filterGameId !== 'all' ? parseInt(filterGameId) : undefined), userId: createDeckUserId, requesterId: user?.id })
                    })
                }
                setDeckModalOpen(false)
                loadData()
            } catch (err: any) {
                alert(err.message)
            }
        }}
      />
    </div>
  )
}
