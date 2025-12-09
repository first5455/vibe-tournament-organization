import { useState, useEffect } from 'react'
import { Match, Participant, User } from '../types'
import { UserAvatar } from './UserAvatar'
import { UserLabel } from './UserLabel'
import { Button } from './ui/button'

interface MatchCardProps {
  match: Match
  participants: Participant[]
  isCurrentRound: boolean
  currentUser: User | null
  isAdmin: boolean
  onReport: (match: Match, s1: number, s2: number, firstPlayerId?: number) => void
  onManualReport: (match: Match) => void
  onEdit: (match: Match) => void
}

export function MatchCard({ 
  match, 
  participants, 
  isCurrentRound, 
  currentUser, 
  isAdmin, 
  onReport,
  onManualReport,
  onEdit
}: MatchCardProps) {
  const p1 = participants.find(p => p.id === match.player1Id)
  const p2 = participants.find(p => p.id === match.player2Id)
  const isParticipant = currentUser && (p1?.userId === currentUser.id || p2?.userId === currentUser.id)
  const canReport = (isAdmin || isParticipant) && isCurrentRound

  // Local state for first player selection (defaults to match record if set)
  const [selectedFirstPlayerId, setSelectedFirstPlayerId] = useState<number | undefined>(match.firstPlayerId || undefined)

  // Update local state if match updates (e.g. from websocket or refresh)
  useEffect(() => {
    if (match.firstPlayerId) {
        setSelectedFirstPlayerId(match.firstPlayerId)
    }
  }, [match.firstPlayerId])

  return (
    <div className={`border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isCurrentRound ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-900 bg-zinc-950/50'}`}>
      <div className="flex flex-col gap-2 flex-1">
        {/* Player 1 */}
        <div className={`flex items-center gap-2 ${match.winnerId === match.player1Id ? 'font-bold' : ''}`}>
          <UserAvatar 
            username={p1?.username || p1?.guestName || (p1?.userId ? `User ${p1.userId}` : 'Unknown')} 
            displayName={p1?.displayName || undefined}
            avatarUrl={p1?.userAvatarUrl}
            size="sm"
          />
          <UserLabel 
            username={p1?.username || p1?.guestName || (p1?.userId ? `User ${p1.userId}` : 'Unknown')} 
            displayName={p1?.displayName || undefined}
            color={p1?.userColor}
            userId={p1?.userId || undefined}
          />
          {p1?.deckName && (
              p1.deckLink ? (
                  <a href={p1.deckLink} target="_blank" rel="noreferrer" className="text-xs font-medium truncate max-w-[100px] hover:underline" style={{ color: p1.deckColor || '#fff' }}>
                      {p1.deckName}
                  </a>
              ) : (
                  <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: p1.deckColor || '#fff' }}>
                      {p1.deckName}
                  </span>
              )
          )}
          {match.result && (
            <div className="flex items-center gap-1">
              <span className={`text-xs px-1.5 py-0.5 rounded ${match.winnerId === match.player1Id ? 'bg-green-900/30 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                {match.winnerId === match.player1Id ? 'Win' : 'Lose'}
              </span>
              {match.player1MmrChange != null && (
                <span className={`text-xs font-mono ml-1 ${match.player1MmrChange > 0 ? 'text-green-500' : match.player1MmrChange < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                  {match.player1MmrChange > 0 ? '+' : ''}{match.player1MmrChange}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="text-zinc-600 text-xs pl-2">vs</div>
        
        {/* Player 2 */}
        <div className={`flex items-center gap-2 ${match.winnerId === match.player2Id ? 'font-bold' : ''}`}>
          {match.isBye ? <span className="italic text-zinc-500">Bye</span> : (
            <>
              <UserAvatar 
                username={p2?.username || p2?.guestName || (p2?.userId ? `User ${p2.userId}` : 'Unknown')} 
                displayName={p2?.displayName || undefined}
                avatarUrl={p2?.userAvatarUrl}
                size="sm"
              />
              <UserLabel 
                username={p2?.username || p2?.guestName || (p2?.userId ? `User ${p2.userId}` : 'Unknown')} 
                displayName={p2?.displayName || undefined}
                color={p2?.userColor}
                userId={p2?.userId || undefined}
              />
              {p2?.deckName && (
                  p2.deckLink ? (
                      <a href={p2.deckLink} target="_blank" rel="noreferrer" className="text-xs font-medium truncate max-w-[100px] hover:underline" style={{ color: p2.deckColor || '#fff' }}>
                          {p2.deckName}
                      </a>
                  ) : (
                      <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: p2.deckColor || '#fff' }}>
                          {p2.deckName}
                      </span>
                  )
              )}
              {match.result && (
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${match.winnerId === match.player2Id ? 'bg-green-900/30 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                    {match.winnerId === match.player2Id ? 'Win' : 'Lose'}
                  </span>
                  {match.player2MmrChange != null && (
                    <span className={`text-xs font-mono ml-1 ${match.player2MmrChange > 0 ? 'text-green-500' : match.player2MmrChange < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                      {match.player2MmrChange > 0 ? '+' : ''}{match.player2MmrChange}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {match.result ? (
            <div className="flex flex-col items-end gap-1">
                <span className={`text-sm font-mono px-2 py-1 rounded ${isCurrentRound ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500'}`}>{match.result}</span>
                {match.firstPlayerId && (
                    <span className="text-xs text-zinc-500">
                        First: {match.firstPlayerId === p1?.id ? (p1?.username || 'P1') : (p2?.username || 'P2')}
                    </span>
                )}
            </div>
        ) : (
          <span className="text-xs text-zinc-500 italic">Pending</span>
        )}
        
        {canReport && !match.result && !match.isBye && (
          <div className="flex flex-col gap-2 items-end">
             {/* First Player Toggle */}
             <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-bold px-1">First:</span>
                <button
                    onClick={() => setSelectedFirstPlayerId(p1?.id)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${selectedFirstPlayerId === p1?.id ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                >
                    P1
                </button>
                <button
                    onClick={() => setSelectedFirstPlayerId(p2?.id)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${selectedFirstPlayerId === p2?.id ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    disabled={!p2}
                >
                    P2
                </button>
             </div>

             <div className="flex gap-2">
                {isParticipant && (
                    <>
                    <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                        if (p1?.userId === currentUser?.id) onReport(match, 1, 0, selectedFirstPlayerId)
                        else if (p2?.userId === currentUser?.id) onReport(match, 0, 1, selectedFirstPlayerId)
                        }}
                    >
                        Win
                    </Button>
                    <Button 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                        if (p1?.userId === currentUser?.id) onReport(match, 0, 1, selectedFirstPlayerId)
                        else if (p2?.userId === currentUser?.id) onReport(match, 1, 0, selectedFirstPlayerId)
                        }}
                    >
                        Loss
                    </Button>
                    </>
                )}
                <Button size="sm" variant="outline" onClick={() => onManualReport(match)}>
                    Manual
                </Button>
            </div>
          </div>
        )}
        {isAdmin && match.result && isCurrentRound && (
          <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-white" onClick={() => onEdit(match)}>
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}
