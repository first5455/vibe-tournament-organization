import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, tournaments, matches, participants, duelRooms, userGameStats, roles, permissions, rolePermissions } from '../db/schema'
import { eq, and, like, sql } from 'drizzle-orm'

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .guard({
    beforeHandle: async ({ query, set }) => {
      const { requesterId } = query
      if (!requesterId) {
        set.status = 401
        return { error: 'Unauthorized' }
      }
      
      const requesterPermissions = await db.select({
        permissionSlug: permissions.slug,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(users.id, parseInt(requesterId)))
      .all()
      
      const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'admin.access')

      if (!hasPermission) {
        set.status = 403
        return { error: 'Forbidden' }
      }
    }
  })
  .delete('/data', async ({ set, query }) => {
    try {
      const { gameId } = query
      
      if (gameId) {
        const gId = parseInt(gameId)
        // 1. Delete matches in tournaments of this game
        // Subquery approach in Drizzle is tricky, let's fetch IDs first or use sql
        const gameTournaments = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.gameId, gId)).all()
        const tIds = gameTournaments.map(t => t.id)
        
        if (tIds.length > 0) {
            // Delete matches
            // We need to iterate or use raw SQL if too many, but for now inArray is fine
            await db.delete(matches).where(sql`tournament_id IN ${tIds}`).run()
            
            // Delete participants
            await db.delete(participants).where(sql`tournament_id IN ${tIds}`).run()
            
            // Delete tournaments
            await db.delete(tournaments).where(eq(tournaments.gameId, gId)).run()
        }

        // 2. Delete duel rooms
        await db.delete(duelRooms).where(eq(duelRooms.gameId, gId)).run()

        // 3. Reset User Game Stats for this game only
        await db.update(userGameStats).set({
            mmr: 1000,
            wins: 0,
            losses: 0,
            draws: 0,
            tournamentWins: 0,
            tournamentLosses: 0,
            tournamentDraws: 0,
            duelWins: 0,
            duelLosses: 0,
            duelDraws: 0
        }).where(eq(userGameStats.gameId, gId)).run()

        return { success: true, message: 'Game history cleaned up' }
      } else {
        // Global Delete
        await db.delete(matches).run()
        await db.delete(participants).run()
        await db.delete(tournaments).run()
        await db.delete(duelRooms).run()

        // Reset all stats
        await db.update(userGameStats).set({
            mmr: 1000,
            wins: 0,
            losses: 0,
            draws: 0,
            tournamentWins: 0,
            tournamentLosses: 0,
            tournamentDraws: 0,
            duelWins: 0,
            duelLosses: 0,
            duelDraws: 0
        }).run()

        // Hard delete soft-deleted users (Only do this on Global wipe?)
        await db.delete(users)
            .where(eq(users.passwordHash, 'deleted'))
            .run()
        
        return { success: true, message: 'All tournament data and deleted users cleaned up' }
      }
    } catch (e: any) {
      console.error('Failed to delete data:', e)
      set.status = 500
      return { error: 'Failed to delete data' }
    }
  }, {
    query: t.Object({
      requesterId: t.String(),
      gameId: t.Optional(t.String())
    })
  })
  .post('/reset-leaderboard', async ({ set, query }) => {
    try {
      const { gameId } = query
      
      if (gameId) {
          const gId = parseInt(gameId)
          await db.update(userGameStats).set({ mmr: 1000 }).where(eq(userGameStats.gameId, gId)).run()
      } else {
          await db.update(userGameStats).set({ mmr: 1000 }).run()
      }
      
      return { success: true, message: 'Leaderboard reset successfully' }
    } catch (e: any) {
      console.error('Failed to reset leaderboard:', e)
      set.status = 500
      return { error: 'Failed to reset leaderboard' }
    }
  }, {
    query: t.Object({
      requesterId: t.String(),
      gameId: t.Optional(t.String())
    })
  })
  .post('/force-logout-all', async ({ set }) => {
    try {
      await db.update(users).set({ 
        tokenVersion: sql`${users.tokenVersion} + 1` 
      }).run()
      return { success: true, message: 'All users forced to re-login' }
    } catch (e: any) {
      console.error('Failed to force logout:', e)
      set.status = 500
      return { error: 'Failed to force logout' }
    }
  }, {
    query: t.Object({
      requesterId: t.String()
    })
  })
