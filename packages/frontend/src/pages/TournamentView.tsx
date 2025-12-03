import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { useAuth } from '../lib/auth'
import { Trophy, Users, Play } from 'lucide-react'
import { UserLabel } from '../components/UserLabel'

interface Participant {
  id: number
  userId: number | null
  guestName: string | null
  username?: string | null
  score: number
  dropped: boolean
  note?: string | null
  userColor?: string | null
}

interface Match {
  id: number
  roundNumber: number
  player1Id: number
  player2Id: number | null
  winnerId: number | null
  result: string | null
  isBye: boolean
}

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
  createdByColor?: string | null
}

export default function TournamentView() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

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
              console.log('Tournament updated, reloading...')
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

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [id])

  const [error, setError] = useState('')

  const loadTournament = async () => {
    if (!id) return
    setIsLoading(true)
    setError('')
    
    try {
      // Fetch tournament details first
      try {
        const { tournament } = await api(`/tournaments/${id}`)
        setTournament(tournament)
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

  const reportMatch = async (match: Match, s1: number, s2: number) => {
    if (!user?.id) {
      alert('You must be logged in to report results')
      return
    }

    const winnerId = s1 > s2 ? match.player1Id : (s2 > s1 ? match.player2Id : null)

    try {
      await api(`/matches/${match.id}/report`, {
        method: 'POST',
        body: JSON.stringify({
          player1Score: s1,
          player2Score: s2,
          winnerId,
          result: `${s1}-${s2}`,
          reportedBy: user.id
        })
      })
      loadTournament()
    } catch (e: any) {
      console.error('Report failed:', e)
      alert(e.message)
    }
  }

  const joinTournament = async () => {
    try {
      await api(`/tournaments/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id }),
      })
      loadTournament()
    } catch (err) {
      alert('Failed to join tournament')
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
  const [showGuestInput, setShowGuestInput] = useState(false)
  
  // Score Reporting Modal State
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  
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
      console.log('Sending guest request:', { name: guestName, createdBy: user.id })
      
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

  const isAdmin = user?.id === tournament.createdBy

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
              <Button size="sm" onClick={updateTournament}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400 capitalize border border-zinc-700">
                {tournament.type?.replace('_', ' ')}
              </span>
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
                Started: {new Date(tournament.startDate).toLocaleDateString('en-GB')}
              </span>
            )}
            {tournament.endDate && (
              <span className="text-xs text-zinc-500">
                • Finished: {new Date(tournament.endDate).toLocaleDateString('en-GB')}
              </span>
            )}
            {tournament.createdByName && (
              <span className="text-xs text-zinc-500 border-l border-zinc-700 pl-4 ml-2 flex items-center gap-1">
                Created by: <UserLabel username={tournament.createdByName} color={tournament.createdByColor} className="text-zinc-300" />
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
              <Button className="bg-red-500 hover:bg-red-600" onClick={deleteTournament}>Delete</Button>
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
                <Button disabled variant="secondary" className="opacity-50 cursor-not-allowed">
                  Joined
                </Button>
              ) : (
                <Button onClick={joinTournament} variant="secondary">Join Tournament</Button>
              )}
              {isAdmin && (
                <>
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

      {showGuestInput && (
        <div className="flex items-center gap-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <input 
            placeholder="Guest Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-white flex-1"
          />
          <Button size="sm" onClick={addGuest}>Add Guest</Button>
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
                    <UserLabel username={p.username || p.guestName || `User ${p.userId}`} color={p.userColor} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((p1, i) => (
                <tr key={p1.id}>
                  <td className="p-2 border border-zinc-800 bg-zinc-950/50 text-zinc-300 font-medium">
                    <UserLabel username={p1.username || p1.guestName || `User ${p1.userId}`} color={p1.userColor} />
                  </td>
                  {participants.map((p2, j) => {
                    if (i === j) {
                      return <td key={p2.id} className="p-2 border border-zinc-800 bg-zinc-950"></td>
                    }

                    const match = matches.find(m => 
                      (m.player1Id === p1.id && m.player2Id === p2.id) || 
                      (m.player1Id === p2.id && m.player2Id === p1.id)
                    )

                    if (!match) return <td key={p2.id} className="p-2 border border-zinc-800 text-zinc-600 text-center">-</td>

                    const isP1 = match.player1Id === p1.id
                    const score = match.result ? (isP1 ? match.result : match.result.split('-').reverse().join('-')) : null
                    
                    // Determine cell color based on result
                    let cellClass = "hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    if (score) {
                      const [s1, s2] = score.split('-').map(Number)
                      if (s1 > s2) cellClass += " bg-green-900/20 text-green-400"
                      else if (s2 > s1) cellClass += " bg-red-900/20 text-red-400"
                      else cellClass += " bg-zinc-800/30 text-zinc-400"
                    }

                    return (
                      <td 
                        key={p2.id} 
                        className={`p-2 border border-zinc-800 text-center ${cellClass}`}
                        onClick={() => {
                          if (tournament.status === 'completed' && !isAdmin) return
                          setReportingMatch(match)
                          setScore1('')
                          setScore2('')
                        }}
                      >
                        {score || <span className="text-zinc-600 text-xs">Play</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from({ length: tournament.currentRound }, (_, i) => tournament.currentRound - i).map(roundNum => {
            const roundMatches = matches.filter(m => m.roundNumber === roundNum)
            if (roundMatches.length === 0) return null
  
            const isCurrentRound = roundNum === tournament.currentRound
  
            return (
              <div key={roundNum} className={`rounded-xl border ${isCurrentRound ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-900 bg-zinc-950/30'} p-6`}>
                <h2 className={`text-xl font-semibold mb-4 ${isCurrentRound ? 'text-white' : 'text-zinc-500'}`}>
                  {isCurrentRound ? (tournament.currentRound === tournament.totalRounds ? 'Final Round Matches' : 'Current Round Matches') : `Round ${roundNum}`}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {roundMatches.map(match => {
                    const p1 = participants.find(p => p.id === match.player1Id)
                    const p2 = participants.find(p => p.id === match.player2Id)
                    const isParticipant = user && (p1?.userId === user.id || p2?.userId === user.id)
                    const canReport = (isAdmin || isParticipant) && isCurrentRound // Only allow report in current round
  
                    return (
                      <div key={match.id} className={`border rounded-lg p-4 flex items-center justify-between ${isCurrentRound ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-900 bg-zinc-950/50'}`}>
                        <div className="flex flex-col gap-2">
                          <div className={`flex items-center gap-2 ${match.winnerId === match.player1Id ? 'text-green-400 font-bold' : 'text-zinc-300'}`}>
                            <UserLabel 
                              username={p1?.username || p1?.guestName || (p1?.userId ? `User ${p1.userId}` : 'Unknown')} 
                              color={match.winnerId !== match.player1Id ? p1?.userColor : undefined}
                            />
                          </div>
                          <div className="text-zinc-600 text-xs">vs</div>
                          <div className={`flex items-center gap-2 ${match.winnerId === match.player2Id ? 'text-green-400 font-bold' : 'text-zinc-300'}`}>
                            {match.isBye ? <span className="italic text-zinc-500">Bye</span> : (
                              <UserLabel 
                                username={p2?.username || p2?.guestName || (p2?.userId ? `User ${p2.userId}` : 'Unknown')} 
                                color={match.winnerId !== match.player2Id ? p2?.userColor : undefined}
                              />
                            )}
                          </div>
                        </div>
  
                        <div className="flex flex-col items-end gap-2">
                          {match.result ? (
                            <span className={`text-sm font-mono px-2 py-1 rounded ${isCurrentRound ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500'}`}>{match.result}</span>
                          ) : (
                            <span className="text-xs text-zinc-500 italic">Pending</span>
                          )}
                          
                          {canReport && !match.result && !match.isBye && (
                            <div className="flex gap-2">
                              {isParticipant && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                      if (p1?.userId === user?.id) reportMatch(match, 1, 0)
                                      else if (p2?.userId === user?.id) reportMatch(match, 0, 1)
                                    }}
                                  >
                                    Win
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => {
                                      if (p1?.userId === user?.id) reportMatch(match, 0, 1)
                                      else if (p2?.userId === user?.id) reportMatch(match, 1, 0)
                                    }}
                                  >
                                    Loss
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="outline" onClick={() => {
                                setReportingMatch(match)
                                setScore1('')
                                setScore2('')
                              }}>
                                Manual
                              </Button>
                            </div>
                          )}
                          {isAdmin && match.result && isCurrentRound && tournament.status !== 'completed' && (
                            <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-white" onClick={() => {
                              setReportingMatch(match)
                              setScore1(match.result?.split('-')[0] || '')
                              setScore2(match.result?.split('-')[1] || '')
                            }}>
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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
                    <UserLabel username={p.username || p.guestName || `User ${p.userId}`} color={p.userColor} />
                    {p.dropped && <span className="ml-2 text-xs text-red-500">(Dropped)</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    <div className="flex items-center gap-2 group/note">
                      <span className="truncate max-w-[150px]">{p.note || '-'}</span>
                      {(isAdmin || (user?.id === p.userId && p.userId)) && (
                        <Button
                          variant="ghost"
                          size="sm" 
                          className="h-6 w-6 p-0 opacity-0 group-hover/note:opacity-100 transition-opacity"
                          onClick={async () => {
                            const newNote = prompt('Edit Note:', p.note || '')
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
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
                    {participants.find(p => p.id === reportingMatch.player1Id)?.username || 
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
                    {participants.find(p => p.id === reportingMatch.player2Id)?.username || 
                     participants.find(p => p.id === reportingMatch.player2Id)?.guestName || 
                     'Player 2'}
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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setReportingMatch(null)}>Cancel</Button>
                <Button onClick={() => {
                  const s1 = parseInt(score1 || '0')
                  const s2 = parseInt(score2 || '0')
                  
                  if (isNaN(s1) || isNaN(s2)) {
                    alert('Invalid score')
                    return
                  }
                  
                  reportMatch(reportingMatch, s1, s2)
                  setReportingMatch(null)
                }}>Submit Result</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
