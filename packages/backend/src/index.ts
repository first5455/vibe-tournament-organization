import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'

import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { tournamentRoutes } from './routes/tournaments'
import { matchRoutes } from './routes/matches'
import { adminRoutes } from './routes/admin'
import { duelRoutes } from './routes/duels'
import { deckRoutes } from './routes/decks'
import { gamesRoutes } from './routes/games'
import { settingsRoutes } from './routes/settings'
import { rolesRoutes } from './routes/roles'
import { permissionsRoutes } from './routes/permissions'

const app = new Elysia()
  .use(swagger())
  .use(cors({
      origin: [
        process.env.FRONTEND_URL ?? '',
        'localhost:5173',
        'http://localhost:5173',
        /\.vercel\.app$/
      ]
  }))
  .use(authRoutes)
  .use(userRoutes)
  .use(tournamentRoutes)
  .use(matchRoutes)
  .use(adminRoutes)
  .use(duelRoutes)
  .use(deckRoutes)
  .use(gamesRoutes)
  .use(settingsRoutes)
  .use(rolesRoutes)
  .use(permissionsRoutes)
  .get('/health', () => ({ status: 'ok' }))
  .get('/time', () => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
    
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(now)
    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '00'
    
    const day = getPart('day')
    const month = getPart('month')
    const year = getPart('year')
    const hours = getPart('hour')
    const minutes = getPart('minute')
    
    return {
      iso: now.toISOString(),
      formatted: `${day}-${month}-${year} ${hours}:${minutes}`
    }
  })
  .ws('/ws', {
    open(ws) {
      // WS Connected
      ws.subscribe('leaderboard')
    },
    close(ws) {
      // WS Disconnected
    },
    message(ws, message) {
      let data: any = message
      if (typeof message === 'string') {
        try {
          data = JSON.parse(message)
        } catch (e) {
          return
        }
      }

      if (data && data.type === 'SUBSCRIBE_TOURNAMENT' && data.tournamentId) {
        const topic = `tournament:${data.tournamentId}`
        const success = ws.subscribe(topic)
        
        ws.send(JSON.stringify({ 
          type: 'SUBSCRIPTION_CONFIRMED', 
          tournamentId: data.tournamentId,
          topic,
          success
        }))
      }

      if (data && data.type === 'SUBSCRIBE_DUEL' && data.duelId) {
        const topic = `duel:${data.duelId}`
        const success = ws.subscribe(topic)
        
        ws.send(JSON.stringify({  
          type: 'SUBSCRIPTION_CONFIRMED', 
          duelId: data.duelId,
          topic,
          success
        }))
      }
    }
  })

  .listen(process.env.PORT || 3000)

import { events, EVENTS } from './lib/events'

events.on(EVENTS.MATCH_REPORTED, (data) => {
  if (!app.server) return

  app.server.publish('leaderboard', JSON.stringify({ type: 'UPDATE_LEADERBOARD' }))
  
  if (data.tournamentId) {
    const topic = `tournament:${data.tournamentId}`
    app.server.publish(topic, JSON.stringify({ type: 'UPDATE_TOURNAMENT' }))
  }
})

events.on(EVENTS.TOURNAMENT_UPDATED, ({ tournamentId }) => {
  if (!app.server) return

  const topic = `tournament:${tournamentId}`
  app.server.publish(topic, JSON.stringify({ type: 'UPDATE_TOURNAMENT' }))
})

events.on(EVENTS.DUEL_UPDATED, ({ duelId }) => {
  if (!app.server) return

  const topic = `duel:${duelId}`
  app.server.publish(topic, JSON.stringify({ type: 'UPDATE_DUEL', duelId }))
})

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port} WS enabled`
)

export default app
