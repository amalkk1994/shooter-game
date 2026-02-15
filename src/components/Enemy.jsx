import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';
import { ExplosionEffect } from './Effects';
import { playExplosionSound, playHitSound } from '../utils/sounds';

const ENEMY_SPEED_BASE = 3;
const MODEL_PATH = '/models/Xbot.glb';

const ENEMY_COLORS = [
    { color: '#ff0044', name: 'red' },
    { color: '#ff6600', name: 'orange' },
    { color: '#aa00ff', name: 'purple' },
    { color: '#00ff88', name: 'green' },
    { color: '#ffff00', name: 'yellow' },
];

// Enemy variant definitions
const ENEMY_VARIANTS = {
    normal: { scale: 1.0, healthMult: 1.0, speedMult: 1.0, colliderH: 0.4, colliderR: 0.3, jumps: false },
    tank: { scale: 1.6, healthMult: 3.0, speedMult: 0.7, colliderH: 0.6, colliderR: 0.5, jumps: false },
    speeder: { scale: 0.85, healthMult: 0.6, speedMult: 2.2, colliderH: 0.35, colliderR: 0.25, jumps: false },
    jumper: { scale: 1.0, healthMult: 1.0, speedMult: 1.1, colliderH: 0.4, colliderR: 0.3, jumps: true },
};

function pickVariant() {
    const roll = Math.random();
    if (roll < 0.20) return 'tank';
    if (roll < 0.35) return 'speeder';
    if (roll < 0.50) return 'jumper';
    return 'normal';
}

// Preload
useGLTF.preload(MODEL_PATH);

// Global enemy registry for projectile collision checking
const enemyRegistry = new Map();

export function getEnemyRegistry() {
    return enemyRegistry;
}

function SingleEnemy({ id, position, wave, variant = 'normal', onDeath, onHitPlayer }) {
    const rigidBodyRef = useRef();
    const meshRef = useRef();
    const vDef = ENEMY_VARIANTS[variant] || ENEMY_VARIANTS.normal;
    const healthRef = useRef((50 + wave * 10) * vDef.healthMult);
    const aliveRef = useRef(true);
    const [alive, setAlive] = useState(true);
    const [flashTime, setFlashTime] = useState(0);
    const colorIdx = Math.floor(Math.abs(id * 13)) % ENEMY_COLORS.length;
    const enemyColor = ENEMY_COLORS[colorIdx];
    const speedMultiplier = (1 + (wave - 1) * 0.15) * vDef.speedMult;
    const attackCooldownRef = useRef(0);
    const jumpTimerRef = useRef(Math.random() * 1.5); // stagger initial jump timing

    // Load and clone model with unique color
    const { scene, animations } = useGLTF(MODEL_PATH);
    const clonedScene = useMemo(() => {
        const clone = cloneSkeleton(scene);
        clone.traverse((child) => {
            if (child.isMesh || child.isSkinnedMesh) {
                child.castShadow = true;
                if (child.material) {
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color(enemyColor.color);
                    child.material.emissiveIntensity = 0.6;
                }
            }
        });
        clone.scale.set(vDef.scale, vDef.scale, vDef.scale);
        return clone;
    }, [scene, enemyColor.color]);

    const { actions, mixer } = useAnimations(animations, clonedScene);

    // Start with run animation by default (enemies are always chasing)
    useEffect(() => {
        const actionNames = Object.keys(actions);
        const runAction = actions['run'] || actions[actionNames.find(n => n.toLowerCase().includes('run'))] || actions[actionNames[actionNames.length - 1]];
        if (runAction) {
            runAction.reset().fadeIn(0.2).play();
        }
        return () => {
            Object.values(actions).forEach((a) => a?.stop());
        };
    }, [actions]);

    // Register in global registry
    useEffect(() => {
        const entry = {
            getPosition: () => {
                if (rigidBodyRef.current) {
                    const t = rigidBodyRef.current.translation();
                    return [t.x, t.y, t.z];
                }
                return position;
            },
            takeDamage: (dmg) => {
                if (!aliveRef.current) return;
                healthRef.current -= dmg;
                setFlashTime(0.2);
                playHitSound();
                if (healthRef.current <= 0) {
                    aliveRef.current = false;
                    setAlive(false);
                    onDeath(id);
                }
            },
            isAlive: () => aliveRef.current,
        };
        enemyRegistry.set(id, entry);
        return () => {
            enemyRegistry.delete(id);
        };
    }, [id, position, onDeath]);

    useFrame((_, delta) => {
        if (!aliveRef.current || !rigidBodyRef.current) return;

        // Update animation mixer
        mixer?.update(delta);

        const playerPos = useGameStore.getState().playerPosition;
        const pos = rigidBodyRef.current.translation();
        const dir = new THREE.Vector3(
            playerPos[0] - pos.x,
            0,
            playerPos[2] - pos.z
        );

        const dist = dir.length();
        dir.normalize();

        const speed = ENEMY_SPEED_BASE * speedMultiplier;
        let currentYVel = rigidBodyRef.current.linvel().y;

        // Jumper variant: periodic leaps while chasing
        if (vDef.jumps && dist > 1.5) {
            jumpTimerRef.current -= delta;
            if (jumpTimerRef.current <= 0) {
                currentYVel = 6 + Math.random() * 3; // impulse upward
                jumpTimerRef.current = 1.0 + Math.random() * 1.5; // random interval
            }
        }

        if (dist > 1.5) {
            rigidBodyRef.current.setLinvel({
                x: dir.x * speed,
                y: currentYVel,
                z: dir.z * speed,
            }, true);
        } else {
            rigidBodyRef.current.setLinvel({
                x: 0,
                y: currentYVel,
                z: 0,
            }, true);

            attackCooldownRef.current -= delta;
            if (attackCooldownRef.current <= 0) {
                onHitPlayer(10 + wave * 2);
                attackCooldownRef.current = 1.0;
            }
        }

        if (flashTime > 0) {
            setFlashTime((t) => Math.max(0, t - delta));
            // Blink effect: toggle visibility rapidly (~15Hz)
            if (meshRef.current) {
                meshRef.current.visible = Math.sin(flashTime * 45) > 0;
            }
        } else if (meshRef.current && !meshRef.current.visible) {
            meshRef.current.visible = true;
        }

        // Rotate to face player
        if (meshRef.current) {
            meshRef.current.rotation.y = Math.atan2(dir.x, dir.z);
        }
    });

    if (!alive) return null;

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={position}
            enabledRotations={[false, false, false]}
            colliders={false}
            mass={1}
            linearDamping={3}
        >
            <CapsuleCollider args={[vDef.colliderH, vDef.colliderR]} position={[0, 0.7 * vDef.scale, 0]} />
            <group ref={meshRef}>
                <primitive object={clonedScene} position={[0, 0, 0]} />
                {/* Glow light matching the enemy's color */}
                <pointLight
                    position={[0, 1, 0]}
                    color={enemyColor.color}
                    intensity={flashTime > 0 ? 8 : 2}
                    distance={5}
                />
            </group>
        </RigidBody>
    );
}

export default function EnemyManager() {
    const [enemies, setEnemies] = useState([]);
    const [explosions, setExplosions] = useState([]);
    const wave = useGameStore((s) => s.wave);
    const gameState = useGameStore((s) => s.gameState);
    const totalEnemiesInWave = useGameStore((s) => s.totalEnemiesInWave);
    const spawnedRef = useRef(0);
    const spawnTimerRef = useRef(0);
    const lastWaveRef = useRef(0);

    useEffect(() => {
        if (wave !== lastWaveRef.current && gameState === 'playing') {
            lastWaveRef.current = wave;
            spawnedRef.current = 0;
            setEnemies([]);
        }
    }, [wave, gameState]);

    useEffect(() => {
        if (gameState === 'playing') {
            lastWaveRef.current = wave;
            spawnedRef.current = 0;
            setEnemies([]);
            setExplosions([]);
            enemyRegistry.clear();
        }
    }, [gameState]);

    // Auto-clean explosions after 1 second
    useFrame((_, delta) => {
        if (gameState !== 'playing') return;

        // Clean old explosions
        setExplosions((prev) => prev.filter((e) => Date.now() - e.time < 1000));

        const total = totalEnemiesInWave;
        if (spawnedRef.current >= total) return;

        spawnTimerRef.current -= delta;
        if (spawnTimerRef.current <= 0) {
            spawnTimerRef.current = Math.max(0.5, 2.0 - wave * 0.1);

            const side = Math.floor(Math.random() * 4);
            const offset = (Math.random() - 0.5) * 40;
            let pos;
            switch (side) {
                case 0: pos = [offset, 1, -22]; break;
                case 1: pos = [offset, 1, 22]; break;
                case 2: pos = [-22, 1, offset]; break;
                default: pos = [22, 1, offset]; break;
            }

            const id = spawnedRef.current + wave * 1000 + Math.random();
            const variant = pickVariant();
            setEnemies((prev) => [...prev, { id, position: pos, variant }]);
            spawnedRef.current += 1;
        }
    });

    const handleDeath = useCallback((id) => {
        // Get the enemy's last position for the explosion
        const registry = enemyRegistry.get(id);
        if (registry) {
            const pos = registry.getPosition();
            const colorIdx = Math.floor(Math.abs(id * 13)) % ENEMY_COLORS.length;
            setExplosions((prev) => [
                ...prev,
                { id: Date.now() + Math.random(), position: pos, color: ENEMY_COLORS[colorIdx].color, time: Date.now() },
            ]);
            playExplosionSound();
        }
        setEnemies((prev) => prev.filter((e) => e.id !== id));
        useGameStore.getState().enemyKilled();
    }, []);

    const handleHitPlayer = useCallback((damage) => {
        useGameStore.getState().takeDamage(damage);
    }, []);

    return (
        <group>
            {enemies.map((enemy) => (
                <SingleEnemy
                    key={enemy.id}
                    id={enemy.id}
                    position={enemy.position}
                    wave={wave}
                    variant={enemy.variant}
                    onDeath={handleDeath}
                    onHitPlayer={handleHitPlayer}
                />
            ))}
            {explosions.map((exp) => (
                <ExplosionEffect
                    key={exp.id}
                    position={exp.position}
                    color={exp.color}
                />
            ))}
        </group>
    );
}

