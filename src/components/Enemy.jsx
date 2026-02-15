import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';

const ENEMY_SPEED_BASE = 3;
const ENEMY_COLORS = [
    { body: '#ff0044', emissive: '#ff0044' },
    { body: '#ff6600', emissive: '#ff6600' },
    { body: '#aa00ff', emissive: '#aa00ff' },
    { body: '#00ff88', emissive: '#00ff88' },
    { body: '#ffff00', emissive: '#ffff00' },
];

// Global enemy registry for projectile collision checking
const enemyRegistry = new Map();

export function getEnemyRegistry() {
    return enemyRegistry;
}

function SingleEnemy({ id, position, wave, onDeath, onHitPlayer }) {
    const rigidBodyRef = useRef();
    const meshRef = useRef();
    const healthRef = useRef(50 + wave * 10);
    const aliveRef = useRef(true);
    const [alive, setAlive] = useState(true);
    const [flashTime, setFlashTime] = useState(0);
    const colorIdx = Math.floor(Math.abs(id * 13)) % ENEMY_COLORS.length;
    const color = ENEMY_COLORS[colorIdx];
    const speedMultiplier = 1 + (wave - 1) * 0.15;
    const attackCooldownRef = useRef(0);

    // Register this enemy in the global registry for collision checks
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
                setFlashTime(0.15);
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

        const playerPos = useGameStore.getState().playerPosition;
        const pos = rigidBodyRef.current.translation();
        const dir = new THREE.Vector3(
            playerPos[0] - pos.x,
            0,
            playerPos[2] - pos.z
        );

        const dist = dir.length();
        dir.normalize();

        // Move toward player
        const speed = ENEMY_SPEED_BASE * speedMultiplier;
        if (dist > 1.5) {
            rigidBodyRef.current.setLinvel({
                x: dir.x * speed,
                y: rigidBodyRef.current.linvel().y,
                z: dir.z * speed,
            }, true);
        } else {
            rigidBodyRef.current.setLinvel({
                x: 0,
                y: rigidBodyRef.current.linvel().y,
                z: 0,
            }, true);

            // Attack player
            attackCooldownRef.current -= delta;
            if (attackCooldownRef.current <= 0) {
                onHitPlayer(10 + wave * 2);
                attackCooldownRef.current = 1.0;
            }
        }

        // Flash effect
        if (flashTime > 0) {
            setFlashTime((t) => Math.max(0, t - delta));
        }

        // Rotate to face player
        if (meshRef.current) {
            meshRef.current.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // Floating animation
        if (meshRef.current) {
            meshRef.current.position.y = Math.sin(Date.now() * 0.003 + id) * 0.15;
        }
    });

    if (!alive) return null;

    const isFlashing = flashTime > 0;

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={position}
            enabledRotations={[false, false, false]}
            colliders={false}
            mass={1}
            linearDamping={3}
        >
            <CapsuleCollider args={[0.4, 0.4]} position={[0, 0.8, 0]} />
            <group ref={meshRef}>
                {/* Body */}
                <mesh position={[0, 0.8, 0]} castShadow>
                    <dodecahedronGeometry args={[0.5, 0]} />
                    <meshStandardMaterial
                        color={isFlashing ? '#ffffff' : color.body}
                        emissive={isFlashing ? '#ffffff' : color.emissive}
                        emissiveIntensity={isFlashing ? 3 : 1}
                        metalness={0.5}
                        roughness={0.3}
                    />
                </mesh>
                {/* Eye */}
                <mesh position={[0, 0.9, -0.4]}>
                    <sphereGeometry args={[0.12, 8, 8]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        emissive="#ffffff"
                        emissiveIntensity={2}
                    />
                </mesh>
                {/* Inner eye */}
                <mesh position={[0, 0.9, -0.48]}>
                    <sphereGeometry args={[0.06, 8, 8]} />
                    <meshStandardMaterial
                        color="#000000"
                        emissive={color.emissive}
                        emissiveIntensity={1}
                    />
                </mesh>
                {/* Glow */}
                <pointLight
                    position={[0, 1, 0]}
                    color={color.emissive}
                    intensity={2}
                    distance={5}
                />
            </group>
        </RigidBody>
    );
}

export default function EnemyManager() {
    const [enemies, setEnemies] = useState([]);
    const wave = useGameStore((s) => s.wave);
    const gameState = useGameStore((s) => s.gameState);
    const totalEnemiesInWave = useGameStore((s) => s.totalEnemiesInWave);
    const spawnedRef = useRef(0);
    const spawnTimerRef = useRef(0);
    const lastWaveRef = useRef(0);

    // Reset on new wave
    useEffect(() => {
        if (wave !== lastWaveRef.current && gameState === 'playing') {
            lastWaveRef.current = wave;
            spawnedRef.current = 0;
            setEnemies([]);
        }
    }, [wave, gameState]);

    // Reset on game start
    useEffect(() => {
        if (gameState === 'playing') {
            lastWaveRef.current = wave;
            spawnedRef.current = 0;
            setEnemies([]);
            enemyRegistry.clear();
        }
    }, [gameState]);

    useFrame((_, delta) => {
        if (gameState !== 'playing') return;

        const total = totalEnemiesInWave;
        if (spawnedRef.current >= total) return;

        spawnTimerRef.current -= delta;
        if (spawnTimerRef.current <= 0) {
            spawnTimerRef.current = Math.max(0.5, 2.0 - wave * 0.1);

            // Spawn at random arena edge
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
            setEnemies((prev) => [...prev, { id, position: pos }]);
            spawnedRef.current += 1;
        }
    });

    const handleDeath = useCallback((id) => {
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
                    onDeath={handleDeath}
                    onHitPlayer={handleHitPlayer}
                />
            ))}
        </group>
    );
}
