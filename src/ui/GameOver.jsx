import { useState } from 'react';
import useGameStore from '../store/gameStore';

export default function GameOver() {
    const [playerName, setPlayerName] = useState('');
    const [saved, setSaved] = useState(false);
    const score = useGameStore((s) => s.score);
    const wave = useGameStore((s) => s.wave);
    const kills = useGameStore((s) => s.kills);
    const highScores = useGameStore((s) => s.highScores);
    const saveHighScore = useGameStore((s) => s.saveHighScore);
    const startGame = useGameStore((s) => s.startGame);
    const goToMenu = useGameStore((s) => s.goToMenu);

    const handleSave = () => {
        if (!saved) {
            saveHighScore(playerName || 'Anonymous');
            setSaved(true);
        }
    };

    const handlePlayAgain = () => {
        if (!saved) handleSave();
        startGame();
    };

    const handleMenu = () => {
        if (!saved) handleSave();
        goToMenu();
    };

    return (
        <div className="menu-overlay gameover-overlay">
            <div className="menu-container gameover-container">
                <h1 className="gameover-title">GAME OVER</h1>

                <div className="gameover-stats">
                    <div className="stat-item">
                        <span className="stat-label">FINAL SCORE</span>
                        <span className="stat-value score-glow">{score.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                        <div className="stat-item small">
                            <span className="stat-label">WAVE</span>
                            <span className="stat-value">{wave}</span>
                        </div>
                        <div className="stat-item small">
                            <span className="stat-label">KILLS</span>
                            <span className="stat-value">{kills}</span>
                        </div>
                    </div>
                </div>

                {!saved && (
                    <div className="name-input-section">
                        <label className="input-label">ENTER YOUR NAME</label>
                        <input
                            type="text"
                            className="name-input"
                            placeholder="Anonymous"
                            maxLength={15}
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            autoFocus
                        />
                        <button className="save-button" onClick={handleSave}>
                            SAVE SCORE
                        </button>
                    </div>
                )}

                {saved && (
                    <div className="saved-message">
                        ✓ Score saved!
                    </div>
                )}

                <div className="gameover-buttons">
                    <button className="play-button" onClick={handlePlayAgain}>
                        <span className="play-icon">↻</span>
                        <span>PLAY AGAIN</span>
                    </button>
                    <button className="menu-button" onClick={handleMenu}>
                        MAIN MENU
                    </button>
                </div>

                {highScores.length > 0 && (
                    <div className="highscore-section">
                        <h3>LEADERBOARD</h3>
                        <div className="highscore-list">
                            {highScores.slice(0, 10).map((entry, i) => (
                                <div
                                    key={i}
                                    className={`highscore-entry ${i === 0 ? 'top-score' : ''} ${entry.score === score && !saved ? '' : ''}`}
                                >
                                    <span className="rank">#{i + 1}</span>
                                    <span className="name">{entry.name}</span>
                                    <span className="hs-wave">W{entry.wave}</span>
                                    <span className="score-val">{entry.score.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
