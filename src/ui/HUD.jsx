import useGameStore from '../store/gameStore';

export default function HUD() {
    const score = useGameStore((s) => s.score);
    const wave = useGameStore((s) => s.wave);
    const health = useGameStore((s) => s.health);
    const maxHealth = useGameStore((s) => s.maxHealth);
    const ammo = useGameStore((s) => s.ammo);
    const maxAmmo = useGameStore((s) => s.maxAmmo);
    const kills = useGameStore((s) => s.kills);
    const enemiesRemaining = useGameStore((s) => s.enemiesRemaining);

    const healthPercent = (health / maxHealth) * 100;
    const healthColor = healthPercent > 60 ? '#00ff88' : healthPercent > 30 ? '#ffaa00' : '#ff0044';

    return (
        <div className="hud-overlay">
            {/* Crosshair */}
            <div className="crosshair">
                <div className="crosshair-dot" />
                <div className="crosshair-line crosshair-top" />
                <div className="crosshair-line crosshair-bottom" />
                <div className="crosshair-line crosshair-left" />
                <div className="crosshair-line crosshair-right" />
            </div>

            {/* Top bar */}
            <div className="hud-top">
                <div className="hud-score">
                    <span className="hud-label">SCORE</span>
                    <span className="hud-value">{score.toLocaleString()}</span>
                </div>
                <div className="hud-wave">
                    <span className="hud-label">WAVE</span>
                    <span className="hud-value hud-wave-num">{wave}</span>
                </div>
                <div className="hud-kills">
                    <span className="hud-label">KILLS</span>
                    <span className="hud-value">{kills}</span>
                </div>
            </div>

            {/* Bottom left - health */}
            <div className="hud-bottom-left">
                <div className="hud-health">
                    <span className="hud-label">HP</span>
                    <div className="health-bar-container">
                        <div
                            className="health-bar-fill"
                            style={{
                                width: `${healthPercent}%`,
                                backgroundColor: healthColor,
                                boxShadow: `0 0 10px ${healthColor}, 0 0 20px ${healthColor}40`,
                            }}
                        />
                    </div>
                    <span className="health-text">{health}</span>
                </div>
            </div>

            {/* Bottom right - ammo */}
            <div className="hud-bottom-right">
                <div className="hud-ammo">
                    <span className="ammo-current">∞</span>
                    <span className="hud-label ammo-label">AMMO</span>
                </div>
            </div>

            {/* Enemy counter */}
            <div className="hud-enemies">
                <span className="hud-label">ENEMIES</span>
                <span className="hud-value">{enemiesRemaining}</span>
            </div>

            {/* Pointer lock hint */}
            <div className="hud-hint">
                Click to lock cursor • ESC to unlock
            </div>
        </div>
    );
}
