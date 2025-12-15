import { EventEmitter } from 'events'

export const events = new EventEmitter()

export const EVENTS = {
  MATCH_REPORTED: 'match_reported',
  TOURNAMENT_UPDATED: 'tournament_updated',
  DUEL_UPDATED: 'duel_updated',
  DUEL_CREATED: 'duel_created'
}
