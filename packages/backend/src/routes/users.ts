import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, participants, tournaments, duelRooms, matches, decks, userGameStats, games, roles, permissions, rolePermissions, systemSettings } from '../db/schema'
import { eq, desc, sql, or, and, isNull } from 'drizzle-orm'
import { getRank } from '../utils'
import { events, EVENTS } from '../lib/events'


export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/search', async ({ query }) => {
    const { q } = query
    if (!q || q.length < 2) return []

    const searchPattern = `%${q}%`
    return await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(and(
        or(
          sql`lower(${users.username}) like lower(${searchPattern})`,
          sql`lower(${users.displayName}) like lower(${searchPattern})`
        ),
        sql`${users.passwordHash} != 'deleted'`
    ))
    .limit(10)
    .all()
  }, {
    query: t.Object({
      q: t.String()
    })
  })
  .post('/', async ({ body, set }) => {
    const { requesterId, username, password, displayName } = body
    
    // Auth check
    const requesterPermissions = await db.select({
      roleName: roles.name,
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'users.manage')

    if (!hasPermission) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Check existing
    const existing = await db.select().from(users).where(eq(users.username, username)).get()
    if (existing) {
      set.status = 400
      return { error: 'Username already taken' }
    }

    const passwordHash = await Bun.password.hash(password || 'password') // Default password if not provided, though generic
    
    // Fetch default role
    let defaultRoleId: number | undefined
    const setting = await db.select().from(systemSettings).where(eq(systemSettings.key, 'default_role_id')).get()
    
    if (setting) {
        defaultRoleId = parseInt(setting.value)
    }
    
    const result = await db.insert(users).values({
      username,
      displayName: displayName || username,
      passwordHash,
      roleId: defaultRoleId, // Assign default role ID
      color: '#3f3f46',
    }).returning().get()

    // Initialize MMR for all games
    const allGames = await db.select().from(games).all()
    for (const game of allGames) {
        await db.insert(userGameStats).values({
            userId: result.id,
            gameId: game.id,
            mmr: 1000,
            wins: 0,
            losses: 0,
            draws: 0
        }).run()
    }

    return { user: result }
  }, {
    body: t.Object({
      requesterId: t.Number(),
      username: t.String(),
      password: t.Optional(t.String()),
      displayName: t.Optional(t.String())
    })
  })
  .get('/leaderboard', async ({ query }) => {
    const gameId = query.gameId ? parseInt(query.gameId) : undefined

    if (gameId) {
        return await db.select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            mmr: userGameStats.mmr, // Use game specific MMR
            color: users.color,
            avatarUrl: users.avatarUrl,
        })
        .from(users)
        .innerJoin(userGameStats, eq(users.id, userGameStats.userId))
        .where(and(
            eq(userGameStats.gameId, gameId),
            sql`${users.passwordHash} != 'deleted'`
        ))
        .orderBy(desc(userGameStats.mmr))
        .limit(10)
    }

    // Fallback or global view (maybe sum of all MMRs? or just raw user table for backward compat until migration)
    // If no gameId provided, we can either return empty MMR or default to first game?
    // Let's return 0 as "No Game Selected"
    return await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      color: users.color,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(sql`${users.passwordHash} != 'deleted'`)
    .limit(10)
  }, {
    query: t.Object({
        gameId: t.Optional(t.String())
    })
  })
  .get('/:id', async ({ params, set }) => {
    const user = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      createdAt: users.createdAt,
      roleId: users.roleId,
      color: users.color,
      avatarUrl: users.avatarUrl,
      passwordHash: users.passwordHash,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.id, parseInt(params.id)))
    .get()

    if (!user || user.passwordHash === 'deleted') {
      set.status = 404
      return { error: 'User not found' }
    }

    // Fetch game stats
    const stats = await db.select({
        gameId: userGameStats.gameId,
        gameName: games.name,
        mmr: userGameStats.mmr,
        wins: userGameStats.wins,
        losses: userGameStats.losses,
        draws: userGameStats.draws,
        duelWins: userGameStats.duelWins,
        duelLosses: userGameStats.duelLosses,
        duelDraws: userGameStats.duelDraws,
        tournamentWins: userGameStats.tournamentWins,
        tournamentLosses: userGameStats.tournamentLosses,
        tournamentDraws: userGameStats.tournamentDraws
    })
    .from(userGameStats)
    .leftJoin(games, eq(userGameStats.gameId, games.id))
    .where(eq(userGameStats.userId, user.id))
    .all()

    // Rank is game-specific. We return 0 here as legacy support.
    const rank = 0 

    // Fetch role and permissions
    const roleId = (user as any).roleId
    const role = await db.select().from(roles).where(eq(roles.id, roleId || 0)).get()
    const perms = await db
        .select({ slug: permissions.slug })
        .from(permissions)
        .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, (user as any).roleId || 0))
        .all()
    
    const permissionSlugs = perms.map(p => p.slug)

    return { 
        user: { 
            ...user, 
            rank, 
            stats,
            assignedRole: role ? { id: role.id, name: role.name } : null,
            permissions: permissionSlugs
        } 
    }

  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .get('/:id/history', async ({ params, query, set }) => {
    const id = parseInt(params.id)
    const gameId = query.gameId ? parseInt(query.gameId) : undefined

    let tournamentConditions: any = eq(participants.userId, id)
    if (gameId) {
        tournamentConditions = and(eq(participants.userId, id), eq(tournaments.gameId, gameId))
    }

    // Fetch tournament history
    const userParticipations = await db.select({
      tournamentId: participants.tournamentId,
      score: participants.score,
      note: participants.note,
      dropped: participants.dropped,
      tournamentName: tournaments.name,
      tournamentStartDate: sql<string>`COALESCE(${tournaments.startDate}, ${tournaments.createdAt})`,
      tournamentStatus: tournaments.status,
      deckId: participants.deckId,
    })
    .from(participants)
    .innerJoin(tournaments, eq(participants.tournamentId, tournaments.id))
    .where(tournamentConditions)
    .orderBy(desc(tournaments.startDate))
    .all()

    const history = await Promise.all(userParticipations.map(async (p) => {
      const allParticipants = await db.select({
        userId: participants.userId,
        score: participants.score,
        tieBreakers: participants.tieBreakers,
      })
      .from(participants)
      .where(eq(participants.tournamentId, p.tournamentId))
      .all()

      // Sort participants to find rank
      allParticipants.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        // @ts-ignore
        return (b.tieBreakers?.buchholz || 0) - (a.tieBreakers?.buchholz || 0)
      })

      const rank = allParticipants.findIndex(ap => ap.userId === id) + 1

      // Fetch deck info if exists
      let deckInfo = null
      if (p.deckId) {
          const deck = await db.select({ id: decks.id, name: decks.name, color: decks.color, link: decks.link }).from(decks).where(eq(decks.id, p.deckId)).get()
          if (deck) deckInfo = deck
      }

      return {
        tournamentName: p.tournamentName,
        tournamentDate: p.tournamentStartDate,
        status: p.tournamentStatus,
        score: p.score,
        rank,
        totalParticipants: allParticipants.length,
        note: p.note,
        deck: deckInfo
      }
    }))

    // Fetch duel history
    let duelConditions: any = or(eq(duelRooms.player1Id, id), eq(duelRooms.player2Id, id))
    if (gameId) {
        duelConditions = and(or(eq(duelRooms.player1Id, id), eq(duelRooms.player2Id, id)), eq(duelRooms.gameId, gameId))
    }

    const userDuels = await db.select({
      id: duelRooms.id,
      name: duelRooms.name,
      status: duelRooms.status,
      result: duelRooms.result,
      winnerId: duelRooms.winnerId,
      createdAt: duelRooms.createdAt,
      player1Id: duelRooms.player1Id,
      player2Id: duelRooms.player2Id,
      player1Note: duelRooms.player1Note,
      player2Note: duelRooms.player2Note,
      player1MmrChange: duelRooms.player1MmrChange,
      player2MmrChange: duelRooms.player2MmrChange,
      player1DeckId: duelRooms.player1DeckId,
      player2DeckId: duelRooms.player2DeckId,
      firstPlayerId: duelRooms.firstPlayerId,
    })
    .from(duelRooms)
    .where(duelConditions)
    .orderBy(desc(duelRooms.createdAt))
    .all()

    // Enrich duel history with opponent names and deck info
    const enrichedDuels = await Promise.all(userDuels.map(async (d) => {
      const opponentId = d.player1Id === id ? d.player2Id : d.player1Id
      let opponentName = 'Unknown'
      if (opponentId) {
        const opponent = await db.select({ username: users.username, displayName: users.displayName }).from(users).where(eq(users.id, opponentId)).get()
        if (opponent) opponentName = opponent.displayName || opponent.username
      } else {
        opponentName = 'Waiting...'
      }

      // Determine used deck
      const myDeckId = d.player1Id === id ? d.player1DeckId : d.player2DeckId
      let deckInfo = null
      if (myDeckId) {
          const deck = await db.select({ id: decks.id, name: decks.name, color: decks.color, link: decks.link }).from(decks).where(eq(decks.id, myDeckId)).get()
          if (deck) deckInfo = deck
      }

      return {
        id: d.id,
        name: d.name,
        status: d.status,
        result: d.result,
        winnerId: d.winnerId,
        createdAt: d.createdAt,
        opponent: opponentName,
        opponentId,
        player1Id: d.player1Id,
        player2Id: d.player2Id,
        player1Note: d.player1Note,
        player2Note: d.player2Note,
        player1MmrChange: d.player1MmrChange,
        player2MmrChange: d.player2MmrChange,
        firstPlayerId: d.firstPlayerId,
        deck: deckInfo
      }
    }))

    return { 
      history,
      duels: enrichedDuels
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    query: t.Object({
        gameId: t.Optional(t.String())
    })
  })
  .get('/', async ({ query, set }) => {
    const { requesterId, gameId } = query
    if (!requesterId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const requester = await db.select().from(users).where(eq(users.id, parseInt(requesterId))).get()
    
    // Check permissions
    const requesterPermissions = await db.select({
      roleName: roles.name,
      permissionSlug: permissions.slug,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, parseInt(requesterId)))
    .all()

    const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'users.manage')

    if (!requester || !hasPermission) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    let userQuery = db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      roleId: users.roleId,
      roleName: roles.name, // Select role name
      createdAt: users.createdAt,
      color: users.color,
      avatarUrl: users.avatarUrl,
      mmr: gameId ? userGameStats.mmr : sql<number>`0`
    }).from(users)
    .leftJoin(roles, eq(users.roleId, roles.id)) // Join roles
    .where(sql`${users.passwordHash} != 'deleted'`)

    if (gameId) {
        userQuery.leftJoin(userGameStats, and(eq(userGameStats.userId, users.id), eq(userGameStats.gameId, parseInt(gameId))))
    }

    const allUsers = await userQuery.all()

    // Map to simplified stats structure for frontend
    const usersWithStats = allUsers.map(u => ({
        ...u,
        assignedRole: { id: u.roleId, name: u.roleName }, // Map to expected structure
        stats: gameId && u.mmr ? [{
            gameId: parseInt(gameId),
            mmr: u.mmr,
            wins: 0, losses: 0, draws: 0 // placeholders
        }] : []
    }))

    return { users: usersWithStats }
  }, {
    query: t.Object({
      requesterId: t.String(),
      gameId: t.Optional(t.String())
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const { requesterId, username, displayName, password, role, mmr, color } = body
    
    // Allow if manage permission OR if updating self
    const isSelfUpdate = requesterId === parseInt(params.id)
    
    // Always check permissions to determine if sensitive fields (Role, MMR) can be updated
    const requesterPermissions = await db.select({
        roleName: roles.name,
        permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()
    
    const canManage = requesterPermissions.some(r => r.permissionSlug === 'users.manage')

    if (!isSelfUpdate && !canManage) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Owner Role Protection
    const ownerRoleSetting = await db.select().from(systemSettings).where(eq(systemSettings.key, 'owner_role_id')).get()
    if (ownerRoleSetting) {
        const ownerRoleId = parseInt(ownerRoleSetting.value)
        const targetUser = await db.select().from(users).where(eq(users.id, parseInt(params.id))).get()
        
        if (targetUser && targetUser.roleId === ownerRoleId) {
             const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
             if (!requester || requester.roleId !== ownerRoleId) {
                 set.status = 403
                 return { error: 'Protected User: Only members of the Owner Role can modify other Owners.' }
             }
        }
    }

    const updates: any = {}
    if (username) updates.username = username
    if (displayName) updates.displayName = displayName
    
    // Only admin/manager can update role and mmr
    if (canManage) {
      // if (role) updates.role = role
      if (body.roleId) {
          updates.roleId = body.roleId
          // Sync legacy role column if possible
          try {
              const r = await db.select().from(roles).where(eq(roles.id, body.roleId)).get()
              if (r) {
                  // updates.role = r.name === 'Admin' ? 'admin' : 'user'
              }
          } catch(e) { /* ignore */ }
      }
      
      // Update MMR
      if (mmr !== undefined) {
          if (body.gameId) {
              // Update game specific MMR
              const existingStat = await db.select().from(userGameStats)
                  .where(and(eq(userGameStats.userId, parseInt(params.id)), eq(userGameStats.gameId, body.gameId)))
                  .get()

              if (existingStat) {
                  await db.update(userGameStats)
                      .set({ mmr })
                      .where(and(eq(userGameStats.userId, parseInt(params.id)), eq(userGameStats.gameId, body.gameId)))
                      .run()
              } else {
                  await db.insert(userGameStats).values({
                      userId: parseInt(params.id),
                      gameId: body.gameId,
                      mmr,
                      wins: 0,
                      losses: 0,
                      draws: 0
                  }).run()
              }
              }
          
          events.emit(EVENTS.MATCH_REPORTED, { count: 1 }) // Trigger leaderboard update
      }
    }

    if (color) updates.color = color
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl
    if (password) {
      updates.passwordHash = await Bun.password.hash(password)
    }

    if (Object.keys(updates).length > 0) {
        await db.update(users)
        .set(updates)
        .where(eq(users.id, parseInt(params.id)))
        .run()
    }

    const updatedUser = await db.select().from(users).where(eq(users.id, parseInt(params.id))).get()
    return { user: updatedUser }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      username: t.Optional(t.String()),
      displayName: t.Optional(t.String()),
      password: t.Optional(t.String()),
      role: t.Optional(t.String()),
      roleId: t.Optional(t.Number()),
      mmr: t.Optional(t.Number()),
      gameId: t.Optional(t.Number()),
      color: t.Optional(t.String()),
      avatarUrl: t.Optional(t.String())
    })
  })
  .delete('/:id', async ({ params, body, set }) => {
    const { requesterId, hardDelete } = body
    
    const requesterPermissions = await db.select({
      roleName: roles.name,
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, requesterId))
    .all()

    const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'users.manage')

    if (!hasPermission) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Owner Role Protection
    const ownerRoleSetting = await db.select().from(systemSettings).where(eq(systemSettings.key, 'owner_role_id')).get()
    if (ownerRoleSetting) {
        const ownerRoleId = parseInt(ownerRoleSetting.value)
        const targetUser = await db.select().from(users).where(eq(users.id, parseInt(params.id))).get()
        
        if (targetUser && targetUser.roleId === ownerRoleId) {
             const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
             if (!requester || requester.roleId !== ownerRoleId) {
                 set.status = 403
                 return { error: 'Protected User: Only members of the Owner Role can delete other Owners.' }
             }
        }
    }

    const userId = parseInt(params.id)

    if (hardDelete) {
        // 1. Reassign Tournaments (CreatedBy must be valid user, assign to requester)
        await db.update(tournaments).set({ createdBy: requesterId }).where(eq(tournaments.createdBy, userId)).run()
        await db.update(tournaments).set({ winnerId: null }).where(eq(tournaments.winnerId, userId)).run()

        // 2. Anonymize Participants (Preserve tournament structure but remove user link)
        await db.update(participants)
            .set({ userId: null, guestName: 'Deleted User' })
            .where(eq(participants.userId, userId))
            .run()

        // 3. Delete Decks
        await db.delete(decks).where(eq(decks.userId, userId)).run()

        // 4. Delete Stats
        await db.delete(userGameStats).where(eq(userGameStats.userId, userId)).run()

        // 5. Delete Duel History (Nuclear option as requested)
        await db.delete(duelRooms).where(or(eq(duelRooms.player1Id, userId), eq(duelRooms.player2Id, userId))).run()

        // 6. Delete User
        await db.delete(users).where(eq(users.id, userId)).run()

        return { success: true }
    }
    
    // Fetch default role for reset
    
    // Fetch default role for reset
    let defaultRoleId: number | undefined
    const setting = await db.select().from(systemSettings).where(eq(systemSettings.key, 'default_role_id')).get()
    
    if (setting) {
        defaultRoleId = parseInt(setting.value)
    }

    // Soft delete: Anonymize the user to preserve history
    await db.update(users)
      .set({
        // username: kept as is
        // displayName: kept as is
        passwordHash: 'deleted', // Invalidate login
        avatarUrl: null,
        color: '#3f3f46', // Zinc-700 (neutral color)
        roleId: defaultRoleId, // valid public role
        securityQuestion: null,
        securityAnswerHash: null,
        // We keep MMR and CreatedAt for historical context
      })
      .where(eq(users.id, userId))
      .run()

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      hardDelete: t.Optional(t.Boolean())
    })
  })
