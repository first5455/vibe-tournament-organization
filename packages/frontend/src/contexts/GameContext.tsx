import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Game {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
}

interface GameContextType {
  games: Game[];
  selectedGame: Game | null;
  setSelectedGame: (game: Game) => void;
  refreshGames: () => Promise<void>;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGameState] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = async () => {
    try {
      const response = await api('/games', { method: 'GET' });
      if (Array.isArray(response)) {
        setGames(response);
        return response;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch games:', error);
      return [];
    }
  };

  const setSelectedGame = (game: Game) => {
    setSelectedGameState(game);
    localStorage.setItem('selectedGameId', game.id.toString());
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const fetchedGames = await fetchGames();
      
      const storedGameId = localStorage.getItem('selectedGameId');
      if (storedGameId && fetchedGames.length > 0) {
        const found = fetchedGames.find((g: Game) => g.id === parseInt(storedGameId));
        if (found) {
            setSelectedGameState(found);
        } else {
            // Fallback to first if local storage invalid
             // Actually, maybe don't select? Let user select.
             // But requirement says "Default Union Arena".
             // If we migrated, Union Arena is ID 1 usually.
             if (fetchedGames.length > 0) {
                 setSelectedGameState(fetchedGames[0]);
                 localStorage.setItem('selectedGameId', fetchedGames[0].id.toString());
             }
        }
      } else if (fetchedGames.length > 0) {
         // Auto select first game if nothing stored
         setSelectedGameState(fetchedGames[0]);
         localStorage.setItem('selectedGameId', fetchedGames[0].id.toString());
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const refreshGames = async () => {
      await fetchGames();
  };

  return (
    <GameContext.Provider value={{ games, selectedGame, setSelectedGame, refreshGames, isLoading }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
