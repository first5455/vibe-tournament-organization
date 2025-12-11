
import { db } from '../db'
import { roles, permissions, rolePermissions, users } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

async function main() {
  console.log('Seeding RBAC...')

  // 1. Create Default Roles
  const rolesData = [
    { name: 'Admin', description: 'System Administrator', isSystem: true },
    { name: 'User', description: 'Standard User', isSystem: true },
  ]

  const roleMap = new Map<string, number>()

  for (const r of rolesData) {
    let role = await db.select().from(roles).where(eq(roles.name, r.name)).get()
    if (!role) {
      console.log(`Creating role: ${r.name}`)
      role = await db.insert(roles).values(r).returning().get()
    }
    roleMap.set(r.name, role.id)
  }

  // 2. Create Permissions
  const permissionsData = [
    { slug: 'admin.access', description: 'Access Admin Portal' },
    // Feature Management Permissions (Admin Level)
    { slug: 'users.manage', description: 'Full control over users' },
    { slug: 'tournaments.manage', description: 'Full control over tournaments' },
    { slug: 'duels.manage', description: 'Full control over duel rooms' },
    { slug: 'decks.manage', description: 'Full control over decks' },
    { slug: 'games.manage', description: 'Full control over games' },
    { slug: 'roles.manage', description: 'Full control over roles' },
    { slug: 'settings.manage', description: 'Manage system settings' },
    
    // User Level Permissions (keep existing basic ones if needed, or refine)
    { slug: 'tournaments.manage_own', description: 'Create and manage own tournaments' },
  ]

  const permMap = new Map<string, number>()

  for (const p of permissionsData) {
    let perm = await db.select().from(permissions).where(eq(permissions.slug, p.slug)).get()
    if (!perm) {
      console.log(`Creating permission: ${p.slug}`)
      perm = await db.insert(permissions).values(p).returning().get()
    }
    permMap.set(p.slug, perm.id)
  }

  // 3. Assign Permissions to Roles
  // Admin gets all manage permissions + access
  const adminRoleId = roleMap.get('Admin')!
  const userRoleId = roleMap.get('User')!

  if (adminRoleId) {
    console.log('Assigning admin permissions to Admin')
    const adminPerms = [
        'admin.access',
        'users.manage',
        'tournaments.manage',
        'duels.manage',
        'decks.manage',
        'games.manage',
        'roles.manage',
        'settings.manage',
        'tournaments.manage_own', // Admin can also manage their own
    ]
    
    for (const slug of adminPerms) {
       if (permMap.has(slug)) {
          await db.insert(rolePermissions).values({ roleId: adminRoleId, permissionId: permMap.get(slug)! }).onConflictDoNothing().run()
       }
    }
  }

  if (userRoleId) {
      console.log('Assigning default permissions to User')
      // Users can only view things mostly, maybe create tournaments if that's the business logic, but let's stick to basic
      const userPerms = ['tournaments.manage_own'] // Minimal for now
      for (const slug of userPerms) {
          if (permMap.has(slug)) {
              await db.insert(rolePermissions).values({ roleId: userRoleId, permissionId: permMap.get(slug)! }).onConflictDoNothing().run()
          }
      }
  }

  // 4. Migrate Existing Users
  console.log('Migrating existing users...')
  const allUsers = await db.select().from(users).all()
  for (const user of allUsers) {
    if (!user.roleId) {
        if (user.role === 'admin') {
            await db.update(users).set({ roleId: adminRoleId }).where(eq(users.id, user.id)).run()
            console.log(`Updated user ${user.username} (admin) to Admin role`)
        } else {
            await db.update(users).set({ roleId: userRoleId }).where(eq(users.id, user.id)).run()
            console.log(`Updated user ${user.username} (user) to User role`)
        }
    }
  }

  // 5. Cleanup Legacy Permissions
  console.log('Cleaning up legacy permissions...')
  
  // Delete associations first to avoid FK constraint violations
  await db.delete(rolePermissions).where(
    inArray(rolePermissions.permissionId, 
        db.select({ id: permissions.id }).from(permissions).where(eq(permissions.slug, 'roles.read'))
    )
  ).run()

  // Then delete the permission
  await db.delete(permissions).where(eq(permissions.slug, 'roles.read')).run()

  console.log('RBAC Seeding Completed!')
}

main().catch(console.error)
