import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ body, set }) => {
    const { username, password } = body
    
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

    // Create user
    const result = await db.insert(users).values({
      username,
      passwordHash,
      securityQuestion: body.securityQuestion,
      securityAnswerHash,
    }).returning().get()

    return { user: { id: result.id, username: result.username, role: result.role, color: result.color, avatarUrl: result.avatarUrl } }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      securityQuestion: t.Optional(t.String()),
      securityAnswer: t.Optional(t.String())
    })
  })
  .post('/recovery-question', async ({ body, set }) => {
    const { username } = body
    const user = await db.select().from(users).where(eq(users.username, username)).get()
    
    if (!user || !user.securityQuestion) {
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
    if (!user || !user.securityAnswerHash) {
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
    if (!user) {
      set.status = 401
      return { error: 'Invalid credentials' }
    }

    const valid = await Bun.password.verify(password, user.passwordHash)
    if (!valid) {
      set.status = 401
      return { error: 'Invalid credentials' }
    }

    return { user: { id: user.id, username: user.username, role: user.role, color: user.color, avatarUrl: user.avatarUrl } }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  .put('/profile', async ({ body, set }) => {
    const { userId, username, password, color, avatarUrl } = body

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
    return { user: { id: updatedUser!.id, username: updatedUser!.username, role: updatedUser!.role, color: updatedUser!.color, avatarUrl: updatedUser!.avatarUrl } }
  }, {
    body: t.Object({
      userId: t.Number(),
      username: t.Optional(t.String()),
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
