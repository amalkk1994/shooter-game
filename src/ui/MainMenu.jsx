import useGameStore from '../store/gameStore';

export default function MainMenu() {
    const startGame = useGameStore((s) => s.startGame);
    const highScores = useGameStore((s) => s.highScores);

    return (
        <div className="menu-overlay">
            <div className="menu-container">
                <div className="menu-title-section">
                    <h1 className="game-title">
                        <span className="title-glow">NEON</span>
                        <span className="title-strike">STRIKE</span>
                    </h1>
                    <p className="game-subtitle">WAVE SURVIVAL SHOOTER</p>
                </div>

                <button className="play-button" onClick={startGame}>
                    <span className="play-icon">▶</span>
                    <span>PLAY</span>
                </button>

                <div className="controls-info">
                    <h3>CONTROLS</h3>
                    <div className="control-grid">
                        <div className="control-item">
                            <kbd>W A S D</kbd>
                            <span>Move</span>
                        </div>
                        <div className="control-item">
                            <kbd>MOUSE</kbd>
                            <span>Aim</span>
                        </div>
                        <div className="control-item">
                            <kbd>CLICK</kbd>
                            <span>Shoot</span>
                        </div>
                        <div className="control-item">
                            <kbd>R</kbd>
                            <span>Reload</span>
                        </div>
                    </div>
                </div>

                {highScores.length > 0 && (
                    <div className="highscore-section">
                        <h3>HIGH SCORES</h3>
                        <div className="highscore-list">
                            {highScores.slice(0, 5).map((entry, i) => (
                                <div key={i} className={`highscore-entry ${i === 0 ? 'top-score' : ''}`}>
                                    <span className="rank">#{i + 1}</span>
                                    <span className="name">{entry.name}</span>
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
