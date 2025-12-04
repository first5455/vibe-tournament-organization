import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'

import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { tournamentRoutes } from './routes/tournaments'
import { matchRoutes } from './routes/matches'
import { adminRoutes } from './routes/admin'
import { duelRoutes } from './routes/duels'

const app = new Elysia()
  .use(swagger())
  .use(cors())
  .use(authRoutes)
  .use(userRoutes)
  .use(tournamentRoutes)
  .use(matchRoutes)
  .use(adminRoutes)
  .use(duelRoutes)
  .ws('/ws', {
    open(ws) {
      console.log('WS Connected')
      ws.subscribe('leaderboard')
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
    }
  })

app.listen(process.env.PORT || 3000)

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

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)

export default app
