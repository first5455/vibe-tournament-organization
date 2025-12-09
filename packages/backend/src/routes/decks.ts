import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, decks, matches, participants, duelRooms } from '../db/schema'
import { eq, desc, and, or, sql, inArray } from 'drizzle-orm'

export const deckRoutes = new Elysia({ prefix: '/decks' })
  .get('/', async ({ query, set }) => {
    const { userId } = query
    if (!userId) {
      set.status = 400
      return { error: 'Missing userId' }
    }

    const userDecks = await db.select()
      .from(decks)
      .where(eq(decks.userId, parseInt(userId)))
      .orderBy(desc(decks.createdAt))
      .all()
    
    // Calculate stats for each deck
    const decksWithStats = await Promise.all(userDecks.map(async (deck) => {
        // 1. Duel Room Stats
        const duels = await db.select({
            id: duelRooms.id,
            winnerId: duelRooms.winnerId,
            player1Id: duelRooms.player1Id,
            player2Id: duelRooms.player2Id,
            player1DeckId: duelRooms.player1DeckId,
            player2DeckId: duelRooms.player2DeckId
        })
        .from(duelRooms)
        .where(
            and(
                eq(duelRooms.status, 'completed'),
                or(eq(duelRooms.player1DeckId, deck.id), eq(duelRooms.player2DeckId, deck.id))
            )
        )
        .all()

        let duelWins = 0
        let duelTotal = duels.length

        for (const d of duels) {
            if (d.player1DeckId === deck.id && d.winnerId === d.player1Id) duelWins++
            if (d.player2DeckId === deck.id && d.winnerId === d.player2Id) duelWins++
        }

        // 2. Tournament Stats
        // Find participant entries for this deck
        const parts = await db.select({ id: participants.id }).from(participants).where(eq(participants.deckId, deck.id)).all()
        const partIds = parts.map(p => p.id)

        let tourneyWins = 0
        let tourneyTotal = 0

        if (partIds.length > 0) {
            const tourneyMatches = await db.select({
                winnerId: matches.winnerId,
                player1Id: matches.player1Id,
                player2Id: matches.player2Id
            })
            .from(matches)
            .where(
                and(
                    sql`${matches.winnerId} IS NOT NULL`,
                    or(
                        inArray(matches.player1Id, partIds),
                        inArray(matches.player2Id, partIds)
                    )
                )
            )
            .all()

            tourneyTotal = tourneyMatches.length
            for (const m of tourneyMatches) {
                if (partIds.includes(m.winnerId!)) tourneyWins++
            }
        }

        const totalWins = duelWins + tourneyWins
        const totalGames = duelTotal + tourneyTotal
        const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
        
        return {
            ...deck,
            winRate,
            totalGames, // Optional: useful to show
            totalWins
        }
    }))

    return decksWithStats
  }, {
    query: t.Object({
      userId: t.String()
    })
  })
  .post('/', async ({ body, set }) => {
    const { userId, name, link, color } = body

    // Validation? User exists?
    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      set.status = 404
      return { error: 'User not found' }
    }

    const result = await db.insert(decks).values({
      userId,
      name,
      link,
      color: color || '#ffffff'
    }).returning().get()

    return { deck: result }
  }, {
    body: t.Object({
      userId: t.Number(),
      name: t.String(),
      link: t.Optional(t.String()),
      color: t.Optional(t.String())
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const deckId = parseInt(params.id)
    const { requesterId, name, link, color } = body

    const deck = await db.select().from(decks).where(eq(decks.id, deckId)).get()
    if (!deck) {
      set.status = 404
      return { error: 'Deck not found' }
    }

    // Auth check: Owner or Admin
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!requester) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const isAdmin = requester.role === 'admin'
    const isOwner = deck.userId === requesterId

    if (!isAdmin && !isOwner) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (link !== undefined) updates.link = link
    if (color !== undefined) updates.color = color

    await db.update(decks)
      .set(updates)
      .where(eq(decks.id, deckId))
      .run()

    const updatedDeck = await db.select().from(decks).where(eq(decks.id, deckId)).get()
    return { deck: updatedDeck }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      name: t.Optional(t.String()),
      link: t.Optional(t.String()),
      color: t.Optional(t.String())
    })
  })
  .delete('/:id', async ({ params, body, set }) => {
    const deckId = parseInt(params.id)
    const { requesterId } = body

    const deck = await db.select().from(decks).where(eq(decks.id, deckId)).get()
    if (!deck) {
      set.status = 404
      return { error: 'Deck not found' }
    }

    // Auth check: Owner or Admin
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!requester) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const isAdmin = requester.role === 'admin'
    const isOwner = deck.userId === requesterId

    if (!isAdmin && !isOwner) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    await db.delete(decks).where(eq(decks.id, deckId)).run()

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number()
    })
  })
