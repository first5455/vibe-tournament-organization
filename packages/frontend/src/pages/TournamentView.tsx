import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { useAuth } from '../lib/auth'
import { Trophy, Users, Play, RefreshCw } from 'lucide-react'
import { UserLabel } from '../components/UserLabel'
import { UserAvatar } from '../components/UserAvatar'

import { useRefresh } from '../hooks/useRefresh'
import { formatDate } from '../lib/utils'
import { UserSearchSelect } from '../components/UserSearchSelect'
import { CreateUserDialog } from '../components/CreateUserDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Match, Participant, Deck } from '../types'
import { MatchCard } from '../components/MatchCard'

interface Tournament {
  id: number
  name: string
  status: 'pending' | 'active' | 'completed'
  totalRounds: number
  currentRound: number
  createdBy: number
  startDate?: string
  endDate?: string
  type?: 'swiss' | 'round_robin'
  createdByName?: string | null
  createdByDisplayName?: string | null
  createdByColor?: string | null
  createdByAvatarUrl?: string | null
}

export default function TournamentView() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const { user, hasPermission } = useAuth()
  const [userDecks, setUserDecks] = useState<Deck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [firstPlayerId, setFirstPlayerId] = useState<number | undefined>(undefined)
  const [viewRound, setViewRound] = useState<number>(0)

  const loadTournament = async () => {
    if (!id) return
    setIsLoading(true)
    setError('')
    
    try {
      // Fetch tournament details first
      try {
        const { tournament } = await api(`/tournaments/${id}`)
        setTournament(tournament)
        // Set initial view round if not set or if we are just loading for the first time
        if (viewRound === 0) setViewRound(tournament.currentRound)
      } catch (e: any) {
        console.error('Failed to fetch tournament:', e)
        setError(e.message || 'Failed to load tournament details')
        setIsLoading(false)
        return // Stop if tournament details fail
      }

      // Fetch participants
      try {
        const participantsData = await api(`/tournaments/${id}/participants`)
        setParticipants(participantsData)
      } catch (e) {
        console.error('Failed to fetch participants:', e)
      }

      // Fetch matches
      try {
        const matchesData = await api(`/tournaments/${id}/matches`)
        setMatches(matchesData)
      } catch (e) {
        console.error('Failed to fetch matches:', e)
      }

    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const { handleRefresh, isCoolingDown } = useRefresh(loadTournament)

  useEffect(() => {
    loadTournament()

    let ws: WebSocket | null = null
    
    if (import.meta.env.VITE_USE_WEBSOCKETS === 'true') {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          if (id) {
            ws?.send(JSON.stringify({ type: 'SUBSCRIBE_TOURNAMENT', tournamentId: parseInt(id) }))
          }
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'UPDATE_TOURNAMENT') {

              loadTournament()
            }
          } catch (e) {
            console.error('WS Message Parse Error', e)
          }
        }
        
        ws.onerror = (e) => {
          console.error('WebSocket error:', e)
        }
      } catch (e) {
        console.error('Failed to initialize WebSocket:', e)
      }
    }

    // Heartbeat
    const interval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }))
        }
    }, 30000)

    return () => {
      clearInterval(interval)
      if (ws) {
        ws.close()
      }
    }
  }, [id])

  useEffect(() => {
    const fetchUserDecks = async () => {
      if (user?.id) {
        try {
          const decks = await api(`/decks?userId=${user.id}`)
          setUserDecks(decks)
        } catch (e) {
          console.error('Failed to fetch user decks', e)
        }
      }
    }
    fetchUserDecks()
  }, [user])

  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [showGuestInput, setShowGuestInput] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)



  const reportMatch = async (match: Match, s1: number, s2: number, firstPlayerId?: number) => {
    if (!user?.id) {
      alert('You must be logged in to report results')
      return
    }

    const winnerId = s1 > s2 ? match.player1Id : (s2 > s1 ? match.player2Id : null)

    // Check if updating existing result
    const isUpdate = !!match.result

    try {
      const url = isUpdate ? `/matches/${match.id}` : `/matches/${match.id}/report`
      const method = isUpdate ? 'PUT' : 'POST'

      const body: any = {
        winnerId,
        result: `${s1}-${s2}`,
      }

      if (isUpdate) {
        body.createdBy = user.id
      } else {
        body.player1Score = s1
        body.player2Score = s2
        body.reportedBy = user.id
        if (firstPlayerId) body.firstPlayerId = firstPlayerId
      }

      await api(url, {
        method,
        body: JSON.stringify(body)
      })
      loadTournament()
    } catch (e: any) {
      console.error('Report failed:', e)
      alert('Failed to report score')
    }
  }
  const joinTournament = async () => {
    if (!user?.id) return
    try {
      await api(`/tournaments/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: user.id, 
          deckId: selectedDeckId
        })
      })
      loadTournament()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const startTournament = async () => {
    try {
      await api(`/tournaments/${id}/start`, { method: 'POST' })
      loadTournament()
    } catch (err: any) {
      console.error('Failed to start tournament:', err)
      alert(`Failed to start tournament: ${err.message || 'Unknown error'}`)
    }
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [editDeckOpen, setEditDeckOpen] = useState(false)
  const [editingDeckParticipantId, setEditingDeckParticipantId] = useState<number | null>(null)
  const [targetUserDecks, setTargetUserDecks] = useState<Deck[]>([])
  const [newDeckId, setNewDeckId] = useState<number | undefined>(undefined)

  const navigate = useNavigate()

  useEffect(() => {
    if (tournament) setEditName(tournament.name)
  }, [tournament])

  const deleteTournament = async () => {
    if (!confirm('Are you sure you want to delete this tournament? This cannot be undone.')) return
    try {
      await api(`/tournaments/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ createdBy: user?.id })
      })
      navigate('/')
    } catch (err) {
      alert('Failed to delete tournament')
    }
  }

  const updateTournament = async () => {
    try {
      await api(`/tournaments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName, createdBy: user?.id })
      })
      setIsEditing(false)
      loadTournament()
    } catch (err) {
      alert('Failed to update tournament')
    }
  }

  const addGuest = async () => {
    if (!guestName) return
    try {
      if (!user?.id) throw new Error('User not authenticated')

      
      await api(`/tournaments/${id}/guests`, {
        method: 'POST',
        body: JSON.stringify({ name: guestName, createdBy: user.id })
      })
      setGuestName('')
      setShowGuestInput(false)
      loadTournament()
    } catch (err: any) {
      console.error('Failed to add guest:', err)
      alert(`Failed to add guest: ${err.message || 'Unknown error'}`)
    }
  }

  const addParticipant = async (selectedUser: { id: number }) => {
    try {
      if (!user?.id) throw new Error('User not authenticated')

      await api(`/tournaments/${id}/participants`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: selectedUser.id, 
          createdBy: user.id
          // TODO: Admin selecting deck for user? maybe later
        })
      })
      setShowAddParticipant(false)
      loadTournament()
    } catch (err: any) {
      console.error('Failed to add participant:', err)
      alert(`Failed to add participant: ${err.message || 'Unknown error'}`)
    }
  }

  const leaveTournament = async () => {
    if (!user?.id) return
    const p = participants.find(part => part.userId === user.id)
    if (!p) return

    if (!confirm('Leave this tournament?')) return

    try {
      await api(`/tournaments/${id}/participants/${p.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ createdBy: user.id })
      })
      loadTournament()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const openEditDeck = async (p: Participant) => {
    if (!p.userId) return
    setEditingDeckParticipantId(p.id)
    setEditDeckOpen(true)
    setTargetUserDecks([]) // Clear previous
    setNewDeckId(undefined)

    // Initial selected deck? We don't have the ID in participant list easily unless we add it to API
    // The API sends everything, let's check table cols. I added deckName/Color but not deckId to `participants` query in `tournaments.ts`?
    // Let's check `backend/src/routes/tournaments.ts` ... I did `...getTableColumns(participants)` so `deckId` IS there.
    // However, I need to cast it or update interface.
    // Interface Participant has ... wait, where is deckId in interface?
    // It's not in the interface in `TournamentView.tsx` line 14. I should add it.
    
    // For now assuming we can fix interface below or just access it as any for a sec, 
    // but better to add it to interface.

    try {
      const decks = await api(`/decks?userId=${p.userId}`)
      setTargetUserDecks(decks)
    } catch (e) {
      console.error('Failed to fetch decks for user', e)
    }
  }

  const saveDeckChange = async () => {
    if (!editingDeckParticipantId) return
    try {
        await api(`/tournaments/${id}/participants/${editingDeckParticipantId}`, {
            method: 'PUT',
            body: JSON.stringify({ 
                deckId: newDeckId === -1 ? null : newDeckId, // -1 or null handling
                userId: user?.id 
            })
        })
        setEditDeckOpen(false)
        loadTournament()
    } catch (err: any) {
        alert(err.message)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading tournament data...</div>
  
  if (error) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-xl font-bold text-red-500">Error</h3>
        <p className="text-zinc-400">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go Back</Button>
      </div>
    )
  }

  if (!tournament) return <div className="p-8 text-center text-zinc-500">Tournament not found</div>

  const isAdmin = (user?.id === tournament.createdBy && hasPermission('tournaments.manage_own')) || hasPermission('tournaments.manage_all')

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
              />
              <Button onClick={updateTournament}>Save</Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400 capitalize border border-zinc-700">
                {tournament.type?.replace('_', ' ')}
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleRefresh}
                disabled={isCoolingDown}
                className={`text-zinc-400 hover:text-white ${isCoolingDown ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isCoolingDown ? "Please wait..." : "Refresh tournament data"}
              >
                <RefreshCw className={`h-6 w-6 ${isCoolingDown ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-zinc-400">
            {tournament.type !== 'round_robin' && (
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Round {tournament.currentRound}/{tournament.totalRounds}
                {tournament.status === 'active' && (
                  <span className="ml-1 text-xs text-zinc-500">
                    ({tournament.totalRounds - tournament.currentRound} left)
                  </span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {participants.length} Participants
            </span>
            {tournament.startDate && (
              <span className="text-xs text-zinc-500 border-l border-zinc-700 pl-4 ml-2">
                Started: {formatDate(tournament.startDate)}
              </span>
            )}
            {tournament.endDate && (
              <span className="text-xs text-zinc-500">
                • Finished: {formatDate(tournament.endDate)}
              </span>
            )}
            {tournament.createdByName && (
              <span className="text-xs text-zinc-500 border-l border-zinc-700 pl-4 ml-2 flex items-center gap-2">
                <UserAvatar username={tournament.createdByName} displayName={tournament.createdByDisplayName || undefined} avatarUrl={tournament.createdByAvatarUrl} size="sm" className="h-5 w-5" />
                <span className="flex items-center gap-1">
                  Created by: <UserLabel username={tournament.createdByName} displayName={tournament.createdByDisplayName || undefined} color={tournament.createdByColor} className="text-zinc-300" userId={tournament.createdBy} />
                </span>
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
              <Button variant="destructive" onClick={deleteTournament}>Delete</Button>
            </>
          )}
          {tournament.status === 'active' && isAdmin && tournament.type !== 'round_robin' && (
            <>
              <Button 
                disabled={tournament.currentRound >= tournament.totalRounds}
                className={tournament.currentRound >= tournament.totalRounds ? "opacity-50 cursor-not-allowed" : ""}
                onClick={async () => {
                try {
                  await api(`/tournaments/${id}/next-round`, { method: 'POST' })
                  setViewRound(tournament.currentRound + 1)
                  loadTournament()
                } catch (err: any) {
                  alert(`Failed to start next round: ${err.message}`)
                }
              }}>
                <Play className="mr-2 h-4 w-4" />
                Next Round
              </Button>
              <Button variant="secondary" onClick={async () => {
                if (!confirm('Stop tournament?')) return
                try {
                  await api(`/tournaments/${id}/stop`, { 
                    method: 'POST',
                    body: JSON.stringify({ createdBy: user?.id })
                  })
                  setViewRound(tournament.currentRound)
                  loadTournament()
                } catch (err: any) {
                  alert(`Failed to stop tournament: ${err.message}`)
                }
              }}>
                Stop Tournament
              </Button>
            </>
          )}
          {tournament.status === 'active' && isAdmin && (
            (tournament.type === 'round_robin' && matches.length > 0 && matches.every(m => m.result || m.isBye)) ||
            (tournament.type !== 'round_robin' && tournament.currentRound >= tournament.totalRounds)
          ) && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={async () => {
              if (!confirm('Finish tournament and finalize results?')) return
              try {
                await api(`/tournaments/${id}/stop`, { 
                  method: 'POST',
                  body: JSON.stringify({ createdBy: user?.id })
                })
                setViewRound(tournament.currentRound)
                loadTournament()
              } catch (err: any) {
                alert(`Failed to finish tournament: ${err.message}`)
              }
            }}>
              <Trophy className="mr-2 h-4 w-4" />
              Finish Tournament
            </Button>
          )}
          {tournament.status === 'pending' && (
            <>
              {participants.some(p => p.userId === user?.id) ? (
                <Button onClick={leaveTournament} variant="destructive">
                  Leave
                </Button>
              ) : (
                <div className="flex gap-2 items-center">
                  {userDecks.length > 0 && (
                    <select
                      value={selectedDeckId || ''}
                      onChange={(e) => setSelectedDeckId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">No Deck</option>
                      {userDecks.map(deck => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button onClick={joinTournament} variant="secondary">Join Tournament</Button>
                </div>
              )}
              {isAdmin && (
                <>
                  <Button onClick={() => setShowAddParticipant(!showAddParticipant)} variant="outline">
                    Add Player
                  </Button>
                  <Button onClick={() => setShowGuestInput(!showGuestInput)} variant="outline">
                    Add Guest
                  </Button>
                  <Button onClick={startTournament}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Tournament
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showAddParticipant && (
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2">
          <div className="flex justify-between items-center">
             <label className="text-sm font-medium text-zinc-400">Add Registered User</label>
             <button 
               onClick={() => setShowCreateUser(true)} 
               className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
             >
               Create New User
             </button>
          </div>
          <UserSearchSelect 
            onSelect={addParticipant}
            placeholder="Search for user..."
          />
        </div>
      )}

      <CreateUserDialog 
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onSuccess={(newUser) => {
           addParticipant(newUser)
        }}
        requesterId={user?.id || 0}
      />

      {showGuestInput && (
        <div className="flex items-center gap-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <input 
            placeholder="Guest Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-white flex-1"
          />
          <Button onClick={addGuest}>Add Guest</Button>
        </div>
      )}

      {/* Matches Section */}
      {tournament.type === 'round_robin' ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 overflow-x-auto">
          <h2 className="text-xl font-semibold text-white mb-4">Match Grid</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border border-zinc-800 bg-zinc-950/50"></th>
                {participants.map(p => (
                  <th key={p.id} className="p-2 border border-zinc-800 bg-zinc-950/50 text-zinc-300 font-medium min-w-[100px]">
                    <div className="flex items-center gap-2 justify-center">
                      <UserAvatar username={p.username || p.guestName || `User ${p.userId}`} displayName={p.displayName || undefined} avatarUrl={p.userAvatarUrl} size="sm" className="h-5 w-5" />
                      <UserLabel username={p.username || p.guestName || `User ${p.userId}`} displayName={p.displayName || undefined} color={p.userColor} userId={p.userId || undefined} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((p1, i) => (
                <tr key={p1.id}>
                  <td className="p-2 border border-zinc-800 bg-zinc-950/50 text-zinc-300 font-medium">
                    <div className="flex items-center gap-2">
                      <UserAvatar username={p1.username || p1.guestName || `User ${p1.userId}`} displayName={p1.displayName || undefined} avatarUrl={p1.userAvatarUrl} size="sm" className="h-5 w-5" />
                      <UserLabel username={p1.username || p1.guestName || `User ${p1.userId}`} displayName={p1.displayName || undefined} color={p1.userColor} userId={p1.userId || undefined} />
                    </div>
                  </td>
                  {participants.map((p2, j) => {
                    if (i === j) {
                      return <td key={p2.id} className="p-2 border border-zinc-800 bg-zinc-950"></td>
                    }

                    const match = matches.find(m => 
                      (m.player1Id === p1.id && m.player2Id === p2.id) || 
                      (m.player1Id === p2.id && m.player2Id === p1.id)
                    )

                    if (match) {
                       // For round robin: allow any participant to report any match
                       const isUserParticipant = participants.some(p => p.userId === user?.id)
                       const canReport = isAdmin || isUserParticipant
                       
                       return (
                           <td 
                               key={p2.id} 
                               className={`p-2 border border-zinc-800 bg-zinc-950/50 text-center text-sm ${
                                   match.result ? 'text-zinc-200' : 'text-zinc-500'
                               } ${
                                   canReport ? 'cursor-pointer hover:bg-zinc-800/50' : ''
                               }`}
                               onClick={() => {
                                   if (canReport) {
                                       setReportingMatch(match)
                                       setScore1(match.result?.split('-')[0] || '')
                                       setScore2(match.result?.split('-')[1] || '')
                                       setFirstPlayerId(match.firstPlayerId || undefined)
                                   }
                               }}
                           >
                               {match.result || (
                                   canReport
                                   ? <span className="text-zinc-600 hover:text-zinc-400">Report</span> 
                                   : '-'
                               )}
                           </td>
                       )
                    } else {
                        return <td key={p2.id} className="p-2 border border-zinc-800 bg-zinc-950/50"></td>
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
             {(() => {
                const displayRound = viewRound || tournament.currentRound
                const roundMatches = matches.filter(m => m.roundNumber === displayRound)
                const isCurrentRound = displayRound === tournament.currentRound
                
                return (
                 <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">
                      {isCurrentRound 
                        ? (tournament.currentRound === tournament.totalRounds ? 'Final Round Matches' : `Current Round (${tournament.currentRound}) Matches`) 
                        : `Round ${displayRound} Matches`}
                    </h2>
                    
                    {tournament.currentRound > 1 && (
                      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                        {Array.from({ length: tournament.currentRound }, (_, i) => i + 1).map(round => (
                          <button
                            key={round}
                            onClick={() => setViewRound(round)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                              displayRound === round 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                          >
                            R{round}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {roundMatches.map(match => (
                    <MatchCard
                        key={match.id}
                        match={match}
                        participants={participants}
                        isCurrentRound={isCurrentRound}
                        currentUser={user}
                        isAdmin={isAdmin}
                        onReport={reportMatch}
                        onManualReport={(m) => {
                            setReportingMatch(m)
                            setScore1('')
                            setScore2('')
                            setFirstPlayerId(undefined)
                        }}
                        onEdit={(m) => {
                            setReportingMatch(m)
                            setScore1(m.result?.split('-')[0] || '')
                            setScore2(m.result?.split('-')[1] || '')
                            setFirstPlayerId(m.firstPlayerId || undefined)
                        }}
                    />
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Standings Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Standings</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">Deck</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium text-right">Score</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
              {[...participants].sort((a, b) => b.score - a.score).map((p, index) => (
                <tr key={p.id} className="hover:bg-zinc-900/80">
                  <td className="px-4 py-3 font-mono">{index + 1}</td>
                  <td className="px-4 py-3 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <UserAvatar username={p.username || p.guestName || `User ${p.userId}`} displayName={p.displayName || undefined} avatarUrl={p.userAvatarUrl} size="sm" />
                      <div>
                        <UserLabel username={p.username || p.guestName || `User ${p.userId}`} displayName={p.displayName || undefined} color={p.userColor} userId={p.userId || undefined} />
                        {p.dropped && <span className="ml-2 text-xs text-red-500">(Dropped)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {p.deckName ? (
                          p.deckLink ? (
                              <a href={p.deckLink} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline" style={{ color: p.deckColor || '#fff' }}>
                                  {p.deckName}
                              </a>
                          ) : (
                              <span className="text-sm font-medium" style={{ color: p.deckColor || '#fff' }}>
                                  {p.deckName}
                              </span>
                          )
                        ) : (
                          <span className="text-zinc-600 text-xs italic">-</span>
                        )}
                        {p.userId && (isAdmin || (user?.id === p.userId && tournament.status === 'pending')) && (
                            <button
                                onClick={() => {
                                    setNewDeckId(p.deckId || undefined)
                                    openEditDeck(p)
                                }}
                                className="text-zinc-500 hover:text-zinc-300 ml-1 transition-colors"
                                title="Edit Deck"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[150px]">{p.note || <span className="text-zinc-600 italic">No note</span>}</span>
                      {(isAdmin || (user?.id === p.userId && p.userId)) && (
                        <Button
                          variant="ghost"
                          size="sm" 
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                          onClick={async () => {
                            const newNote = prompt(p.note ? 'Edit Note:' : 'Add Note:', p.note || '')
                            if (newNote === null) return
                            try {
                              await api(`/tournaments/${id}/participants/${p.id}/note`, {
                                method: 'PUT',
                                body: JSON.stringify({ note: newNote, userId: user?.id })
                              })
                              loadTournament()
                            } catch (err: any) {
                              alert(`Failed to update note: ${err.message}`)
                            }
                          }}
                        >
                          {p.note ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">{p.score}</td>
                  {isAdmin && tournament.status !== 'completed' && (
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-zinc-500 hover:text-red-400 h-8 w-8 p-0"
                        onClick={async () => {
                          if (!confirm('Remove this participant?')) return
                          try {
                            await api(`/tournaments/${id}/participants/${p.id}`, {
                              method: 'DELETE',
                              body: JSON.stringify({ createdBy: user?.id })
                            })
                            loadTournament()
                          } catch (err) {
                            alert('Failed to remove participant')
                          }
                        }}
                      >
                        <span className="sr-only">Remove</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Reporting Modal */}
      {reportingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-white">Report Score</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    {participants.find(p => p.id === reportingMatch.player1Id)?.displayName || 
                     participants.find(p => p.id === reportingMatch.player1Id)?.username || 
                     participants.find(p => p.id === reportingMatch.player1Id)?.guestName || 
                     'Player 1'}
                  </label>
                  <input
                    type="number"
                    value={score1}
                    onChange={(e) => setScore1(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className="pt-6 text-zinc-500 font-bold">-</div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    {reportingMatch && (participants.find(p => p.id === reportingMatch.player2Id)?.displayName || 
                     participants.find(p => p.id === reportingMatch.player2Id)?.username || 
                     participants.find(p => p.id === reportingMatch.player2Id)?.guestName || 
                     'Player 2')}
                  </label>
                  <input
                    type="number"
                    value={score2}
                    onChange={(e) => setScore2(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

               {/* First Player Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Who Went First?</label>
                <div className="flex gap-2">
                   <Button
                      variant={firstPlayerId === reportingMatch.player1Id ? undefined : 'outline'}
                      size="sm"
                      className={`flex-1 ${firstPlayerId === reportingMatch.player1Id ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                      onClick={() => setFirstPlayerId(reportingMatch.player1Id)}
                   >
                     {(() => {
                        const p = participants.find(p => p.id === reportingMatch.player1Id)
                        return p?.username || p?.guestName || 'Player 1'
                     })()}
                   </Button>
                   <Button
                      variant={firstPlayerId === reportingMatch.player2Id ? undefined : 'outline'}
                      size="sm"
                      className={`flex-1 ${firstPlayerId === reportingMatch.player2Id ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                      onClick={() => {
                        setReportingMatch(reportingMatch.player2Id ? { ...reportingMatch, firstPlayerId: reportingMatch.player2Id } : reportingMatch)
                        setFirstPlayerId(reportingMatch.player2Id || undefined)
                      }}
                   >
                     {(() => {
                        if (!reportingMatch.player2Id) return 'Player 2'
                        const p = participants.find(p => p.id === reportingMatch.player2Id)
                        return p?.username || p?.guestName || 'Player 2'
                     })()}
                   </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setReportingMatch(null)}>Cancel</Button>
                <Button onClick={() => {
                  const s1 = parseInt(score1 || '0')
                  const s2 = parseInt(score2 || '0')
                  
                  if (isNaN(s1) || isNaN(s2)) {
                    alert('Invalid score')
                    return
                  }
                  
                  if (reportingMatch) {
                    reportMatch(reportingMatch, s1, s2, firstPlayerId)
                  }
                  setReportingMatch(null)
                }}>Submit Result</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deck Dialog */}
      <Dialog open={editDeckOpen} onOpenChange={setEditDeckOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Change Deck</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Select Deck</label>
                    <select
                        value={newDeckId ?? ''}
                        onChange={(e) => setNewDeckId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">No Deck</option>
                        {targetUserDecks.map(deck => (
                            <option key={deck.id} value={deck.id}>
                                {deck.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditDeckOpen(false)}>Cancel</Button>
                <Button onClick={saveDeckChange}>Save</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
