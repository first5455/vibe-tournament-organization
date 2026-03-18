import type { Match, Participant } from '../types'

interface TournamentInfo {
  name: string
  type?: 'swiss' | 'round_robin'
  status: string
  totalRounds: number
  currentRound: number
  startDate?: string
  endDate?: string
  createdByName?: string | null
}

function getPlayerName(p: Participant): string {
  return p.displayName || p.username || p.guestName || `Player ${p.id}`
}

function getSortedStandings(participants: Participant[], matches: Match[]): Participant[] {
  return [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const h2h = matches.find(m =>
      (m.player1Id === a.id && m.player2Id === b.id) ||
      (m.player1Id === b.id && m.player2Id === a.id)
    )
    if (h2h?.winnerId) {
      if (h2h.winnerId === a.id) return -1
      if (h2h.winnerId === b.id) return 1
    }
    return getPlayerName(a).localeCompare(getPlayerName(b))
  })
}

function formatMatchResult(match: Match, participants: Participant[]): { p1Name: string, p2Name: string, result: string, winner: string } {
  const p1 = participants.find(p => p.id === match.player1Id)
  const p2 = participants.find(p => p.id === match.player2Id)
  const p1Name = p1 ? getPlayerName(p1) : 'BYE'
  const p2Name = p2 ? getPlayerName(p2) : 'BYE'
  const winner = match.isBye ? p1Name : match.winnerId ? getPlayerName(participants.find(p => p.id === match.winnerId)!) : match.result ? 'Draw' : 'Pending'
  return { p1Name, p2Name, result: match.result || (match.isBye ? 'BYE' : '-'), winner }
}

// ========================
// EXCEL EXPORT
// ========================
export async function exportTournamentToExcel(
  tournament: TournamentInfo,
  participants: Participant[],
  matches: Match[]
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const standings = getSortedStandings(participants, matches)

  // Sheet 1: Tournament Info
  const infoData = [
    ['Tournament Name', tournament.name],
    ['Type', (tournament.type || 'swiss').replace('_', ' ')],
    ['Status', tournament.status],
    ['Total Rounds', tournament.totalRounds],
    ['Current Round', tournament.currentRound],
    ['Participants', participants.length],
    ['Start Date', tournament.startDate || '-'],
    ['End Date', tournament.endDate || '-'],
    ['Created By', tournament.createdByName || '-'],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 18 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info')

  // Sheet 2: Standings
  const standingsHeader = ['Rank', 'Player', 'Score', 'Deck', 'Note', 'Status']
  const standingsData = standings.map((p, i) => [
    i + 1,
    getPlayerName(p),
    p.score,
    p.deckName || '-',
    p.note || '-',
    p.dropped ? 'Dropped' : 'Active',
  ])
  const wsStandings = XLSX.utils.aoa_to_sheet([standingsHeader, ...standingsData])
  wsStandings['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsStandings, 'Standings')

  // Sheet 3+: One sheet per round
  const totalRounds = Math.max(...matches.map(m => m.roundNumber), 0)
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = matches.filter(m => m.roundNumber === round)
    const roundHeader = ['Match', 'Player 1', 'Player 2', 'Result', 'Winner', 'P1 MMR Change', 'P2 MMR Change']
    const roundData = roundMatches.map((m, i) => {
      const { p1Name, p2Name, result, winner } = formatMatchResult(m, participants)
      return [
        i + 1,
        p1Name,
        m.isBye ? 'BYE' : p2Name,
        result,
        winner,
        m.player1MmrChange ?? '-',
        m.player2MmrChange ?? '-',
      ]
    })
    const wsRound = XLSX.utils.aoa_to_sheet([roundHeader, ...roundData])
    wsRound['!cols'] = [{ wch: 7 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsRound, `Round ${round}`)
  }

  // Round Robin: add a cross-table sheet
  if (tournament.type === 'round_robin') {
    const header = ['Player', ...standings.map(p => getPlayerName(p))]
    const crossData = standings.map(p1 => {
      const row: (string | number)[] = [getPlayerName(p1)]
      standings.forEach(p2 => {
        if (p1.id === p2.id) {
          row.push('X')
          return
        }
        const match = matches.find(m =>
          (m.player1Id === p1.id && m.player2Id === p2.id) ||
          (m.player1Id === p2.id && m.player2Id === p1.id)
        )
        if (match?.result) {
          const [s1, s2] = match.result.split('-')
          const isP1 = match.player1Id === p1.id
          row.push(isP1 ? `${s1}-${s2}` : `${s2}-${s1}`)
        } else {
          row.push('-')
        }
      })
      return row
    })
    const wsCross = XLSX.utils.aoa_to_sheet([header, ...crossData])
    wsCross['!cols'] = header.map(() => ({ wch: 16 }))
    XLSX.utils.book_append_sheet(wb, wsCross, 'Cross Table')
  }

  XLSX.writeFile(wb, `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_tournament.xlsx`)
}

// ========================
// PDF EXPORT (Summary + Standings only)
// ========================
export async function exportTournamentToPDF(
  tournament: TournamentInfo,
  participants: Participant[],
  matches: Match[]
) {
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default
  const doc = new jsPDF()
  const standings = getSortedStandings(participants, matches)

  // Title
  doc.setFontSize(20)
  doc.text(tournament.name, 14, 20)

  // Tournament Info
  doc.setFontSize(10)
  doc.setTextColor(100)
  const typeLabel = (tournament.type || 'swiss').replace('_', ' ')
  const infoLine = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} | ${participants.length} Participants | Status: ${tournament.status}`
  doc.text(infoLine, 14, 28)

  if (tournament.startDate) {
    const dateLine = `Started: ${new Date(tournament.startDate).toLocaleDateString()}${tournament.endDate ? ` | Ended: ${new Date(tournament.endDate).toLocaleDateString()}` : ''}`
    doc.text(dateLine, 14, 34)
  }
  if (tournament.createdByName) {
    doc.text(`Created by: ${tournament.createdByName}`, 14, tournament.startDate ? 40 : 34)
  }

  // Winner highlight
  const startY = tournament.startDate ? (tournament.createdByName ? 48 : 42) : (tournament.createdByName ? 42 : 36)
  if (tournament.status === 'completed' && standings.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text(`Winner: ${getPlayerName(standings[0])}`, 14, startY)
  }

  // Standings Table
  const tableStartY = tournament.status === 'completed' && standings.length > 0 ? startY + 10 : startY

  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.text('Standings', 14, tableStartY)

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Rank', 'Player', 'Score', 'Deck', 'Status']],
    body: standings.map((p, i) => [
      i + 1,
      getPlayerName(p),
      p.score,
      p.deckName || '-',
      p.dropped ? 'Dropped' : 'Active',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  })

  // Summary stats
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 50
  if (finalY + 40 < doc.internal.pageSize.height) {
    doc.setFontSize(12)
    doc.text('Summary', 14, finalY + 12)
    doc.setFontSize(9)
    doc.setTextColor(80)

    const totalMatches = matches.filter(m => m.result && !m.isBye).length
    const completedMatches = matches.filter(m => m.result).length
    const byeCount = matches.filter(m => m.isBye).length
    const draws = matches.filter(m => m.result && !m.winnerId && !m.isBye).length

    doc.text(`Total Matches: ${totalMatches}`, 14, finalY + 20)
    doc.text(`Completed: ${completedMatches} | Byes: ${byeCount} | Draws: ${draws}`, 14, finalY + 26)
    doc.text(`Rounds: ${tournament.currentRound}/${tournament.totalRounds}`, 14, finalY + 32)
  }

  doc.save(`${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_summary.pdf`)
}
