import { Elysia, t } from 'elysia'
import { db } from '../db'
import { systemSettings, users, roles, rolePermissions, permissions } from '../db/schema'
import { eq } from 'drizzle-orm'

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/', async () => {
    const settings = await db.select().from(systemSettings).all()
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    const defaultRoleId = settingsMap['default_role_id'] ? parseInt(settingsMap['default_role_id']) : undefined

    return {
      maintenanceMode: settingsMap['maintenance_mode'] === 'true',
      maintenanceMessage: settingsMap['maintenance_message'] || 'The system is currently undergoing maintenance. Please check back later.',
      defaultRoleId
    }
  })
  .post('/', async ({ body, set }) => {
    const { userId, maintenanceMode, maintenanceMessage, defaultRoleId } = body
    
    // Auth Check
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()

    const canManage = requesterPermissions.some(r => r.permissionSlug === 'settings.manage')

    if (!canManage) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    // Upsert Settings
    if (maintenanceMode !== undefined) {
      await db.insert(systemSettings).values({
        key: 'maintenance_mode',
        value: String(maintenanceMode)
      }).onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(maintenanceMode), updatedAt: new Date().toISOString() }
      }).run()
    }

    if (maintenanceMessage !== undefined) {
      await db.insert(systemSettings).values({
        key: 'maintenance_message',
        value: maintenanceMessage
      }).onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: maintenanceMessage, updatedAt: new Date().toISOString() }
      }).run()
    }

    if (defaultRoleId !== undefined) {
      await db.insert(systemSettings).values({
        key: 'default_role_id',
        value: String(defaultRoleId)
      }).onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(defaultRoleId), updatedAt: new Date().toISOString() }
      }).run()
    }

    return { success: true }
  }, {
    body: t.Object({
      userId: t.Number(),
      maintenanceMode: t.Optional(t.Boolean()),
      maintenanceMessage: t.Optional(t.String()),
      defaultRoleId: t.Optional(t.Number())
    })
  })
