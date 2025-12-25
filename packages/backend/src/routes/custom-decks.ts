import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, customDecks, customDeckCards, roles, permissions, rolePermissions } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { uploadToChibisafe, deleteFromChibisafe } from '../lib/chibisafe'

export const customDeckRoutes = new Elysia({ prefix: '/custom-decks' })
  // Upload image to chibisafe
  .post('/upload-image', async ({ body, set }) => {
    const { requesterId, imageData, fileName } = body

    // Auth check - must be logged in
    const user = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    try {
      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      
      // Upload to chibisafe and get URL + UUID
      const { url: imageUrl, uuid: chibisafeUuid } = await uploadToChibisafe(buffer, fileName || 'card.png')
      
      return { imageUrl, chibisafeUuid }
    } catch (err: any) {
      console.error('Image upload error:', err)
      set.status = 500
      return { error: err.message || 'Failed to upload image' }
    }
  }, {
    body: t.Object({
      requesterId: t.Number(),
      imageData: t.String(),
      fileName: t.Optional(t.String())
    })
  })
  
  // Get all custom decks for a user
  .get('/', async ({ query, set }) => {
    const { userId, gameId } = query
    
    if (!userId) {
      set.status = 400
      return { error: 'userId is required' }
    }

    let conditions = [eq(customDecks.userId, parseInt(userId))]
    
    if (gameId) {
      conditions.push(eq(customDecks.gameId, parseInt(gameId)))
    }

    const decks = await db.select()
      .from(customDecks)
      .where(and(...conditions))
      .orderBy(desc(customDecks.updatedAt))
      .all()

    // Get card counts for each deck
    const decksWithCounts = await Promise.all(decks.map(async (deck) => {
      const cards = await db.select()
        .from(customDeckCards)
        .where(eq(customDeckCards.customDeckId, deck.id))
        .all()
      
      const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0)
      
      return {
        ...deck,
        cardCount: cards.length,
        totalCards
      }
    }))

    return decksWithCounts
  }, {
    query: t.Object({
      userId: t.String(),
      gameId: t.Optional(t.String())
    })
  })
  
  // Admin: Get all custom decks with user info
  .get('/admin-all', async ({ query, set }) => {
    const { requesterId, gameId } = query
    
    if (!requesterId) {
      set.status = 400
      return { error: 'requesterId is required' }
    }

    // Check admin permission
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, parseInt(requesterId)))
    .all()

    const hasManagePermission = requesterPermissions.some(r => r.permissionSlug === 'decks.manage' || r.permissionSlug === 'admin.access')
    
    if (!hasManagePermission) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    let conditions = []
    
    if (gameId) {
      conditions.push(eq(customDecks.gameId, parseInt(gameId)))
    }

    const decksQuery = db.select({
      id: customDecks.id,
      userId: customDecks.userId,
      name: customDecks.name,
      description: customDecks.description,
      gameId: customDecks.gameId,
      createdAt: customDecks.createdAt,
      updatedAt: customDecks.updatedAt,
      username: users.username,
      displayName: users.displayName,
      userAvatarUrl: users.avatarUrl
    })
    .from(customDecks)
    .leftJoin(users, eq(customDecks.userId, users.id))
    .orderBy(desc(customDecks.updatedAt))

    const decks = conditions.length > 0 
      ? await decksQuery.where(and(...conditions)).all()
      : await decksQuery.all()

    // Get card counts for each deck
    const decksWithCounts = await Promise.all(decks.map(async (deck) => {
      const cards = await db.select()
        .from(customDeckCards)
        .where(eq(customDeckCards.customDeckId, deck.id))
        .all()
      
      const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0)
      
      return {
        ...deck,
        cardCount: cards.length,
        totalCards
      }
    }))

    return decksWithCounts
  }, {
    query: t.Object({
      requesterId: t.String(),
      gameId: t.Optional(t.String())
    })
  })
  
  // Get a specific custom deck with all its cards
  .get('/:id', async ({ params, set }) => {
    const deckId = parseInt(params.id)
    
    const deck = await db.select()
      .from(customDecks)
      .where(eq(customDecks.id, deckId))
      .get()
    
    if (!deck) {
      set.status = 404
      return { error: 'Custom deck not found' }
    }

    const cards = await db.select()
      .from(customDeckCards)
      .where(eq(customDeckCards.customDeckId, deckId))
      .orderBy(customDeckCards.sortOrder)
      .all()

    return {
      ...deck,
      cards
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  
  // Create new custom deck
  .post('/', async ({ body, set }) => {
    const { requesterId, userId, name, description, gameId } = body

    // Validation
    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      set.status = 404
      return { error: 'User not found' }
    }

    // Auth check: user can only create for themselves or admin can create for anyone
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasManagePermission = requesterPermissions.some(r => r.permissionSlug === 'decks.manage')
    const isOwner = userId === requesterId

    if (!hasManagePermission && !isOwner) {
      set.status = 403
      return { error: 'Forbidden: Cannot create custom deck for another user' }
    }

    const result = await db.insert(customDecks).values({
      userId,
      name,
      description: description || null,
      gameId: gameId || null,
    }).returning().get()

    return { deck: result }
  }, {
    body: t.Object({
      requesterId: t.Number(),
      userId: t.Number(),
      name: t.String(),
      description: t.Optional(t.String()),
      gameId: t.Optional(t.Number())
    })
  })
  
  // Update custom deck
  .put('/:id', async ({ params, body, set }) => {
    const deckId = parseInt(params.id)
    const { requesterId, name, description } = body

    const deck = await db.select().from(customDecks).where(eq(customDecks.id, deckId)).get()
    if (!deck) {
      set.status = 404
      return { error: 'Custom deck not found' }
    }

    // Auth check: Owner or Admin
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasManagePermission = requesterPermissions.some(r => r.permissionSlug === 'decks.manage')
    const isOwner = deck.userId === requesterId

    if (!hasManagePermission && !isOwner) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const updates: any = { updatedAt: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description

    await db.update(customDecks)
      .set(updates)
      .where(eq(customDecks.id, deckId))
      .run()

    const updatedDeck = await db.select().from(customDecks).where(eq(customDecks.id, deckId)).get()
    return { deck: updatedDeck }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      name: t.Optional(t.String()),
      description: t.Optional(t.String())
    })
  })
  
  // Delete custom deck
  .delete('/:id', async ({ params, body, set }) => {
    const deckId = parseInt(params.id)
    const { requesterId } = body

    const deck = await db.select().from(customDecks).where(eq(customDecks.id, deckId)).get()
    if (!deck) {
      set.status = 404
      return { error: 'Custom deck not found' }
    }

    // Auth check: Owner or Admin
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasManagePermission = requesterPermissions.some(r => r.permissionSlug === 'decks.manage')
    const isOwner = deck.userId === requesterId

    if (!hasManagePermission && !isOwner) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Get all cards to delete their images from chibisafe
    const cards = await db.select()
      .from(customDeckCards)
      .where(eq(customDeckCards.customDeckId, deckId))
      .all()
    
    // Delete images from chibisafe using UUID
    for (const card of cards) {
      await deleteFromChibisafe(card.chibisafeUuid)
    }

    await db.delete(customDecks).where(eq(customDecks.id, deckId)).run()

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number()
    })
  })
  
  // Add card to custom deck
  .post('/:id/cards', async ({ params, body, set }) => {
    const deckId = parseInt(params.id)
    const { requesterId, cardName, imageUrl, chibisafeUuid, quantity } = body

    const deck = await db.select().from(customDecks).where(eq(customDecks.id, deckId)).get()
    if (!deck) {
      set.status = 404
      return { error: 'Custom deck not found' }
    }

    // Auth check
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasManagePermission = requesterPermissions.some(r => r.permissionSlug === 'decks.manage')
    const isOwner = deck.userId === requesterId

    if (!hasManagePermission && !isOwner) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Get the current max sort order
    const cards = await db.select()
      .from(customDeckCards)
      .where(eq(customDeckCards.customDeckId, deckId))
      .all()
    
    const maxSortOrder = cards.length > 0 ? Math.max(...cards.map(c => c.sortOrder)) : -1

    const result = await db.insert(customDeckCards).values({
      customDeckId: deckId,
      cardName: cardName || null,
      imageUrl,
      chibisafeUuid: chibisafeUuid || null,
      quantity: quantity || 1,
      sortOrder: maxSortOrder + 1
    }).returning().get()

    // Update deck's updatedAt
    await db.update(customDecks)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(customDecks.id, deckId))
      .run()

    return { card: result }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      cardName: t.Optional(t.String()),
      imageUrl: t.String(),
      chibisafeUuid: t.Optional(t.String()),
      quantity: t.Optional(t.Number())
    })
  })
  
  // Update card in custom deck
  .put('/:id/cards/:cardId', async ({ params, body, set }) => {
    const deckId = parseInt(params.id)
    const cardId = parseInt(params.cardId)
    const { requesterId, cardName, quantity } = body

    const deck = await db.select().from(customDecks).where(eq(customDecks.id, deckId)).get()
    if (!deck) {
      set.status = 404
      return { error: 'Custom deck not found' }
    }

    const card = await db.select().from(customDeckCards).where(eq(customDeckCards.id, cardId)).get()
    if (!card || card.customDeckId !== deckId) {
      set.status = 404
      return { error: 'Card not found in this deck' }
    }

    // Auth check
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasManagePermission = requesterPermissions.some(r => r.permissionSlug === 'decks.manage')
    const isOwner = deck.userId === requesterId

    if (!hasManagePermission && !isOwner) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const updates: any = {}
    if (cardName !== undefined) updates.cardName = cardName
    if (quantity !== undefined) updates.quantity = Math.max(1, quantity) // Minimum 1

    await db.update(customDeckCards)
      .set(updates)
      .where(eq(customDeckCards.id, cardId))
      .run()

    // Update deck's updatedAt
    await db.update(customDecks)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(customDecks.id, deckId))
      .run()

    const updatedCard = await db.select().from(customDeckCards).where(eq(customDeckCards.id, cardId)).get()
    return { card: updatedCard }
  }, {
    params: t.Object({
      id: t.String(),
      cardId: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      cardName: t.Optional(t.String()),
      quantity: t.Optional(t.Number())
    })
  })
  
  // Delete card from custom deck
  .delete('/:id/cards/:cardId', async ({ params, body, set }) => {
    const deckId = parseInt(params.id)
    const cardId = parseInt(params.cardId)
    const { requesterId } = body

    const deck = await db.select().from(customDecks).where(eq(customDecks.id, deckId)).get()
    if (!deck) {
      set.status = 404
      return { error: 'Custom deck not found' }
    }

    const card = await db.select().from(customDeckCards).where(eq(customDeckCards.id, cardId)).get()
    if (!card || card.customDeckId !== deckId) {
      set.status = 404
      return { error: 'Card not found in this deck' }
    }

    // Auth check
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasManagePermission = requesterPermissions.some(r => r.permissionSlug === 'decks.manage')
    const isOwner = deck.userId === requesterId

    if (!hasManagePermission && !isOwner) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Delete image from chibisafe using UUID before deleting from database
    await deleteFromChibisafe(card.chibisafeUuid)

    await db.delete(customDeckCards).where(eq(customDeckCards.id, cardId)).run()

    // Update deck's updatedAt
    await db.update(customDecks)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(customDecks.id, deckId))
      .run()

    return { success: true }
  }, {
    params: t.Object({
      id: t.String(),
      cardId: t.String()
    }),
    body: t.Object({
      requesterId: t.Number()
    })
  })
  
  // Export deck to text format
  .get('/:id/export', async ({ params, set }) => {
    const deckId = parseInt(params.id)
    
    const deck = await db.select()
      .from(customDecks)
      .where(eq(customDecks.id, deckId))
      .get()
    
    if (!deck) {
      set.status = 404
      return { error: 'Custom deck not found' }
    }

    const cards = await db.select()
      .from(customDeckCards)
      .where(eq(customDeckCards.customDeckId, deckId))
      .orderBy(customDeckCards.sortOrder)
      .all()

    // Format: "<quantity> x <image_url>"
    const lines = cards.map(card => `${card.quantity} x ${card.imageUrl}`)
    const exportText = lines.join('\n')

    return {
      deckName: deck.name,
      exportText,
      totalCards: cards.reduce((sum, card) => sum + card.quantity, 0),
      uniqueCards: cards.length
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
