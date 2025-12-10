import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { ChevronDown, Gamepad2, Grid } from 'lucide-react';

export function GameSwitcher() {
  const { games, selectedGame, setSelectedGame } = useGame();
  const navigate = useNavigate();

  if (!selectedGame && games.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-3 text-zinc-400 hover:text-white">
          {selectedGame ? (
            <>
              {selectedGame.imageUrl ? (
                <img src={selectedGame.imageUrl} alt="" className="h-5 w-5 rounded object-cover" />
              ) : (
                <Gamepad2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline-block">{selectedGame.name}</span>
            </>
          ) : (
            <span>Select Game</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] bg-zinc-950 border-zinc-800">
        {games.map((game) => (
          <DropdownMenuItem
            key={game.id}
            className="cursor-pointer text-zinc-400 focus:bg-zinc-900 focus:text-white"
            onClick={() => {
              setSelectedGame(game);
              // navigate('/'); // Removed to keep current page
            }}
          >
             {game.imageUrl && (
                <img src={game.imageUrl} alt="" className="mr-2 h-4 w-4 rounded object-cover" />
            )}
            {game.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-zinc-400 focus:bg-zinc-900 focus:text-white"
          onClick={() => navigate('/select-game')}
        >
          <Grid className="mr-2 h-4 w-4" />
          View All Games
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
