import { useRef, useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

function Ground() {
    const gridTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, 512, 512);

        // Grid lines
        ctx.strokeStyle = '#1a1a3a';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 512; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }

        // Accent grid (larger)
        ctx.strokeStyle = '#2a1a4a';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 128) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 8);
        return texture;
    }, []);

    return (
        <RigidBody type="fixed" friction={1}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial map={gridTexture} />
            </mesh>
        </RigidBody>
    );
}

function Wall({ position, size, color = '#1a0a3a' }) {
    return (
        <RigidBody type="fixed" position={position}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.3}
                    emissive="#2200ff"
                    emissiveIntensity={0.1}
                />
            </mesh>
            {/* Glowing top edge */}
            <mesh position={[0, size[1] / 2, 0]}>
                <boxGeometry args={[size[0] + 0.1, 0.05, size[2] + 0.1]} />
                <meshStandardMaterial
                    color="#6600ff"
                    emissive="#6600ff"
                    emissiveIntensity={2}
                />
            </mesh>
        </RigidBody>
    );
}

function Obstacle({ position, type = 'crate' }) {
    if (type === 'crate') {
        return (
            <RigidBody type="fixed" position={position} colliders="cuboid">
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial
                        color="#1a1a2e"
                        emissive="#ff0066"
                        emissiveIntensity={0.15}
                    />
                </mesh>
                {/* Neon edge lines */}
                <lineSegments>
                    <edgesGeometry args={[new THREE.BoxGeometry(2.01, 2.01, 2.01)]} />
                    <lineBasicMaterial color="#ff0066" />
                </lineSegments>
            </RigidBody>
        );
    }

    return (
        <RigidBody type="fixed" position={position} colliders="ball">
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[1.2, 1.2, 2.5, 8]} />
                <meshStandardMaterial
                    color="#1a1a2e"
                    emissive="#00ffaa"
                    emissiveIntensity={0.15}
                />
            </mesh>
            <lineSegments>
                <edgesGeometry args={[new THREE.CylinderGeometry(1.21, 1.21, 2.51, 8)]} />
                <lineBasicMaterial color="#00ffaa" />
            </lineSegments>
        </RigidBody>
    );
}

export default function Arena() {
    const arenaSize = 50;
    const wallHeight = 4;
    const wallThickness = 1;

    const obstacles = useMemo(() => [
        { pos: [10, 1, 10], type: 'crate' },
        { pos: [-10, 1, -10], type: 'crate' },
        { pos: [15, 1, -8], type: 'barrel' },
        { pos: [-12, 1, 15], type: 'barrel' },
        { pos: [20, 1, 0], type: 'crate' },
        { pos: [-20, 1, 5], type: 'crate' },
        { pos: [5, 1, -20], type: 'barrel' },
        { pos: [-5, 1, 22], type: 'crate' },
        { pos: [25, 1, 15], type: 'barrel' },
        { pos: [-18, 1, -18], type: 'crate' },
        { pos: [0, 1, 15], type: 'barrel' },
        { pos: [-25, 1, 0], type: 'crate' },
    ], []);

    return (
        <group>
            <Ground />

            {/* Boundary walls */}
            <Wall position={[0, wallHeight / 2, -arenaSize / 2]} size={[arenaSize, wallHeight, wallThickness]} />
            <Wall position={[0, wallHeight / 2, arenaSize / 2]} size={[arenaSize, wallHeight, wallThickness]} />
            <Wall position={[-arenaSize / 2, wallHeight / 2, 0]} size={[wallThickness, wallHeight, arenaSize]} />
            <Wall position={[arenaSize / 2, wallHeight / 2, 0]} size={[wallThickness, wallHeight, arenaSize]} />

            {/* Obstacles */}
            {obstacles.map((obs, i) => (
                <Obstacle key={i} position={obs.pos} type={obs.type} />
            ))}

            {/* Ambient lighting spheres for decoration */}
            {[
                [20, 8, 20], [-20, 8, -20], [20, 8, -20], [-20, 8, 20],
            ].map((pos, i) => (
                <pointLight
                    key={`light-${i}`}
                    position={pos}
                    color={['#ff0066', '#00ffaa', '#6600ff', '#ffaa00'][i]}
                    intensity={15}
                    distance={30}
                />
            ))}
        </group>
    );
}
