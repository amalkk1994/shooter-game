import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';

const MOVE_SPEED = 8;
const MOUSE_SENSITIVITY = 0.003;
const keys = {};

export default function Player({ onShoot }) {
    const rigidBodyRef = useRef();
    const meshRef = useRef();
    const rotationRef = useRef(0); // yaw (horizontal)
    const pitchRef = useRef(0);   // pitch (vertical)
    const isLockedRef = useRef(false);
    const { gl } = useThree();

    const gameState = useGameStore((s) => s.gameState);
    const shoot = useGameStore((s) => s.shoot);
    const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
    const setPlayerRotation = useGameStore((s) => s.setPlayerRotation);
    const setPlayerPitch = useGameStore((s) => s.setPlayerPitch);

    useEffect(() => {
        const handleKeyDown = (e) => {
            keys[e.code] = true;
            if (e.code === 'KeyR') {
                useGameStore.getState().reload();
            }
        };
        const handleKeyUp = (e) => { keys[e.code] = false; };

        const handleMouseMove = (e) => {
            if (!isLockedRef.current) return;
            // Yaw: horizontal mouse movement rotates around Y axis
            rotationRef.current -= e.movementX * MOUSE_SENSITIVITY;
            // Pitch: vertical mouse movement tilts camera up/down
            pitchRef.current = Math.max(
                -Math.PI / 3,  // can look further up
                Math.min(Math.PI / 6, pitchRef.current - e.movementY * MOUSE_SENSITIVITY)
            );
        };

        const handleClick = () => {
            if (gameState !== 'playing') return;
            if (!isLockedRef.current) {
                gl.domElement.requestPointerLock();
                return;
            }
            if (shoot()) {
                onShoot?.(rotationRef.current, pitchRef.current);
            }
        };

        const handlePointerLockChange = () => {
            isLockedRef.current = document.pointerLockElement === gl.domElement;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('click', handleClick);
        document.addEventListener('pointerlockchange', handlePointerLockChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
            document.removeEventListener('pointerlockchange', handlePointerLockChange);
        };
    }, [gl, gameState, shoot, onShoot, setPlayerPitch]);

    useFrame(() => {
        if (!rigidBodyRef.current || gameState !== 'playing') return;

        const yaw = rotationRef.current;

        // Build input direction in local space
        // W = forward (-Z), S = backward (+Z), A = left (-X), D = right (+X)
        let inputX = 0;
        let inputZ = 0;
        if (keys['KeyW'] || keys['ArrowUp']) inputZ = -1;
        if (keys['KeyS'] || keys['ArrowDown']) inputZ = 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inputX = -1;
        if (keys['KeyD'] || keys['ArrowRight']) inputX = 1;

        // Normalize diagonal movement
        const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (len > 0) {
            inputX /= len;
            inputZ /= len;
        }

        // Rotate input by yaw to convert from local space to world space
        // Forward in local space (-Z) should map to the direction the camera is facing
        const sinYaw = Math.sin(yaw);
        const cosYaw = Math.cos(yaw);
        const worldX = inputX * cosYaw + inputZ * sinYaw;
        const worldZ = -inputX * sinYaw + inputZ * cosYaw;

        const currentVel = rigidBodyRef.current.linvel();
        rigidBodyRef.current.setLinvel({
            x: worldX * MOVE_SPEED,
            y: currentVel.y,
            z: worldZ * MOVE_SPEED,
        }, true);

        // Character mesh faces the direction the camera is looking
        if (meshRef.current) {
            meshRef.current.rotation.y = yaw;
        }

        // Update store with position, rotation, and pitch
        const pos = rigidBodyRef.current.translation();
        setPlayerPosition([pos.x, pos.y, pos.z]);
        setPlayerRotation(yaw);
        setPlayerPitch(pitchRef.current);
    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={[0, 2, 0]}
            enabledRotations={[false, false, false]}
            colliders={false}
            mass={1}
            linearDamping={5}
        >
            <CapsuleCollider args={[0.5, 0.4]} position={[0, 0.9, 0]} />
            <group ref={meshRef}>
                {/* Body */}
                <mesh position={[0, 1, 0]} castShadow>
                    <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
                    <meshStandardMaterial
                        color="#1a1a3a"
                        emissive="#00aaff"
                        emissiveIntensity={0.3}
                        metalness={0.8}
                        roughness={0.2}
                    />
                </mesh>
                {/* Head / Visor */}
                <mesh position={[0, 1.5, -0.2]} castShadow>
                    <boxGeometry args={[0.35, 0.1, 0.12]} />
                    <meshStandardMaterial
                        color="#00ffff"
                        emissive="#00ffff"
                        emissiveIntensity={2}
                    />
                </mesh>
                {/* Right arm holding gun — extended forward */}
                <group position={[0.35, 0.65, -0.2]}>
                    {/* Upper arm */}
                    <mesh castShadow>
                        <boxGeometry args={[0.1, 0.25, 0.15]} />
                        <meshStandardMaterial color="#1a1a3a" emissive="#00aaff" emissiveIntensity={0.2} />
                    </mesh>
                    {/* Gun body */}
                    <mesh position={[0, -0.05, -0.55]} castShadow>
                        <boxGeometry args={[0.1, 0.12, 0.7]} />
                        <meshStandardMaterial
                            color="#2a2a4a"
                            emissive="#ff4400"
                            emissiveIntensity={0.5}
                            metalness={0.9}
                            roughness={0.1}
                        />
                    </mesh>
                    {/* Gun grip */}
                    <mesh position={[0, -0.15, -0.3]} castShadow>
                        <boxGeometry args={[0.08, 0.15, 0.08]} />
                        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
                    </mesh>
                    {/* Muzzle tip */}
                    <mesh position={[0, -0.05, -0.9]}>
                        <sphereGeometry args={[0.05, 8, 8]} />
                        <meshStandardMaterial
                            color="#ff4400"
                            emissive="#ff4400"
                            emissiveIntensity={3}
                        />
                    </mesh>
                    {/* Laser sight — a thin line extending far from the muzzle */}
                    <mesh position={[0, -0.05, -4.5]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.005, 0.005, 7, 4]} />
                        <meshStandardMaterial
                            color="#ff0000"
                            emissive="#ff0000"
                            emissiveIntensity={5}
                            transparent
                            opacity={0.4}
                        />
                    </mesh>
                </group>
                {/* Left arm */}
                <mesh position={[-0.35, 0.65, 0]} castShadow>
                    <boxGeometry args={[0.1, 0.3, 0.1]} />
                    <meshStandardMaterial color="#1a1a3a" emissive="#00aaff" emissiveIntensity={0.2} />
                </mesh>
                {/* Shoulder pads */}
                <mesh position={[0.4, 1.15, 0]} castShadow>
                    <sphereGeometry args={[0.13, 8, 8]} />
                    <meshStandardMaterial color="#1a1a3a" emissive="#6600ff" emissiveIntensity={0.5} />
                </mesh>
                <mesh position={[-0.4, 1.15, 0]} castShadow>
                    <sphereGeometry args={[0.13, 8, 8]} />
                    <meshStandardMaterial color="#1a1a3a" emissive="#6600ff" emissiveIntensity={0.5} />
                </mesh>
                {/* Player light */}
                <pointLight position={[0, 1.5, 0]} color="#00aaff" intensity={3} distance={8} />
            </group>
        </RigidBody>
    );
}
