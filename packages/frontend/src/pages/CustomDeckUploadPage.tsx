import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useGame } from '../contexts/GameContext'
import { Button } from '../components/ui/button'
import { Plus, Download, Trash2, Upload, X, Copy, Check } from 'lucide-react'

interface CustomDeck {
  id: number
  userId: number
  name: string
  description?: string | null
  gameId?: number | null
  createdAt: string
  updatedAt: string
  cardCount: number
  totalCards: number
}

interface CustomDeckCard {
  id: number
  customDeckId: number
  cardName?: string | null
  imageUrl: string
  quantity: number
  sortOrder: number
  createdAt: string
}

interface DeckWithCards extends CustomDeck {
  cards: CustomDeckCard[]
}

export default function CustomDeckUploadPage() {
  const { user } = useAuth()
  const { selectedGame } = useGame()
  const [decks, setDecks] = useState<CustomDeck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<DeckWithCards | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal states
  const [showDeckModal, setShowDeckModal] = useState(false)
  const [showCardUpload, setShowCardUpload] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  
  // Form states
  const [deckName, setDeckName] = useState('')
  const [deckDescription, setDeckDescription] = useState('')
  const [cardImage, setCardImage] = useState<File | null>(null)
  const [cardName, setCardName] = useState('')
  const [cardQuantity, setCardQuantity] = useState(1)
  
  // Export data
  const [exportText, setExportText] = useState('')
  const [exportDeckName, setExportDeckName] = useState('')

  useEffect(() => {
    if (selectedGame && user) {
      fetchDecks()
    }
  }, [user, selectedGame])

  const fetchDecks = async () => {
    if (!user || !selectedGame) return
    try {
      setIsLoading(true)
      const data = await api(`/custom-decks?userId=${user.id}&gameId=${selectedGame.id}`)
      setDecks(data)
    } catch (err: any) {
      setError('Failed to fetch custom decks')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDeckDetails = async (deckId: number) => {
    try {
      const data = await api(`/custom-decks/${deckId}`)
      setSelectedDeck(data)
    } catch (err: any) {
      setError('Failed to fetch deck details')
    }
  }

  const handleCreateDeck = async () => {
    setError('')
    try {
      await api('/custom-decks', {
        method: 'POST',
        body: JSON.stringify({
          requesterId: user?.id,
          userId: user?.id,
          name: deckName,
          description: deckDescription || undefined,
          gameId: selectedGame?.id,
        })
      })
      setShowDeckModal(false)
      setDeckName('')
      setDeckDescription('')
      fetchDecks()
    } catch (err: any) {
      setError(err.message || 'Failed to create deck')
    }
  }

  const handleDeleteDeck = async (deckId: number) => {
    if (!confirm('Are you sure you want to delete this custom deck? All cards will be removed.')) return
    try {
      await api(`/custom-decks/${deckId}`, {
        method: 'DELETE',
        body: JSON.stringify({ requesterId: user?.id })
      })
      fetchDecks()
      if (selectedDeck?.id === deckId) {
        setSelectedDeck(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete deck')
    }
  }

  const handleUploadCard = async () => {
    if (!cardImage || !selectedDeck) return
    
    setUploadingImage(true)
    setError('')
    
    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Image = reader.result as string
        
        try {
          // Upload to chibisafe via backend
          const uploadResponse = await api('/custom-decks/upload-image', {
            method: 'POST',
            body: JSON.stringify({
              requesterId: user?.id,
              imageData: base64Image,
              fileName: cardImage.name
            })
          })

          // Add card with chibisafe URL and UUID
          await api(`/custom-decks/${selectedDeck.id}/cards`, {
            method: 'POST',
            body: JSON.stringify({
              requesterId: user?.id,
              cardName: cardName || undefined,
              imageUrl: uploadResponse.imageUrl,
              chibisafeUuid: uploadResponse.chibisafeUuid,
              quantity: cardQuantity
            })
          })
          
          setShowCardUpload(false)
          setCardImage(null)
          setCardName('')
          setCardQuantity(1)
          fetchDeckDetails(selectedDeck.id)
          fetchDecks() // Update card count
        } catch (err: any) {
          setError(err.message || 'Failed to upload card')
        } finally {
          setUploadingImage(false)
        }
      }
      reader.readAsDataURL(cardImage)
    } catch (err: any) {
      setError(err.message || 'Failed to upload card')
      setUploadingImage(false)
    }
  }

  const handleUpdateCardQuantity = async (cardId: number, newQuantity: number) => {
    if (!selectedDeck || newQuantity < 1) return
    
    try {
      await api(`/custom-decks/${selectedDeck.id}/cards/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify({
          requesterId: user?.id,
          quantity: newQuantity
        })
      })
      fetchDeckDetails(selectedDeck.id)
      fetchDecks()
    } catch (err: any) {
      setError(err.message || 'Failed to update card quantity')
    }
  }

  const handleDeleteCard = async (cardId: number) => {
    if (!selectedDeck) return
    if (!confirm('Remove this card from the deck?')) return
    
    try {
      await api(`/custom-decks/${selectedDeck.id}/cards/${cardId}`, {
        method: 'DELETE',
        body: JSON.stringify({ requesterId: user?.id })
      })
      fetchDeckDetails(selectedDeck.id)
      fetchDecks()
    } catch (err: any) {
      setError(err.message || 'Failed to remove card')
    }
  }

  const handleExportDeck = async (deckId: number) => {
    try {
      const data = await api(`/custom-decks/${deckId}/export`)
      
      // Show modal with export text
      setExportText(data.exportText)
      setExportDeckName(data.deckName)
      setShowExportModal(true)
      setCopiedToClipboard(false)
    } catch (err: any) {
      setError(err.message || 'Failed to export deck')
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (err) {
      alert('Failed to copy to clipboard')
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Custom Deck Upload
          </h1>
          <div className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400 border border-zinc-700">
            {decks.length} Decks
          </div>
        </div>
        <Button onClick={() => setShowDeckModal(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New Deck
        </Button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deck List */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4">My Decks</h2>
          {isLoading ? (
            <div className="text-center text-zinc-500">Loading...</div>
          ) : decks.length === 0 ? (
            <div className="text-center py-8 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="text-zinc-500 mb-4">No custom decks yet</div>
              <Button onClick={() => setShowDeckModal(true)} variant="outline" className="border-zinc-700">
                Create First Deck
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedDeck?.id === deck.id
                      ? 'bg-purple-500/10 border-purple-500/50'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                  onClick={() => fetchDeckDetails(deck.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{deck.name}</h3>
                      {deck.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{deck.description}</p>
                      )}
                      <div className="flex gap-2 mt-2 text-xs text-zinc-400">
                        <span>{deck.cardCount} unique cards</span>
                        <span>•</span>
                        <span>{deck.totalCards} total</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExportDeck(deck.id) }}
                        className="p-1.5 hover:bg-green-900/30 rounded text-zinc-400 hover:text-green-400"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.id) }}
                        className="p-1.5 hover:bg-red-900/30 rounded text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deck Details */}
        <div className="lg:col-span-2">
          {selectedDeck ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">{selectedDeck.name}</h2>
                <Button onClick={() => setShowCardUpload(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Add Card
                </Button>
              </div>

              {selectedDeck.cards.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="text-zinc-500 mb-4">No cards in this deck</div>
                  <Button onClick={() => setShowCardUpload(true)} variant="outline" className="border-zinc-700">
                    Upload First Card
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedDeck.cards.map((card) => (
                    <div key={card.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden group">
                      <div className="relative aspect-[3/4] bg-zinc-950">
                        <img src={card.imageUrl} alt={card.cardName || 'Card'} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-900/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="p-3">
                        {card.cardName && (
                          <p className="text-sm text-white font-medium truncate mb-2">{card.cardName}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">Quantity:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateCardQuantity(card.id, card.quantity - 1)}
                              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                              disabled={card.quantity <= 1}
                            >
                              -
                            </button>
                            <span className="text-white font-semibold w-8 text-center">{card.quantity}</span>
                            <button
                              onClick={() => handleUpdateCardQuantity(card.id, card.quantity + 1)}
                              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="text-center">
                <p className="text-zinc-500 mb-4">Select a deck to view and manage cards</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Deck Modal */}
      {showDeckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create New Deck</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Deck Name *</label>
                <input
                  type="text"
                  required
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="e.g. My TCG Deck"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Description (Optional)</label>
                <textarea
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50 resize-none"
                  placeholder="Describe your deck..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowDeckModal(false)} className="text-zinc-400">
                  Cancel
                </Button>
                <Button onClick={handleCreateDeck} className="bg-purple-600 hover:bg-purple-700" disabled={!deckName}>
                  Create Deck
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Card Modal */}
      {showCardUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Card</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Card Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCardImage(e.target.files?.[0] || null)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Card Name (Optional)</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="e.g. Blue Eyes White Dragon"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={cardQuantity}
                  onChange={(e) => setCardQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowCardUpload(false)} className="text-zinc-400">
                  Cancel
                </Button>
                <Button onClick={handleUploadCard} className="bg-indigo-600 hover:bg-indigo-700" disabled={!cardImage || uploadingImage}>
                  {uploadingImage ? 'Uploading...' : 'Add Card'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowExportModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Export Deck: {exportDeckName}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowExportModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{exportText}</pre>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowExportModal(false)} className="text-zinc-400">
                Close
              </Button>
              <Button 
                onClick={handleCopyToClipboard} 
                className={copiedToClipboard ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"}
              >
                {copiedToClipboard ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
