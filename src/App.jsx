import { useEffect } from 'react';
import useGameStore from './store/gameStore';
import MainMenu from './ui/MainMenu';
import HUD from './ui/HUD';
import GameOver from './ui/GameOver';
import Game from './components/Game';
import WebGLErrorBoundary from './components/WebGLErrorBoundary';

function App() {
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Escape') {
        if (gameState === 'playing') {
          document.exitPointerLock?.();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  const isInGame = gameState === 'playing' || gameState === 'paused' || gameState === 'gameover';

  return (
    <div className="app">
      {gameState === 'menu' && <MainMenu />}
      {isInGame && (
        <>
          <WebGLErrorBoundary>
            <Game />
          </WebGLErrorBoundary>
          {gameState !== 'gameover' && <HUD />}
          {gameState === 'gameover' && <GameOver />}
        </>
      )}
    </div>
  );
}

export default App;
