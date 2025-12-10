import { Elysia, t } from 'elysia'
import { db } from '../db'
import { systemSettings, users } from '../db/schema'
import { eq } from 'drizzle-orm'

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/', async () => {
    const settings = await db.select().from(systemSettings).all()
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    return {
      maintenanceMode: settingsMap['maintenance_mode'] === 'true',
      maintenanceMessage: settingsMap['maintenance_message'] || 'The system is currently undergoing maintenance. Please check back later.'
    }
  })
  .post('/', async ({ body, set }) => {
    const { userId, maintenanceMode, maintenanceMessage } = body
    
    // Auth Check
    const requester = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!requester || requester.role !== 'admin') {
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

    return { success: true }
  }, {
    body: t.Object({
      userId: t.Number(),
      maintenanceMode: t.Optional(t.Boolean()),
      maintenanceMessage: t.Optional(t.String())
    })
  })
