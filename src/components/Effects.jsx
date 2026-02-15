import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particle({ position, velocity, color, size, lifetime }) {
    const ref = useRef();
    const ageRef = useRef(0);
    const vel = useRef(new THREE.Vector3(...velocity));

    useFrame((_, delta) => {
        if (!ref.current) return;
        ageRef.current += delta;
        if (ageRef.current > lifetime) {
            ref.current.visible = false;
            return;
        }

        ref.current.position.x += vel.current.x * delta;
        ref.current.position.y += vel.current.y * delta;
        ref.current.position.z += vel.current.z * delta;

        vel.current.y -= 9.8 * delta;

        const progress = ageRef.current / lifetime;
        ref.current.scale.setScalar(1 - progress);
        ref.current.material.opacity = 1 - progress;
    });

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[size, 6, 6]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={3}
                transparent
                opacity={1}
            />
        </mesh>
    );
}

export function MuzzleFlash({ position, rotation }) {
    const ref = useRef();
    const ageRef = useRef(0);

    useFrame((_, delta) => {
        if (!ref.current) return;
        ageRef.current += delta;
        if (ageRef.current > 0.1) {
            ref.current.visible = false;
        }
    });

    if (!position) return null;

    return (
        <mesh ref={ref} position={position} rotation={[0, rotation, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial
                color="#ffaa00"
                emissive="#ff6600"
                emissiveIntensity={10}
                transparent
                opacity={0.8}
            />
        </mesh>
    );
}

export function ExplosionEffect({ position, color = '#ff4400' }) {
    const particles = useRef(
        Array.from({ length: 12 }, () => ({
            velocity: [
                (Math.random() - 0.5) * 8,
                Math.random() * 6 + 2,
                (Math.random() - 0.5) * 8,
            ],
            size: Math.random() * 0.15 + 0.05,
            lifetime: Math.random() * 0.5 + 0.3,
        }))
    ).current;

    return (
        <group>
            {particles.map((p, i) => (
                <Particle
                    key={i}
                    position={position}
                    velocity={p.velocity}
                    color={color}
                    size={p.size}
                    lifetime={p.lifetime}
                />
            ))}
        </group>
    );
}
