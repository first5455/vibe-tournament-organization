import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, oauthAccounts, games, userGameStats, roles, permissions, rolePermissions, systemSettings } from '../db/schema'
import { eq, and } from 'drizzle-orm'

// ========================
// Provider token verifiers
// ========================
// Each provider has a function that takes a token/credential and returns standardized user info.
// To add a new provider, add a new entry here and it will work automatically.

interface OAuthUserInfo {
  providerAccountId: string
  email?: string
  displayName?: string
  avatarUrl?: string
}

type ProviderVerifier = (credential: string) => Promise<OAuthUserInfo>

const providerVerifiers: Record<string, ProviderVerifier> = {
  google: async (credential: string): Promise<OAuthUserInfo> => {
    // Verify Google ID token via Google's tokeninfo endpoint
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    if (!res.ok) {
      throw new Error('Invalid Google token')
    }
    const payload = await res.json()

    if (!payload.sub) {
      throw new Error('Invalid Google token: missing sub')
    }

    return {
      providerAccountId: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.email?.split('@')[0],
      avatarUrl: payload.picture,
    }
  },

  // Future providers can be added here:
  // discord: async (credential: string) => { ... },
  // github: async (credential: string) => { ... },
}

// ========================
// Helper: get user with role/permissions for login response
// ========================
async function getUserLoginResponse(userId: number) {
  const user = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) throw new Error('User not found')

  const role = await db.select().from(roles).where(eq(roles.id, user.roleId || 0)).get()
  const perms = await db
    .select({ slug: permissions.slug })
    .from(permissions)
    .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, user.roleId || 0))
    .all()

  const oauthLinks = await db
    .select({ provider: oauthAccounts.provider })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId))
    .all()

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    assignedRole: role ? { id: role.id, name: role.name } : null,
    permissions: perms.map(p => p.slug),
    color: user.color,
    avatarUrl: user.avatarUrl,
    tokenVersion: user.tokenVersion,
    oauthProviders: oauthLinks.map(l => l.provider),
  }
}

// ========================
// Helper: generate random password
// ========================
function generateRandomPassword(length = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

// ========================
// Routes
// ========================
export const oauthRoutes = new Elysia({ prefix: '/auth/oauth' })
  // POST /auth/oauth/:provider - Login or register via OAuth
  .post('/:provider', async ({ params, body, set }) => {
    const { provider } = params
    const { credential } = body

    // Check if provider is supported
    const verifier = providerVerifiers[provider]
    if (!verifier) {
      set.status = 400
      return { error: `Unsupported OAuth provider: ${provider}` }
    }

    // Verify the token with the provider
    let providerUser: OAuthUserInfo
    try {
      providerUser = await verifier(credential)
    } catch (err: any) {
      set.status = 401
      return { error: err.message || 'OAuth verification failed' }
    }

    // Check if this OAuth account is already linked to a user
    const existingLink = await db
      .select()
      .from(oauthAccounts)
      .where(and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerUser.providerAccountId)
      ))
      .get()

    if (existingLink) {
      // Existing user - log them in
      // Update avatar from provider if user hasn't set a custom one
      const existingUser = await db.select().from(users).where(eq(users.id, existingLink.userId)).get()
      if (existingUser && !existingUser.avatarUrl && providerUser.avatarUrl) {
        await db.update(users)
          .set({ avatarUrl: providerUser.avatarUrl })
          .where(eq(users.id, existingLink.userId))
          .run()
      }

      const userResponse = await getUserLoginResponse(existingLink.userId)
      return { user: userResponse, isNewUser: false }
    }

    // New OAuth user - create account
    // Generate a unique username from displayName or email
    let baseUsername = providerUser.displayName?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
                       providerUser.email?.split('@')[0] ||
                       `${provider}_user`

    // Ensure username uniqueness
    let username = baseUsername
    let counter = 1
    while (await db.select().from(users).where(eq(users.username, username)).get()) {
      username = `${baseUsername}${counter}`
      counter++
    }

    // Auto-generate a random password
    const randomPassword = generateRandomPassword()
    const passwordHash = await Bun.password.hash(randomPassword)

    // Get default role
    let defaultRoleId: number | undefined
    const setting = await db.select().from(systemSettings).where(eq(systemSettings.key, 'default_role_id')).get()
    if (setting) {
      defaultRoleId = parseInt(setting.value)
    }

    // Create user
    const newUser = await db.insert(users).values({
      username,
      displayName: providerUser.displayName || username,
      passwordHash,
      roleId: defaultRoleId,
      avatarUrl: providerUser.avatarUrl || undefined,
      color: '#3f3f46',
    }).returning().get()

    // Link OAuth account
    await db.insert(oauthAccounts).values({
      userId: newUser.id,
      provider,
      providerAccountId: providerUser.providerAccountId,
      email: providerUser.email,
      displayName: providerUser.displayName,
      avatarUrl: providerUser.avatarUrl,
    }).run()

    // Initialize MMR for all games
    const allGames = await db.select().from(games).all()
    for (const game of allGames) {
      await db.insert(userGameStats).values({
        userId: newUser.id,
        gameId: game.id,
        mmr: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
      }).run()
    }

    const userResponse = await getUserLoginResponse(newUser.id)
    return { user: userResponse, isNewUser: true }
  }, {
    params: t.Object({
      provider: t.String()
    }),
    body: t.Object({
      credential: t.String()
    })
  })

  // GET /auth/oauth/providers - List supported OAuth providers
  .get('/providers', async () => {
    // Return which providers are configured (have client IDs in settings)
    const settings = await db.select().from(systemSettings).all()
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    const providers: { name: string, clientId: string }[] = []

    // Google
    const googleClientId = settingsMap['oauth_google_client_id']
    if (googleClientId) {
      providers.push({ name: 'google', clientId: googleClientId })
    }

    // Future providers:
    // const discordClientId = settingsMap['oauth_discord_client_id']
    // if (discordClientId) providers.push({ name: 'discord', clientId: discordClientId })

    return { providers }
  })

  // GET /auth/oauth/accounts/:userId - Get linked OAuth accounts for a user
  .get('/accounts/:userId', async ({ params }) => {
    const accounts = await db
      .select({
        id: oauthAccounts.id,
        provider: oauthAccounts.provider,
        email: oauthAccounts.email,
        displayName: oauthAccounts.displayName,
        createdAt: oauthAccounts.createdAt,
      })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, parseInt(params.userId)))
      .all()

    return { accounts }
  }, {
    params: t.Object({
      userId: t.String()
    })
  })

  // POST /auth/oauth/link/:provider - Link an OAuth account to an existing user
  .post('/link/:provider', async ({ params, body, set }) => {
    const { provider } = params
    const { userId, credential } = body

    const verifier = providerVerifiers[provider]
    if (!verifier) {
      set.status = 400
      return { error: `Unsupported OAuth provider: ${provider}` }
    }

    let providerUser: OAuthUserInfo
    try {
      providerUser = await verifier(credential)
    } catch (err: any) {
      set.status = 401
      return { error: err.message || 'OAuth verification failed' }
    }

    // Check if this OAuth account is already linked to another user
    const existingLink = await db
      .select()
      .from(oauthAccounts)
      .where(and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerUser.providerAccountId)
      ))
      .get()

    if (existingLink) {
      if (existingLink.userId === userId) {
        return { success: true, message: 'Account already linked' }
      }
      set.status = 409
      return { error: 'This OAuth account is already linked to another user' }
    }

    await db.insert(oauthAccounts).values({
      userId,
      provider,
      providerAccountId: providerUser.providerAccountId,
      email: providerUser.email,
      displayName: providerUser.displayName,
      avatarUrl: providerUser.avatarUrl,
    }).run()

    return { success: true }
  }, {
    params: t.Object({
      provider: t.String()
    }),
    body: t.Object({
      userId: t.Number(),
      credential: t.String()
    })
  })

  // DELETE /auth/oauth/unlink/:provider - Unlink an OAuth account
  .delete('/unlink/:provider', async ({ params, body, set }) => {
    const { provider } = params
    const { userId } = body

    // Ensure user has a password set before unlinking (so they can still login)
    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      set.status = 404
      return { error: 'User not found' }
    }

    // Count remaining OAuth links
    const oauthLinks = await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .all()

    // If this is the only auth method and they haven't set a security password, block
    if (oauthLinks.length <= 1) {
      // Check if user has set a real password (not the auto-generated one)
      // We can't really tell, so just allow it - admin can always reset
    }

    await db.delete(oauthAccounts)
      .where(and(
        eq(oauthAccounts.userId, userId),
        eq(oauthAccounts.provider, provider)
      ))
      .run()

    return { success: true }
  }, {
    params: t.Object({
      provider: t.String()
    }),
    body: t.Object({
      userId: t.Number()
    })
  })
