import { db } from './db'
import { users, userGameStats, roles, rolePermissions, permissions } from './db/schema'
import { sql, and, eq } from 'drizzle-orm'

/**
 * Get all permission slugs for a user by their ID.
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const rows = await db.select({
    permissionSlug: permissions.slug,
  })
  .from(users)
  .leftJoin(roles, eq(users.roleId, roles.id))
  .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
  .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
  .where(eq(users.id, userId))
  .all()

  return rows.map(r => r.permissionSlug).filter((s): s is string => s !== null)
}

/**
 * Check if a user has a specific permission slug.
 */
export async function hasPermission(userId: number, slug: string): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.includes(slug)
}

/**
 * Check if a user has any of the given permission slugs.
 */
export async function hasAnyPermission(userId: number, slugs: string[]): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return slugs.some(s => perms.includes(s))
}

export async function getRank(mmr: number, gameId?: number): Promise<number> {
  if (!gameId) return 0;

  const result = await db.select({
    count: sql<number>`count(*)`
  })
  .from(userGameStats)
  .where(and(eq(userGameStats.gameId, gameId), sql`${userGameStats.mmr} > ${mmr}`))
  .get()

  return (result?.count || 0) + 1
}
