export interface User {
  id: number
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  assignedRole?: { id: number, name: string } | null
  permissions?: string[]
  color?: string | null
  createdAt?: string
  stats?: {
    gameId: number
    gameName: string
    mmr: number
    wins: number
    losses: number
    draws: number
  }[]
}

export interface Deck {
  id: number
  userId: number
  name: string
  link?: string | null
  color: string
  civilizations?: any[]
  createdAt?: string
  gameId?: number
}

export interface Participant {
  id: number
  userId: number | null
  guestName: string | null
  username?: string | null
  displayName?: string | null
  score: number
  dropped?: boolean
  userAvatarUrl?: string | null
  userColor?: string | null
  deckName?: string | null
  deckLink?: string | null
  deckColor?: string | null
  deckId?: number | null
  note?: string | null
}

export interface Match {
  id: number
  roundNumber: number
  player1Id: number
  player2Id: number | null
  winnerId: number | null
  result: string | null
  isBye: boolean
  player1MmrChange?: number | null
  player2MmrChange?: number | null
  player1Name?: string
  player2Name?: string
  firstPlayerId?: number | null
}
