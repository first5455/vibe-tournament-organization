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
