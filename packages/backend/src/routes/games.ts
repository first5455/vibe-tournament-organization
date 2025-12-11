
import { Elysia, t } from 'elysia'
import { db } from '../db'
import { games, users, userGameStats, roles, rolePermissions, permissions } from '../db/schema'
import { eq } from 'drizzle-orm'

export const gamesRoutes = new Elysia({ prefix: '/games' })
  .get('/', async () => {
    return await db.select().from(games)
  })
  .post('/', async ({ body, query }) => {
    // Permission Check
    // Permission Check
    if (!body.requesterId) {
      throw new Error('Unauthorized')
    }

    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, body.requesterId))
    .all()

    const canManage = requesterPermissions.some(r => r.permissionSlug === 'games.manage')
    
    if (!canManage) throw new Error('Unauthorized')

    const newGame = await db.insert(games).values({
      name: body.name,
      slug: body.slug,
      description: body.description,
      imageUrl: body.imageUrl,
    }).returning()

    // Initialize stats for all users for this new game
    const allUsers = await db.select().from(users)
    if (allUsers.length > 0) {
        await db.insert(userGameStats).values(
            allUsers.map(u => ({
                userId: u.id,
                gameId: newGame[0].id,
                mmr: 1000,
                wins: 0,
                losses: 0,
                draws: 0
            }))
        )
    }

    return newGame[0]
  }, {
    body: t.Object({
      name: t.String(),
      slug: t.Optional(t.String()),
      description: t.Optional(t.String()),
      imageUrl: t.Optional(t.String()),
      requesterId: t.Number()
    }),
    query: t.Object({
      requesterId: t.Optional(t.String())
    })
  })
  .put('/:id', async ({ params, body, query }) => {
      // Permission Check
      if (!body.requesterId) {
          throw new Error('Unauthorized')
      }

      const requesterPermissions = await db.select({
        permissionSlug: permissions.slug
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(users.id, body.requesterId))
      .all()
  
      const canManage = requesterPermissions.some(r => r.permissionSlug === 'games.manage')
      
      if (!canManage) throw new Error('Unauthorized')

      const updatedGame = await db.update(games)
          .set({
              name: body.name,
              slug: body.slug,
              description: body.description,
              imageUrl: body.imageUrl,
          })
          .where(eq(games.id, parseInt(params.id)))
          .returning()
      
      return updatedGame[0]
  }, {
      body: t.Object({
          name: t.Optional(t.String()),
          slug: t.Optional(t.String()),
          description: t.Optional(t.String()),
          imageUrl: t.Optional(t.String()),
          requesterId: t.Number()
      }),
      query: t.Object({
          requesterId: t.Optional(t.String())
      })
  })
  .delete('/:id', async ({ params, query }) => {
      // Permission Check
      if (!query.requesterId) {
          throw new Error('Unauthorized')
      }

      const requesterPermissions = await db.select({
        permissionSlug: permissions.slug
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(users.id, parseInt(query.requesterId)))
      .all()
  
      const canManage = requesterPermissions.some(r => r.permissionSlug === 'games.manage')
      
      if (!canManage) throw new Error('Unauthorized')

      // Check if game has tournaments? (Optional safety)

      await db.delete(games).where(eq(games.id, parseInt(params.id)))
      return { success: true }
  }, {
      query: t.Object({
          requesterId: t.Optional(t.String())
      })
  })
