import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Deck } from '../types'

interface DeckModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; link: string; color: string; gameId?: number }) => Promise<void>
  initialData?: Deck | null
  title?: string
  submitLabel?: string
  games?: { id: number; name: string }[]
  defaultGameId?: number | null
}

export function DeckModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData,
  title = 'Create New Deck',
  submitLabel = 'Create Deck',
  games = [],
  defaultGameId
}: DeckModalProps) {
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [color, setColor] = useState('#ffffff')
  const [gameId, setGameId] = useState<number | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setName(initialData.name)
            setLink(initialData.link || '')
            setColor(initialData.color)
            setGameId(initialData.gameId)
        } else {
            setName('')
            setLink('')
            setColor('#ffffff')
            setGameId(defaultGameId || undefined)
        }
    }
  }, [isOpen, initialData, defaultGameId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
        await onSubmit({ name, link, color, gameId })
        // Don't close here, let parent handle it or close on success
    } finally {
        setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <h2 className="text-xl font-bold text-white mb-4">
          {title}
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

          {games && games.length > 0 && (
              <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Game</label>
                  <select
                      value={gameId || ''}
                      onChange={(e) => setGameId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  >
                      <option value="">Select a game...</option>
                      {games.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                  </select>
              </div>
          )}

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
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
