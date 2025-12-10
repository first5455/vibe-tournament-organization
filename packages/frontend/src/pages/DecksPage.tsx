import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'
import { DeckCard, DeckWithStats } from '../components/DeckCard'
import { DeckModal } from '../components/DeckModal'

export default function DecksPage() {
  const { user } = useAuth()
  const [decks, setDecks] = useState<DeckWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<DeckWithStats | null>(null)

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
    setIsModalOpen(true)
  }

  const handleOpenEdit = (deck: DeckWithStats) => {
    setEditingDeck(deck)
    setIsModalOpen(true)
  }

  const handleSubmit = async (data: { name: string; link: string; color: string }) => {
    setError('')
    
    try {
      if (editingDeck) {
        // Edit
        await api(`/decks/${editingDeck.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            requesterId: user?.id,
            ...data
          })
        })
      } else {
        // Create
        await api('/decks', {
          method: 'POST',
          body: JSON.stringify({
            requesterId: user?.id,
            userId: user?.id,
            ...data
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
            <DeckCard 
                key={deck.id} 
                deck={deck} 
                onEdit={handleOpenEdit} 
                onDelete={handleDelete}
                showActions={true} 
            />
          ))}
        </div>
      )}

      <DeckModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingDeck}
        title={editingDeck ? 'Edit Deck' : 'Create New Deck'}
        submitLabel={editingDeck ? 'Save Changes' : 'Create Deck'}
      />
    </div>
  )
}
