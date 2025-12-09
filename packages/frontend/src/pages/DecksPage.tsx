import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { Plus, Trash2, Edit2, ExternalLink } from 'lucide-react'

// Types
interface Deck {
  id: number
  userId: number
  name: string
  link?: string
  color: string
  createdAt: string
  winRate?: number
  totalGames?: number
  totalWins?: number
  firstWinRate?: number
  firstTotal?: number
  firstWins?: number
  secondWinRate?: number
  secondTotal?: number
  secondWins?: number
}

export default function DecksPage() {
  const { user } = useAuth()
  const [decks, setDecks] = useState<Deck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  
  // Form State
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [color, setColor] = useState('#ffffff')

  useEffect(() => {
    fetchDecks()
  }, [user])

  const fetchDecks = async () => {
    if (!user) return
    try {
      const data = await api(`/decks?userId=${user.id}`)
      setDecks(data)
    } catch (err: any) {
      setError('Failed to fetch decks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingDeck(null)
    setName('')
    setLink('')
    setColor('#ffffff')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (deck: Deck) => {
    setEditingDeck(deck)
    setName(deck.name)
    setLink(deck.link || '')
    setColor(deck.color)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      if (editingDeck) {
        // Edit
        await api(`/decks/${editingDeck.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            requesterId: user?.id,
            name,
            link,
            color
          })
        })
      } else {
        // Create
        await api('/decks', {
          method: 'POST',
          body: JSON.stringify({
            userId: user?.id,
            name,
            link,
            color
          })
        })
      }
      setIsModalOpen(false)
      fetchDecks()
    } catch (err: any) {
      setError(err.message || 'Failed to save deck')
    }
  }

  const handleDelete = async (deckId: number) => {
    if (!confirm('Are you sure you want to delete this deck?')) return
    try {
      await api(`/decks/${deckId}`, {
        method: 'DELETE',
        body: JSON.stringify({ requesterId: user?.id })
      })
      fetchDecks()
    } catch (err: any) {
      setError(err.message || 'Failed to delete deck')
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            My Decks
          </h1>
          <div className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400 border border-zinc-700">
            {decks.length} Decks
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New Deck
        </Button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg">{error}</div>}

      {isLoading ? (
        <div className="text-center text-zinc-500">Loading decks...</div>
      ) : decks.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <div className="text-zinc-500 mb-4">No decks found. Create one to get started!</div>
          <Button onClick={handleOpenCreate} variant="outline" className="border-zinc-700 text-zinc-300">
            Create First Deck
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <div 
              key={deck.id} 
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all flex flex-col group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: deck.color }}></div>
              
              <div className="flex justify-between items-start mb-2 pl-2">
                <h3 className="font-semibold text-lg text-white truncate" style={{ color: deck.color }}>{deck.name}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEdit(deck)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(deck.id)}
                    className="p-1.5 hover:bg-red-900/50 rounded text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="px-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                   <span className={`font-bold ${
                        (deck.winRate || 0) >= 50 ? 'text-green-400' : 'text-zinc-400'
                   }`}>
                        {deck.winRate || 0}% Winrate
                   </span>
                   <span className="text-zinc-500 text-xs">
                        ({deck.totalWins || 0}/{deck.totalGames || 0} Games)
                   </span>
                </div>

                
                {/* Detailed Win Rates */}
                <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2 border-t border-zinc-800/50 pt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-zinc-600">Play First</span>
                        <div className="flex items-center gap-1">
                             <span className={`font-bold ${
                                (deck.firstWinRate || 0) >= 50 ? 'text-green-400' : 'text-zinc-400'
                             }`}>
                                {deck.firstWinRate || 0}%
                             </span>
                             <span className="text-[10px] text-zinc-600">
                                ({deck.firstWins || 0}/{deck.firstTotal || 0})
                             </span>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-zinc-800/50"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-zinc-600">Play Second</span>
                        <div className="flex items-center gap-1">
                             <span className={`font-bold ${
                                (deck.secondWinRate || 0) >= 50 ? 'text-green-400' : 'text-zinc-400'
                             }`}>
                                {deck.secondWinRate || 0}%
                             </span>
                             <span className="text-[10px] text-zinc-600">
                                ({deck.secondWins || 0}/{deck.secondTotal || 0})
                             </span>
                        </div>
                    </div>
                </div>
              </div>
              
              {deck.link && (
                <div className="mb-4 pl-2">
                  <a 
                    href={deck.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Decklist <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              
              <div className="mt-auto pl-2 pt-4 border-t border-zinc-800 flex justify-between text-xs text-zinc-500">
                <span>Created {new Date(deck.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingDeck ? 'Edit Deck' : 'Create New Deck'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Deck Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="e.g. Arknight Purple"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Deck List URL (Optional)</label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="https://exburst.dev/ua/deck/..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Color Tag</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-16 bg-transparent cursor-pointer rounded border border-zinc-700 p-0.5"
                  />
                  <span className="text-xs text-zinc-500">Pick a color to identify this deck</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {editingDeck ? 'Save Changes' : 'Create Deck'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
