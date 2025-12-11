
import { Elysia, t } from 'elysia'
import { db } from '../db'
import { roles, permissions, rolePermissions, users } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const rolesRoutes = new Elysia({ prefix: '/roles' })
  .get('/', async () => {
    return await db.select().from(roles).all()
  })
  .get('/:id', async ({ params, set }) => {
    const role = await db.select().from(roles).where(eq(roles.id, parseInt(params.id))).get()
    if (!role) {
      set.status = 404
      return { error: 'Role not found' }
    }
    
    // Get permissions for this role
    const perms = await db
        .select({
            id: permissions.id,
            slug: permissions.slug,
            description: permissions.description
        })
        .from(permissions)
        .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, role.id))
        .all()
        
    return { ...role, permissions: perms }
  })
  .post('/', async ({ body, set }) => {
    const { name, description, requesterId } = body
    
    // Permission Check
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

    const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'roles.manage')

    if (!hasPermission) {
        set.status = 403
        return { error: 'Unauthorized: Missing roles.manage permission' }
    }

    try {
      const result = await db.insert(roles).values({ name, description }).returning().get()
      return result
    } catch (e) {
      set.status = 400
      return { error: 'Failed to create role. Name might be duplicate.' }
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      requesterId: t.Number()
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const { name, description, requesterId } = body
    const id = parseInt(params.id)
    
    // Permission Check
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

    const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'roles.manage')

    if (!hasPermission) {
        set.status = 403
        return { error: 'Unauthorized' }
    }
    
    const role = await db.select().from(roles).where(eq(roles.id, id)).get()
    if (!role) {
        set.status = 404
        return { error: 'Role not found' }
    }
    
    // Allow renaming system roles as per user request
    // if (role.isSystem && name !== role.name) { ... } REMOVED

    try {
      await db.update(roles).set({ name, description }).where(eq(roles.id, id)).run()
      return await db.select().from(roles).where(eq(roles.id, id)).get()
    } catch (e) {
      set.status = 400
      return { error: 'Failed to update role.' }
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      requesterId: t.Number()
    })
  })
  .delete('/:id', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { requesterId } = body

    // Permission Check
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

    const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'roles.manage')

    if (!hasPermission) {
        set.status = 403
        return { error: 'Unauthorized' }
    }

    const role = await db.select().from(roles).where(eq(roles.id, id)).get()
    
    if (!role) {
        set.status = 404
        return { error: 'Role not found' }
    }
    
    if (role.isSystem) {
        set.status = 400
        return { error: 'Cannot delete system roles' }
    }
    
    // Delete associations first
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id)).run()
    
    await db.delete(roles).where(eq(roles.id, id)).run()
    
    return { success: true }
  }, {
    body: t.Object({
      requesterId: t.Number()
    })
  })
  .post('/:id/permissions', async ({ params, body, set }) => {
      const roleId = parseInt(params.id)
      const { permissionIds, requesterId } = body
      
      // Permission Check
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

      const hasPermission = requesterPermissions.some(r => r.permissionSlug === 'roles.manage')

      if (!hasPermission) {
          set.status = 403
          return { error: 'Unauthorized' }
      }

      // Clear existing permissions
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId)).run()
      
      // Add new permissions
      if (permissionIds.length > 0) {
          for (const permId of permissionIds) {
              await db.insert(rolePermissions).values({ roleId, permissionId: permId }).onConflictDoNothing().run()
          }
      }
      
      return { success: true }
  }, {
      body: t.Object({
          permissionIds: t.Array(t.Number()),
          requesterId: t.Number()
      })
  })
