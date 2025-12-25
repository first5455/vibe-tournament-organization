import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useGame } from '../contexts/GameContext'
import { UserAvatar } from '../components/UserAvatar'
import { UserLabel } from '../components/UserLabel'
import { Button } from '../components/ui/button'
import { Trophy, Swords, Calendar, MoreVertical, ExternalLink, Plus, Layers, Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { DeckCard, DeckWithStats } from '../components/DeckCard'
import { DeckModal } from '../components/DeckModal'
import { ProfileSettingsDialog } from '../components/ProfileSettingsDialog'
import { formatDate } from '../lib/utils'


interface UserProfile {
  id: number
  username: string
  displayName?: string
  mmr: number
  color?: string
  avatarUrl?: string
  createdAt: string
  rank?: number
  stats?: {
      gameId: number
      gameName: string
      mmr: number
      wins: number
      losses: number
      draws: number
      duelWins?: number
      duelLosses?: number
      duelDraws?: number
      tournamentWins?: number
      tournamentLosses?: number
      tournamentDraws?: number
  }[]
}

interface TournamentHistory {
  tournamentName: string
  tournamentDate: string
  status: string
  score: number
  rank: number
  totalParticipants: number
  note?: string
  deck?: {
    id: number
    name: string
    color: string
    link?: string
  }
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
  player1MmrChange?: number | null
  player2MmrChange?: number | null
  deck?: {
    id: number
    name: string
    color: string
    link?: string

  }
  firstPlayerId?: number;
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser, hasPermission } = useAuth()
  const { selectedGame: activeGame, games } = useGame() // Alias to activeGame to minimize changes
  const [user, setUser] = useState<UserProfile | null>(null)
  const [history, setHistory] = useState<TournamentHistory[]>([])
  const [duels, setDuels] = useState<DuelHistory[]>([])
  const [decks, setDecks] = useState<DeckWithStats[]>([])
  const [customDecks, setCustomDecks] = useState<any[]>([])
  const [expandedCustomDecks, setExpandedCustomDecks] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  
  // Deck Management State
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<DeckWithStats | null>(null)
  
  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const userRes = await api(`/users/${id}`)
      setUser(userRes.user)

      const queryParams = activeGame ? `?gameId=${activeGame.id}` : ''
      const historyRes = await api(`/users/${id}/history${queryParams}`)
      setHistory(historyRes.history)
      setDuels(historyRes.duels || [])

      // Fetch decks
      try {
        const decksRes = await api(`/decks?userId=${id}${activeGame ? `&gameId=${activeGame.id}` : ''}`)
        setDecks(decksRes)
      } catch (e) {
        console.error('Failed to fetch decks', e)
      }

      // Fetch custom decks
      try {
        const customDecksRes = await api(`/custom-decks?userId=${id}${activeGame ? `&gameId=${activeGame.id}` : ''}`)
        setCustomDecks(customDecksRes)
      } catch (e) {
        console.error('Failed to fetch custom decks', e)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id, activeGame])

  if (loading) return <div className="flex justify-center items-center h-96 text-zinc-500">Loading profile...</div>
  if (!user) return <div className="flex justify-center items-center h-96 text-red-500">User not found</div>

  const canEdit = currentUser?.id === user.id || hasPermission('users.manage')
  const canManageDecks = hasPermission('decks.manage')

  const handleDeckSubmit = async (data: { name: string; link: string; color: string; gameId?: number }) => {
    try {
        if (editingDeck) {
            await api(`/decks/${editingDeck.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    requesterId: currentUser?.id,
                    ...data,
                    gameId: data.gameId || activeGame?.id, // Use submitted gameId or active fallback
                })
            })
        } else {
            await api('/decks', {
                method: 'POST',
                body: JSON.stringify({
                    requesterId: currentUser?.id,
                    userId: user.id,
                    ...data,
                    gameId: data.gameId || activeGame?.id,
                })
            })
        }
        setIsDeckModalOpen(false)
        fetchData() // Refresh data
    } catch (e) {
        alert('Failed to save deck')
    }
  }

  const handleDeleteDeck = async (deckId: number) => {
    if (!confirm('Are you sure you want to delete this deck?')) return
    try {
        await api(`/decks/${deckId}`, {
            method: 'DELETE',
            body: JSON.stringify({ requesterId: currentUser?.id })
        })
        fetchData()
    } catch (e) {
        alert('Failed to delete deck')
    }
  }

  // Determine Game Specific Stats
  const gameStats = user.stats?.find(s => s.gameId === activeGame?.id)
  const displayMmr = gameStats?.mmr ?? 1000
  // For rank, we might need to fetch it specifically or rely on backend to provide it in stats? 
  // currently backend provides 'rank' on user root (legacy).
  // Ideally we should display 'N/A' or '-' if we don't know the rank for this game.
  // The backend `GET /users/:id` doesn't calculate game specific rank yet. 
  // But we can just show MMR.

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
              <span className="font-medium text-white">
                {/* {user.rank && <span className="text-zinc-400 mr-2">#{user.rank} •</span>} */} 
                {/* Rank is currently global legacy, hiding it to avoid confusion or we need to fetch it per game */}
                {displayMmr} MMR
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDate(user.createdAt)}</span>
            </div>
             {activeGame && (
                  <div className="flex items-center gap-2 ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/20">
                      Game: {activeGame.name}
                  </div>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats Cards */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
           <div className="space-y-1">
             <p className="text-sm text-zinc-400">Tournament Winrate</p>
             <p className="text-2xl font-bold text-white">
               {gameStats?.tournamentWins !== undefined && (gameStats.tournamentWins + (gameStats.tournamentLosses||0)) > 0
                 ? `${Math.round((gameStats.tournamentWins / (gameStats.tournamentWins + (gameStats.tournamentLosses||0))) * 100)}%`
                 : history.filter(h => h.status === 'completed').length > 0
                     ? `${Math.round((history.filter(h => h.status === 'completed' && h.rank === 1).length / history.filter(h => h.status === 'completed').length) * 100)}%`
                     : '-'}
             </p>
             <p className="text-sm text-zinc-500">
               {gameStats?.tournamentWins !== undefined ? (
                   `${(gameStats.tournamentWins + (gameStats.tournamentLosses||0))} Played (${gameStats.tournamentWins} Win - ${gameStats.tournamentLosses} Loss)`
               ) : (
                   `${history.filter(h => h.status === 'completed').length} Played (${history.filter(h => h.status === 'completed' && h.rank === 1).length} Win - ${history.filter(h => h.status === 'completed').length - history.filter(h => h.status === 'completed' && h.rank === 1).length} Loss)`
               )}
             </p>
           </div>
           <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
           <div className="space-y-1">
             <p className="text-sm text-zinc-400">Duel Winrate</p>
             <p className="text-2xl font-bold text-white">
               {gameStats?.duelWins !== undefined && (gameStats.duelWins + (gameStats.duelLosses||0)) > 0
                  ? `${Math.round((gameStats.duelWins / (gameStats.duelWins + (gameStats.duelLosses||0))) * 100)}%`
                  : duels.filter(d => d.status === 'completed').length > 0
                    ? `${Math.round((duels.filter(d => d.status === 'completed' && d.winnerId === user.id).length / duels.filter(d => d.status === 'completed').length) * 100)}%`
                    : '-'}
             </p>
             <p className="text-sm text-zinc-500">
               {gameStats?.duelWins !== undefined ? (
                   `${(gameStats.duelWins + (gameStats.duelLosses||0))} Played (${gameStats.duelWins} Win - ${gameStats.duelLosses} Loss)`
               ) : (
                   `${duels.filter(d => d.status === 'completed').length} Played (${duels.filter(d => d.status === 'completed' && d.winnerId === user.id).length} Win - {duels.filter(d => d.status === 'completed').length - duels.filter(d => d.status === 'completed' && d.winnerId === user.id).length} Loss)`
               )}
             </p>
           </div>
           <Swords className="w-8 h-8 text-red-500" />
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
           <div className="space-y-1">
             <p className="text-sm text-zinc-400">Daily Performance</p>
             <p className="text-2xl font-bold text-white">
               {(() => {
                 const today = new Date().toLocaleDateString()
                 // Duels are already filtered by gameId from API if activeGame is set
                 const todaysDuels = duels.filter(d => new Date(d.createdAt).toLocaleDateString() === today && d.status === 'completed')
                 if (todaysDuels.length === 0) return '-'
                 const wins = todaysDuels.filter(d => d.winnerId === user.id).length
                 return `${Math.round((wins / todaysDuels.length) * 100)}%`
               })()}
             </p>
             <p className="text-sm text-zinc-500">
               {(() => {
                 const today = new Date().toLocaleDateString()
                 const todaysDuels = duels.filter(d => new Date(d.createdAt).toLocaleDateString() === today && d.status === 'completed')
                 const wins = todaysDuels.filter(d => d.winnerId === user.id).length
                 const losses = todaysDuels.length - wins
                 return `${todaysDuels.length} Played (${wins} Win - ${losses} Loss)`
               })()}
             </p>
           </div>
           <Calendar className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="text-purple-500" />
                Player Decks
            </h2>
            {canEdit && (
                <Button onClick={() => { setEditingDeck(null); setIsDeckModalOpen(true) }} size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Deck
                </Button>
            )}
        </div>
        
        {decks.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-8 text-center text-zinc-500">
                No decks created yet
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map(deck => (
                    <DeckCard 
                        key={deck.id} 
                        deck={deck} 
                        showActions={canEdit}
                        onEdit={(d) => { setEditingDeck(d); setIsDeckModalOpen(true) }}
                        onDelete={handleDeleteDeck}
                    />
                ))}
            </div>
        )}
      </div>

      {/* Custom Decks Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="text-indigo-500" />
                Custom Decks
            </h2>
        </div>
        
        {customDecks.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-8 text-center text-zinc-500">
                No custom decks created yet
            </div>
        ) : (
            <div className="space-y-3">
                {customDecks.map(deck => {
                  const isExpanded = expandedCustomDecks.has(deck.id)
                  
                  return (
                    <div key={deck.id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-lg">{deck.name}</h3>
                          {deck.description && (
                            <p className="text-sm text-zinc-400 mt-1">{deck.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                            <span>{deck.cardCount} unique cards</span>
                            <span>•</span>
                            <span>{deck.totalCards} total cards</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              // Fetch cards if not already loaded
                              if (!deck.cards) {
                                try {
                                  const deckDetails = await api(`/custom-decks/${deck.id}`)
                                  setCustomDecks(prev => prev.map(d => 
                                    d.id === deck.id ? { ...d, cards: deckDetails.cards } : d
                                  ))
                                } catch (e) {
                                  console.error('Failed to fetch deck cards', e)
                                }
                              }
                              // Toggle expand
                              setExpandedCustomDecks(prev => {
                                const newSet = new Set(prev)
                                if (newSet.has(deck.id)) {
                                  newSet.delete(deck.id)
                                } else {
                                  newSet.add(deck.id)
                                }
                                return newSet
                              })
                            }}
                            className="text-zinc-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Hide Cards
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                View Cards
                              </>
                            )}
                          </Button>
                          {canManageDecks && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={async () => {
                                if (!confirm('Delete this custom deck? All cards and images will be removed.')) return
                                try {
                                  await api(`/custom-decks/${deck.id}`, {
                                    method: 'DELETE',
                                    body: JSON.stringify({ requesterId: currentUser?.id })
                                  })
                                  fetchData()
                                } catch (e: any) {
                                  alert(e.message || 'Failed to delete custom deck')
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Card List */}
                      {isExpanded && deck.cards && (
                        <div className="border-t border-white/5 pt-3 mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {deck.cards.map((card: any) => (
                              <div key={card.id} className="flex items-center gap-3 bg-zinc-950/50 p-3 rounded-lg border border-white/5 group relative">
                                <div className="w-16 h-16 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                                  <img 
                                    src={card.imageUrl} 
                                    alt={card.cardName || 'Card'} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23334155" width="64" height="64"/%3E%3C/svg%3E'
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-white truncate">
                                    {card.cardName || 'Unnamed Card'}
                                  </p>
                                  <p className="text-sm text-zinc-500">
                                    Quantity: {card.quantity}
                                  </p>
                                </div>
                                {canManageDecks && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={async () => {
                                      if (!confirm(`Delete "${card.cardName || 'this card'}" from the deck?`)) return
                                      try {
                                        await api(`/custom-decks/${deck.id}/cards/${card.id}`, {
                                          method: 'DELETE',
                                          body: JSON.stringify({ requesterId: currentUser?.id })
                                        })
                                        // Refresh the deck to show updated card list
                                        const deckDetails = await api(`/custom-decks/${deck.id}`)
                                        setCustomDecks(prev => prev.map(d => 
                                          d.id === deck.id ? { ...d, cards: deckDetails.cards, cardCount: deckDetails.cardCount, totalCards: deckDetails.totalCards } : d
                                        ))
                                      } catch (e: any) {
                                        alert(e.message || 'Failed to delete card')
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tournament History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-indigo-500" />
            Tournament History
          </h2>
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
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
                      <span>{item.tournamentDate.startsWith('Started:') ? item.tournamentDate : `Date: ${formatDate(item.tournamentDate)}`}</span>
                      <div className="flex items-center gap-4">
                        {item.deck && (
                            <div className="flex items-center gap-1">
                                <span className="text-zinc-500">Deck:</span>
                                {item.deck.link ? (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-6 text-xs px-2 gap-1 border-white/10 bg-transparent hover:bg-white/5" 
                                        style={{ color: item.deck.color }}
                                        onClick={() => window.open(item.deck?.link, '_blank')}
                                    >
                                        {item.deck.name} <ExternalLink className="w-3 h-3" />
                                    </Button>
                                ) : (
                                    <span className="text-xs" style={{ color: item.deck.color }}>{item.deck.name}</span>
                                )}
                            </div>
                        )}
                        <span>Score: {item.score}</span>
                      </div>
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
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
            {duels.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No duel history yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {duels.map((duel) => {
                  const isWinner = duel.winnerId === user.id
                  const isDraw = !duel.winnerId && duel.status === 'completed'
                  
                  const mmrChange = user.id === duel.player1Id ? duel.player1MmrChange : duel.player2MmrChange

                  return (
                    <div key={duel.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <Link to={`/duels/${duel.id}`} className="font-medium text-white hover:underline">
                          {duel.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          {mmrChange != null && (
                            <span className={`text-xs font-mono font-bold ${mmrChange > 0 ? 'text-green-500' : mmrChange < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                              {mmrChange > 0 ? '+' : ''}{mmrChange}
                            </span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded uppercase font-bold ${
                            duel.status !== 'completed' ? 'bg-zinc-800 text-zinc-500' :
                            isWinner ? 'bg-green-500/20 text-green-400' :
                            isDraw ? 'bg-zinc-700 text-zinc-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {duel.status !== 'completed' ? duel.status : isWinner ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                          </span>
                          {/* First Player Badge */}
                          {duel.firstPlayerId && (
                              <span className={`text-[10px] px-1 py-0.5 rounded border ${
                                  duel.firstPlayerId === user.id 
                                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700' 
                                  : 'text-zinc-600 border-zinc-800'
                              }`}>
                                  {duel.firstPlayerId === user.id ? 'YOU WENT 1ST' : 'OPP WENT 1ST'}
                              </span>
                          )}
                        </div>
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
                        <span className="text-zinc-500">{formatDate(duel.createdAt)}</span>
                      </div>
                      {duel.deck && (
                          <div className="mt-2 text-xs flex justify-end items-center gap-1">
                            <span className="text-zinc-500">Deck:</span>
                            {duel.deck.link ? (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-6 text-xs px-2 gap-1 border-white/10 bg-transparent hover:bg-white/5" 
                                    style={{ color: duel.deck.color }}
                                    onClick={() => window.open(duel.deck?.link, '_blank')}
                                >
                                    {duel.deck.name} <ExternalLink className="w-3 h-3" />
                                </Button>
                            ) : (
                                <span style={{ color: duel.deck.color }}>{duel.deck.name}</span>
                            )}
                          </div>
                      )}
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
      <DeckModal 
        isOpen={isDeckModalOpen} 
        onClose={() => setIsDeckModalOpen(false)} 
        defaultGameId={activeGame?.id}
        games={games}
        onSubmit={handleDeckSubmit}
        initialData={editingDeck}
        title={editingDeck ? "Edit Deck" : `Create Deck for ${user.displayName || user.username}`}
        submitLabel={editingDeck ? "Save Changes" : "Create Deck"}
      />
    </div>
  )
}
