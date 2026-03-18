import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function GameSelectPage() {
  const { t } = useTranslation('game');
  const { games, setSelectedGame, isLoading } = useGame();
  const navigate = useNavigate();

  const handleSelectGame = (game: any) => {
    setSelectedGame(game);
    navigate('/');
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-400">{t('loading')}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-zinc-950 p-4 pt-20">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t('selectGame')}</h1>
          <p className="text-zinc-400">{t('selectGameDesc')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Card 
              key={game.id} 
              className="cursor-pointer bg-zinc-900 border-zinc-800 transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
              onClick={() => handleSelectGame(game)}
            >
              <CardHeader className="pb-4">
                {game.imageUrl && (
                    <div className="mb-4 aspect-video w-full overflow-hidden rounded-md bg-zinc-950">
                        <img src={game.imageUrl} alt={game.name} className="h-full w-full object-cover" />
                    </div>
                )}
                <CardTitle className="text-white">{game.name}</CardTitle>
                <CardDescription className="text-zinc-500 line-clamp-2">
                    {game.description || t('noDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">{t('select')}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {games.length === 0 && (
             <div className="text-center text-zinc-500">{t('noGames')}</div>
        )}
      </div>
    </div>
  );
}
