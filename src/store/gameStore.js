import { create } from 'zustand';

const STORAGE_KEY = 'shooter-high-scores';

const loadHighScores = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

const saveHighScores = (scores) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch {
        // Storage full or unavailable
    }
};

const useGameStore = create((set, get) => ({
    // Game state
    gameState: 'menu', // menu | playing | paused | gameover
    score: 0,
    wave: 1,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    kills: 0,
    enemiesRemaining: 0,
    totalEnemiesInWave: 0,
    highScores: loadHighScores(),

    // Player position tracking
    playerPosition: [0, 0, 0],
    playerRotation: 0,
    playerPitch: 0,

    // Actions
    startGame: () => set({
        gameState: 'playing',
        score: 0,
        wave: 1,
        health: 100,
        ammo: 30,
        kills: 0,
        enemiesRemaining: 5,
        totalEnemiesInWave: 5,
    }),

    endGame: () => {
        const { score } = get();
        set({ gameState: 'gameover' });
        return score;
    },

    pauseGame: () => {
        const { gameState } = get();
        if (gameState === 'playing') {
            set({ gameState: 'paused' });
        } else if (gameState === 'paused') {
            set({ gameState: 'playing' });
        }
    },

    goToMenu: () => set({ gameState: 'menu' }),

    addScore: (points) => set((state) => ({ score: state.score + points })),

    takeDamage: (damage) => {
        const { health } = get();
        const newHealth = Math.max(0, health - damage);
        set({ health: newHealth });
        if (newHealth <= 0) {
            get().endGame();
        }
    },

    heal: (amount) => set((state) => ({
        health: Math.min(state.maxHealth, state.health + amount),
    })),

    shoot: () => {
        // Unlimited ammo
        return true;
    },

    reload: () => set((state) => ({ ammo: state.maxAmmo })),

    enemyKilled: () => {
        const state = get();
        const newKills = state.kills + 1;
        const newRemaining = state.enemiesRemaining - 1;
        const basePoints = 100;
        const waveBonus = state.wave * 10;

        set({
            kills: newKills,
            score: state.score + basePoints + waveBonus,
            enemiesRemaining: newRemaining,
        });

        // Check for wave completion
        if (newRemaining <= 0) {
            setTimeout(() => get().nextWave(), 2000);
        }
    },

    nextWave: () => {
        const { wave, health, maxHealth } = get();
        const newWave = wave + 1;
        const enemyCount = 5 + (newWave - 1) * 3;
        set({
            wave: newWave,
            enemiesRemaining: enemyCount,
            totalEnemiesInWave: enemyCount,
            ammo: 30,
            health: Math.min(maxHealth, health + 20), // Small heal between waves
            score: get().score + wave * 50, // Wave completion bonus
        });
    },

    saveHighScore: (name) => {
        const { score, wave, kills, highScores } = get();
        const newEntry = {
            name: name || 'Anonymous',
            score,
            wave,
            kills,
            date: new Date().toISOString(),
        };
        const updated = [...highScores, newEntry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        saveHighScores(updated);
        set({ highScores: updated });
    },

    setPlayerPosition: (pos) => set({ playerPosition: pos }),
    setPlayerRotation: (rot) => set({ playerRotation: rot }),
    setPlayerPitch: (pitch) => set({ playerPitch: pitch }),
}));

export default useGameStore;
