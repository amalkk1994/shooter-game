import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getEnemyRegistry } from './Enemy';

const PROJECTILE_SPEED = 40;
const PROJECTILE_LIFETIME = 3;
const HIT_RADIUS = 1.0; // Distance threshold for hitting enemies

function Projectile({ id, position, direction, onRemove }) {
    const meshRef = useRef();
    const ageRef = useRef(0);
    const aliveRef = useRef(true);
    const posRef = useRef(new THREE.Vector3(...position));
    const dirRef = useRef(new THREE.Vector3(...direction).normalize());

    useFrame((_, delta) => {
        if (!meshRef.current || !aliveRef.current) return;

        ageRef.current += delta;
        if (ageRef.current > PROJECTILE_LIFETIME) {
            aliveRef.current = false;
            onRemove(id);
            return;
        }

        // Move projectile manually (no physics)
        posRef.current.x += dirRef.current.x * PROJECTILE_SPEED * delta;
        posRef.current.y += dirRef.current.y * PROJECTILE_SPEED * delta;
        posRef.current.z += dirRef.current.z * PROJECTILE_SPEED * delta;

        meshRef.current.position.copy(posRef.current);

        // Check out of bounds
        if (
            Math.abs(posRef.current.x) > 26 ||
            Math.abs(posRef.current.z) > 26 ||
            posRef.current.y < -1 ||
            posRef.current.y > 20
        ) {
            aliveRef.current = false;
            onRemove(id);
            return;
        }

        // Distance-based collision with enemies
        const enemies = getEnemyRegistry();
        for (const [enemyId, enemy] of enemies) {
            if (!enemy.isAlive()) continue;
            const enemyPos = enemy.getPosition();
            const dx = posRef.current.x - enemyPos[0];
            const dy = posRef.current.y - enemyPos[1];
            const dz = posRef.current.z - enemyPos[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < HIT_RADIUS) {
                enemy.takeDamage(25);
                aliveRef.current = false;
                onRemove(id);
                return;
            }
        }
    });

    return (
        <group ref={meshRef} position={position}>
            <mesh>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial
                    color="#ff4400"
                    emissive="#ff6600"
                    emissiveIntensity={5}
                />
            </mesh>
            <pointLight color="#ff4400" intensity={5} distance={4} />
        </group>
    );
}

export default function ProjectileManager({ projectilesRef }) {
    const [projectiles, setProjectiles] = useState([]);

    const addProjectile = useCallback((position, direction) => {
        const id = Date.now() + Math.random();
        setProjectiles((prev) => [
            ...prev,
            { id, position: [...position], direction: [...direction] },
        ]);
    }, []);

    // Store the add function on the ref
    if (projectilesRef) {
        projectilesRef.current = { addProjectile };
    }

    const handleRemove = useCallback((id) => {
        setProjectiles((prev) => prev.filter((p) => p.id !== id));
    }, []);

    return (
        <group>
            {projectiles.map((proj) => (
                <Projectile
                    key={proj.id}
                    id={proj.id}
                    position={proj.position}
                    direction={proj.direction}
                    onRemove={handleRemove}
                />
            ))}
        </group>
    );
}
