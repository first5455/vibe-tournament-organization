import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, tournaments, matches, participants, duelRooms } from '../db/schema'
import { eq, and, like } from 'drizzle-orm'

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .guard({
    beforeHandle: async ({ query, set }) => {
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
    }
  })
  .delete('/data', async ({ set }) => {
    try {
      // Delete in order to respect foreign keys if they were enforced (SQLite usually doesn't by default unless enabled, but good practice)
      await db.delete(matches).run()
      await db.delete(participants).run()
      await db.delete(tournaments).run()
      await db.delete(duelRooms).run()

      // Hard delete soft-deleted users
      await db.delete(users)
        .where(and(
          like(users.username, 'Deleted User %'), 
          eq(users.passwordHash, 'deleted')
        ))
        .run()
      
      return { success: true, message: 'All tournament data and deleted users cleaned up' }
    } catch (e: any) {
      console.error('Failed to delete data:', e)
      set.status = 500
      return { error: 'Failed to delete data' }
    }
  }, {
    query: t.Object({
      requesterId: t.String()
    })
  })
  .post('/reset-leaderboard', async ({ set }) => {
    try {
      await db.update(users).set({ mmr: 1000 }).run()
      return { success: true, message: 'Leaderboard reset successfully' }
    } catch (e: any) {
      console.error('Failed to reset leaderboard:', e)
      set.status = 500
      return { error: 'Failed to reset leaderboard' }
    }
  }, {
    query: t.Object({
      requesterId: t.String()
    })
  })
