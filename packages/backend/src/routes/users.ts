import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/leaderboard', async () => {
    return await db.select({
      id: users.id,
      username: users.username,
      mmr: users.mmr,
    })
    .from(users)
    .orderBy(desc(users.mmr))
    .limit(10)
  })
  .get('/:id', async ({ params, set }) => {
    const user = await db.select({
      id: users.id,
      username: users.username,
      mmr: users.mmr,
      createdAt: users.createdAt,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, parseInt(params.id)))
    .get()

    if (!user) {
      set.status = 404
      return { error: 'User not found' }
    }

    return { user }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .get('/', async ({ query, set }) => {
    const { requesterId } = query
    if (!requesterId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const requester = await db.select().from(users).where(eq(users.id, parseInt(requesterId))).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      mmr: users.mmr,
      createdAt: users.createdAt,
    }).from(users).all()

    return { users: allUsers }
  }, {
    query: t.Object({
      requesterId: t.String()
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const { requesterId, username, password, role, mmr } = body
    
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const updates: any = {}
    if (username) updates.username = username
    if (role) updates.role = role
    if (mmr !== undefined) updates.mmr = mmr
    if (password) {
      updates.passwordHash = await Bun.password.hash(password)
    }

    await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(params.id)))
      .run()

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      username: t.Optional(t.String()),
      password: t.Optional(t.String()),
      role: t.Optional(t.String()),
      mmr: t.Optional(t.Number())
    })
  })
  .delete('/:id', async ({ params, body, set }) => {
    const { requesterId } = body
    
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Prevent deleting yourself
    if (requester.id === parseInt(params.id)) {
      set.status = 400
      return { error: 'Cannot delete your own account' }
    }

    await db.delete(users).where(eq(users.id, parseInt(params.id))).run()
    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number()
    })
  })
