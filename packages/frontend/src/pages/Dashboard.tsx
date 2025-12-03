import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Plus, Calendar, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

interface Tournament {
  id: number
  name: string
  status: 'pending' | 'active' | 'completed'
  totalRounds: number
  currentRound: number
  createdAt: string
}

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadTournaments()
  }, [])

  const loadTournaments = async () => {
    try {
      const data = await api('/tournaments')
      setTournaments(data)
    } catch (err) {
      console.error('Failed to load tournaments', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createTournament = async () => {
    const name = prompt('Enter tournament name:')
    if (!name) return

    try {
      await api('/tournaments', {
        method: 'POST',
        body: JSON.stringify({ name, createdBy: user?.id }),
      })
      loadTournaments()
    } catch (err) {
      alert('Failed to create tournament')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tournaments</h1>
          <p className="text-zinc-400">Manage and join tournaments</p>
        </div>
        <Button onClick={createTournament}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tournament
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-zinc-500">Loading tournaments...</div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-zinc-700" />
          <h3 className="mt-4 text-lg font-medium text-white">No tournaments yet</h3>
          <p className="mt-2 text-zinc-400">Create your first tournament to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
              className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-indigo-400">
                    {tournament.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                      tournament.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      tournament.status === 'completed' ? 'bg-zinc-800 text-zinc-400' :
                      'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {tournament.status}
                    </span>
                    <span>•</span>
                    <span>Round {tournament.currentRound}/{tournament.totalRounds}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(tournament.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
