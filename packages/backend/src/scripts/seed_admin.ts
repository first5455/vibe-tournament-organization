import { db } from '../db'
import { users, roles, permissions, rolePermissions } from '../db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('Seeding admin user and roles...')

  // 1. Ensure Admin role exists
  let adminRole = await db.select().from(roles).where(eq(roles.name, 'Admin')).get()
  if (!adminRole) {
      console.log('Creating Admin role...')
      adminRole = await db.insert(roles).values({
          name: 'Admin',
          description: 'System Administrator',
          isSystem: true
      }).returning().get()
  }

  // 2. Ensure User role exists
  let userRole = await db.select().from(roles).where(eq(roles.name, 'User')).get()
  if (!userRole) {
      console.log('Creating User role...')
      userRole = await db.insert(roles).values({
          name: 'User',
          description: 'Standard User',
          isSystem: true
      }).returning().get()
  }

  // 3. Seed Essential Permissions
  const essentialPerms = [
      'admin.access', 
      'users.manage', 
      'roles.manage', 
      'tournaments.create', 
      'tournaments.manage', 
      'settings.manage',
      'decks.manage'
  ]
  
  for (const slug of essentialPerms) {
      let perm = await db.select().from(permissions).where(eq(permissions.slug, slug)).get()
      if (!perm) {
          console.log(`Creating permission: ${slug}`)
          perm = await db.insert(permissions).values({ slug, description: 'System permission' }).returning().get()
      }
      
      // Assign to Admin Role
      await db.insert(rolePermissions).values({ roleId: adminRole.id, permissionId: perm.id }).onConflictDoNothing().run()
  }

  // 4. Create/Update Admin User
  const username = 'admin'
  // const password = 'root' // Intentionally not changing password if exists, only ensuring role
  const password = 'root'

  const existingUser = await db.select().from(users).where(eq(users.username, username)).get()
  
  if (existingUser) {
    console.log('Admin user exists, ensuring Admin role...')
    await db.update(users)
      .set({ roleId: adminRole.id })
      .where(eq(users.id, existingUser.id))
      .run()
  } else {
    console.log('Creating admin user...')
    const passwordHash = await Bun.password.hash(password)
    await db.insert(users).values({
      username,
      passwordHash,
      roleId: adminRole.id,
      displayName: 'System Admin'
    }).run()
  }
  
  console.log('Seeding complete.')
  process.exit(0)
}

main().catch(console.error)
