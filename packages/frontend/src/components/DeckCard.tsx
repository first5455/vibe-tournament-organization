import { Button } from './ui/button'
import { Trash2, Edit2, ExternalLink } from 'lucide-react'
import { Deck } from '../types'

// Extended interface to include stats that might not be in the base Deck type yet
export interface DeckWithStats extends Deck {
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

interface DeckCardProps {
  deck: DeckWithStats
  onEdit?: (deck: DeckWithStats) => void
  onDelete?: (id: number) => void
  showActions?: boolean
}

export function DeckCard({ deck, onEdit, onDelete, showActions = false }: DeckCardProps) {
  return (
    <div 
        className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all flex flex-col group relative overflow-hidden"
    >
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: deck.color }}></div>
        
        <div className="flex justify-between items-start mb-2 pl-2">
        <h3 className="font-semibold text-lg text-white truncate" style={{ color: deck.color }}>{deck.name}</h3>
        {showActions && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                    <button 
                        onClick={() => onEdit(deck)}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
                {onDelete && (
                    <button 
                        onClick={() => onDelete(deck.id)}
                        className="p-1.5 hover:bg-red-900/50 rounded text-zinc-400 hover:text-red-400"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        )}
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
                <span className="text-[10px] uppercase font-bold text-zinc-600">Play First Winrate</span>
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
                <span className="text-[10px] uppercase font-bold text-zinc-600">Play Second Winrate</span>
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
            <Button 
            variant="outline" 
            size="sm"
            className="text-blue-400 border-blue-400/20 hover:bg-blue-400/10 hover:text-blue-300"
            onClick={() => window.open(deck.link!, '_blank')}
            >
            View Decklist <ExternalLink className="ml-2 w-3 h-3" />
            </Button>
        </div>
        )}
        
        <div className="mt-auto pl-2 pt-4 border-t border-zinc-800 flex justify-between text-xs text-zinc-500">
        <span>Created {new Date(deck.createdAt!).toLocaleDateString()}</span>
        </div>
    </div>
  )
}
