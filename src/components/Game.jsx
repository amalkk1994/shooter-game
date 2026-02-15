import { useRef, useCallback, Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Stars } from '@react-three/drei';
import Arena from './Arena';
import Player from './Player';
import ThirdPersonCamera from './ThirdPersonCamera';
import EnemyManager from './Enemy';
import ProjectileManager from './Projectile';
import useGameStore from '../store/gameStore';
import * as THREE from 'three';

function PhysicsWorld() {
    const projectilesRef = useRef({ addProjectile: () => { } });

    const handleShoot = useCallback((rotation, pitch) => {
        const playerPos = useGameStore.getState().playerPosition;

        // Calculate projectile spawn position (at gun muzzle)
        // Matches Player model: gun group at (0.3, 0.7, -0.4), muzzle at (0, 0, -0.65) inside group
        const gunOffset = new THREE.Vector3(0.3, 0.7, -1.05);
        gunOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);

        const spawnPos = [
            playerPos[0] + gunOffset.x,
            playerPos[1] + gunOffset.y,
            playerPos[2] + gunOffset.z,
        ];

        // Direction based on rotation and pitch
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
        dir.normalize();

        projectilesRef.current.addProjectile(spawnPos, [dir.x, dir.y, dir.z]);
    }, []);

    return (
        <Physics gravity={[0, -20, 0]}>
            <Arena />
            <Player onShoot={handleShoot} />
            <ThirdPersonCamera />
            <EnemyManager />
            <ProjectileManager projectilesRef={projectilesRef} />
        </Physics>
    );
}

function LoadingFallback() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#333" wireframe />
        </mesh>
    );
}

export default function Game() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    return (
        <Canvas
            shadows
            camera={{ fov: 60, near: 0.1, far: 200, position: [0, 4, 6] }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.2,
                powerPreference: 'high-performance',
            }}
            onCreated={({ gl }) => {
                gl.setClearColor('#050510');
            }}
        >
            {/* Ambient & directional lighting */}
            <ambientLight intensity={0.15} color="#4444aa" />
            <directionalLight
                position={[20, 30, 10]}
                intensity={0.5}
                color="#6666ff"
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
            />

            {/* Fog for atmosphere */}
            <fog attach="fog" args={['#050510', 30, 80]} />

            {/* Star background */}
            <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />

            <Suspense fallback={<LoadingFallback />}>
                <PhysicsWorld />
            </Suspense>
        </Canvas>
    );
}
