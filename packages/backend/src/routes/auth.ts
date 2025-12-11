import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, games, userGameStats, roles, permissions, rolePermissions } from '../db/schema'
import { eq } from 'drizzle-orm'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ body, set }) => {
    const { username, password, displayName } = body
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).get()
    if (existingUser) {
      set.status = 400
      return { error: 'Username already taken' }
    }

    // Hash password
    const passwordHash = await Bun.password.hash(password)
    
    let securityAnswerHash = undefined
    if (body.securityAnswer) {
      securityAnswerHash = await Bun.password.hash(body.securityAnswer)
    }

    // Get default role (User)
    const defaultRole = await db.select().from(roles).where(eq(roles.name, 'User')).get()
    
    // Create user
    const result = await db.insert(users).values({
      username,
      displayName: displayName || username, // Default to username if not provided
      passwordHash,
      securityQuestion: body.securityQuestion,
      securityAnswerHash,
      roleId: defaultRole?.id // Assign default role
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

    return { user: { id: result.id, username: result.username, displayName: result.displayName, role: result.role, color: result.color, avatarUrl: result.avatarUrl } }
  }, {
    body: t.Object({
      username: t.String(),
      displayName: t.Optional(t.String()),
      password: t.String(),
      securityQuestion: t.Optional(t.String()),
      securityAnswer: t.Optional(t.String())
    })
  })
  .post('/recovery-question', async ({ body, set }) => {
    const { username } = body
    const user = await db.select().from(users).where(eq(users.username, username)).get()
    
    if (!user || !user.securityQuestion || user.passwordHash === 'deleted') {
      set.status = 404
      return { error: 'User not found or no security question set' }
    }

    return { question: user.securityQuestion }
  }, {
    body: t.Object({
      username: t.String()
    })
  })
  .post('/reset-password', async ({ body, set }) => {
    const { username, securityAnswer, newPassword } = body
    
    const user = await db.select().from(users).where(eq(users.username, username)).get()
    if (!user || !user.securityAnswerHash || user.passwordHash === 'deleted') {
      set.status = 404
      return { error: 'User not found or recovery not set up' }
    }

    const valid = await Bun.password.verify(securityAnswer, user.securityAnswerHash)
    if (!valid) {
      set.status = 401
      return { error: 'Incorrect security answer' }
    }

    const passwordHash = await Bun.password.hash(newPassword)
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id))
      .run()

    return { success: true }
  }, {
    body: t.Object({
      username: t.String(),
      securityAnswer: t.String(),
      newPassword: t.String()
    })
  })
  .post('/login', async ({ body, set }) => {
    const { username, password } = body

    const user = await db.select().from(users).where(eq(users.username, username)).get()
    if (!user || user.passwordHash === 'deleted') {
      set.status = 401
      return { error: 'Invalid credentials' }
    }

    const valid = await Bun.password.verify(password, user.passwordHash)
    if (!valid) {
      set.status = 401
      return { error: 'Invalid credentials' }
    }

    const role = await db.select().from(roles).where(eq(roles.id, user.roleId || 0)).get()
    const perms = await db
        .select({ slug: permissions.slug })
        .from(permissions)
        .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, user.roleId || 0))
        .all()
    
    const permissionSlugs = perms.map(p => p.slug)

    return { 
        user: { 
            id: user.id, 
            username: user.username, 
            displayName: user.displayName, 
            role: user.role, // Legacy string
            assignedRole: role ? { id: role.id, name: role.name } : null, 
            permissions: permissionSlugs,
            color: user.color, 
            avatarUrl: user.avatarUrl,
            tokenVersion: user.tokenVersion
        } 
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  .put('/profile', async ({ body, set }) => {
    const { userId, username, displayName, password, color, avatarUrl } = body

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      set.status = 404
      return { error: 'User not found' }
    }

    const updates: any = {}

    if (username && username !== user.username) {
      const existing = await db.select().from(users).where(eq(users.username, username)).get()
      if (existing) {
        set.status = 400
        return { error: 'Username already taken' }
      }
      updates.username = username
    }

    if (displayName !== undefined) {
      updates.displayName = displayName
    }

    if (password) {
      updates.passwordHash = await Bun.password.hash(password)
    }

    if (color) {
      updates.color = color
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, userId)).run()
    }

    const updatedUser = await db.select().from(users).where(eq(users.id, userId)).get()
    return { user: { id: updatedUser!.id, username: updatedUser!.username, displayName: updatedUser!.displayName, role: updatedUser!.role, color: updatedUser!.color, avatarUrl: updatedUser!.avatarUrl, tokenVersion: updatedUser!.tokenVersion } }
  }, {
    body: t.Object({
      userId: t.Number(),
      username: t.Optional(t.String()),
      displayName: t.Optional(t.String()),
      password: t.Optional(t.String()),
      color: t.Optional(t.String()),
      avatarUrl: t.Optional(t.String())
    })
  })
  .delete('/account', async ({ body, set }) => {
    const { userId } = body

    // TODO: Handle cascading deletes (participants, tournaments, matches)
    // For now, just delete the user. Foreign key constraints might fail if not set to CASCADE.
    // SQLite default is usually NO ACTION.
    
    // Let's try to delete.
    try {
      await db.delete(users).where(eq(users.id, userId)).run()
      return { success: true }
    } catch (e: any) {
      console.error('Failed to delete user:', e)
      set.status = 500
      return { error: 'Failed to delete account. You may be part of active tournaments.' }
    }
  }, {
    body: t.Object({
      userId: t.Number()
    })
  })
