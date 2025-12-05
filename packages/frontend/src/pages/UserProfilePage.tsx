import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { UserAvatar } from '../components/UserAvatar'
import { UserLabel } from '../components/UserLabel'
import { Button } from '../components/ui/button'
import { Trophy, Swords, Calendar, MoreVertical } from 'lucide-react'
import { ProfileSettingsDialog } from '../components/ProfileSettingsDialog'

interface UserProfile {
  id: number
  username: string
  displayName?: string
  mmr: number
  color?: string
  avatarUrl?: string
  createdAt: string
}

interface TournamentHistory {
  tournamentName: string
  tournamentDate: string
  status: string
  score: number
  rank: number
  totalParticipants: number
  note?: string
}

interface DuelHistory {
  id: number
  name: string
  status: string
  result?: string
  winnerId?: number
  createdAt: string
  opponent: string
  opponentId?: number
  player1Id?: number
  player2Id?: number
  player1Note?: string
  player2Note?: string
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [history, setHistory] = useState<TournamentHistory[]>([])
  const [duels, setDuels] = useState<DuelHistory[]>([])
  const [loading, setLoading] = useState(true)
  
  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const userRes = await api(`/users/${id}`)
      setUser(userRes.user)

      const historyRes = await api(`/users/${id}/history`)
      setHistory(historyRes.history)
      setDuels(historyRes.duels || [])
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  if (loading) return <div className="flex justify-center items-center h-96 text-zinc-500">Loading profile...</div>
  if (!user) return <div className="flex justify-center items-center h-96 text-red-500">User not found</div>

  const canEdit = currentUser?.id === user.id || currentUser?.role === 'admin'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 relative">
        {canEdit && (
          <div className="absolute top-4 right-4">
            <ProfileSettingsDialog user={user} onUpdate={fetchData}>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </ProfileSettingsDialog>
          </div>
        )}

        <UserAvatar username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} size="lg" className="text-4xl" />
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl font-bold text-white">
            <UserLabel username={user.username} displayName={user.displayName} color={user.color} userId={user.id} />
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-4 text-zinc-400">
            <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-white">{user.mmr} MMR</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stats Cards */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
           <div>
             <p className="text-sm text-zinc-400">Tournament Winrate</p>
             <p className="text-2xl font-bold text-white">
               {history.length > 0 
                 ? `${Math.round((history.filter(h => h.rank === 1).length / history.length) * 100)}%` 
                 : '-'}
             </p>
           </div>
           <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
           <div>
             <p className="text-sm text-zinc-400">Duel Winrate</p>
              <p className="text-2xl font-bold text-white">
               {duels.filter(d => d.status === 'completed').length > 0
                 ? `${Math.round((duels.filter(d => d.winnerId === user.id).length / duels.filter(d => d.status === 'completed').length) * 100)}%`
                 : '-'}
             </p>
           </div>
           <Swords className="w-8 h-8 text-red-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tournament History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-indigo-500" />
            Tournament History
          </h2>
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No tournament history yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {history.map((item, i) => (
                  <div key={i} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-white">{item.tournamentName}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' : 
                        item.rank <= 3 ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        Rank #{item.rank} / {item.totalParticipants}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-zinc-400">
                      <span>{item.tournamentDate.startsWith('Started:') ? item.tournamentDate : `Date: ${new Date(item.tournamentDate).toLocaleDateString()}`}</span>
                      <span>Score: {item.score}</span>
                    </div>
                    {item.note && (
                      <div className="mt-2 text-sm text-zinc-500 bg-zinc-950/50 p-2 rounded border border-white/5">
                        Note: {item.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Duel History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Swords className="text-red-500" />
            Duel History
          </h2>
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
            {duels.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No duel history yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {duels.map((duel) => {
                  const isWinner = duel.winnerId === user.id
                  const isDraw = !duel.winnerId && duel.status === 'completed'
                  
                  return (
                    <div key={duel.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <Link to={`/duels/${duel.id}`} className="font-medium text-white hover:underline">
                          {duel.name}
                        </Link>
                        <span className={`text-xs px-1.5 py-0.5 rounded uppercase font-bold ${
                          duel.status !== 'completed' ? 'bg-zinc-800 text-zinc-500' :
                          isWinner ? 'bg-green-500/20 text-green-400' :
                          isDraw ? 'bg-zinc-700 text-zinc-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {duel.status !== 'completed' ? duel.status : isWinner ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-1 text-zinc-400">
                          <span>vs</span>
                          {duel.opponentId ? (
                             <Link to={`/users/${duel.opponentId}`} className="text-white hover:underline">
                               {duel.opponent}
                             </Link>
                          ) : (
                            <span>{duel.opponent}</span>
                          )}
                        </div>
                        <span className="text-zinc-500">{new Date(duel.createdAt).toLocaleDateString()}</span>
                      </div>
                      {/* Display notes if they exist */}
                      {(duel.player1Note || duel.player2Note) && (
                        <div className="mt-2 text-sm text-zinc-500 bg-zinc-950/50 p-2 rounded border border-white/5 space-y-1">
                          {duel.player1Note && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs uppercase font-bold text-zinc-600 mt-0.5 shrink-0">
                                {user?.id === duel.player1Id ? (user?.displayName || user?.username) : duel.opponent}:
                              </span>
                              <p>{duel.player1Note}</p>
                            </div>
                          )}
                          {duel.player2Note && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs uppercase font-bold text-zinc-600 mt-0.5 shrink-0">
                                {user?.id === duel.player2Id ? (user?.displayName || user?.username) : duel.opponent}:
                              </span>
                              <p>{duel.player2Note}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
