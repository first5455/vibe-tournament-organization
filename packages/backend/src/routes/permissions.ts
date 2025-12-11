
import { Elysia } from 'elysia'
import { db } from '../db'
import { permissions } from '../db/schema'

export const permissionsRoutes = new Elysia({ prefix: '/permissions' })
  .get('/', async () => {
    return await db.select().from(permissions).all()
  })
