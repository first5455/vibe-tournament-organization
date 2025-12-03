
function generateRound(players: any[], roundNumber: number) {
  const n = players.length
  const isOdd = n % 2 !== 0
  const dummyId = -1
  
  const currentPlayers = isOdd ? [...players, { id: dummyId }] : [...players]
  const totalPlayers = currentPlayers.length
  const half = totalPlayers / 2

  // Rotate
  const currentRoundPlayers = [...currentPlayers]
  for (let r = 0; r < roundNumber - 1; r++) {
    const last = currentRoundPlayers.pop()!
    currentRoundPlayers.splice(1, 0, last)
  }

  const pairings = []
  for (let i = 0; i < half; i++) {
    const p1 = currentRoundPlayers[i]
    const p2 = currentRoundPlayers[totalPlayers - 1 - i]
    pairings.push({ p1: p1.id, p2: p2.id })
  }
  return pairings
}

const players = [{ id: 1 }, { id: 2 }, { id: 3 }]
console.log('Players:', players)

for (let r = 1; r <= 3; r++) {
  console.log(`Round ${r}:`, generateRound(players, r))
}
