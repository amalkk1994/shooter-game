import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import useGameStore from '../store/gameStore';

const MOVE_SPEED = 8;
const MOUSE_SENSITIVITY = 0.003;
const MODEL_PATH = '/models/Xbot.glb';
const keys = {};

// Preload the model
useGLTF.preload(MODEL_PATH);

export default function Player({ onShoot }) {
    const rigidBodyRef = useRef();
    const meshRef = useRef();
    const rotationRef = useRef(0);
    const pitchRef = useRef(0);
    const isLockedRef = useRef(false);
    const isMovingRef = useRef(false);
    const { gl } = useThree();

    const gameState = useGameStore((s) => s.gameState);
    const shoot = useGameStore((s) => s.shoot);
    const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
    const setPlayerRotation = useGameStore((s) => s.setPlayerRotation);
    const setPlayerPitch = useGameStore((s) => s.setPlayerPitch);

    // Load model and clone it for the player
    const { scene, animations } = useGLTF(MODEL_PATH);
    const clonedScene = useMemo(() => {
        const clone = cloneSkeleton(scene);
        clone.traverse((child) => {
            if (child.isMesh || child.isSkinnedMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // Give the player a distinct blue tint
                if (child.material) {
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color('#0044ff');
                    child.material.emissiveIntensity = 0.3;
                }
            }
        });
        clone.scale.set(1, 1, 1);
        return clone;
    }, [scene]);

    const { actions, mixer } = useAnimations(animations, clonedScene);

    // Start idle animation
    useEffect(() => {
        const actionNames = Object.keys(actions);
        // Find idle-like animation (usually first or named 'idle')
        const idleAction = actions['idle'] || actions[actionNames[0]];
        if (idleAction) {
            idleAction.reset().fadeIn(0.2).play();
        }
        return () => {
            Object.values(actions).forEach((a) => a?.stop());
        };
    }, [actions]);

    // Handle animation transitions based on movement
    const currentActionRef = useRef(null);
    const switchAnimation = (name) => {
        const actionNames = Object.keys(actions);
        const targetName = actionNames.find((n) => n.toLowerCase().includes(name.toLowerCase()));
        if (!targetName || currentActionRef.current === targetName) return;

        const current = currentActionRef.current ? actions[currentActionRef.current] : null;
        const next = actions[targetName];
        if (!next) return;

        if (current) {
            current.fadeOut(0.2);
        }
        next.reset().fadeIn(0.2).play();
        currentActionRef.current = targetName;
    };

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
            rotationRef.current -= e.movementX * MOUSE_SENSITIVITY;
            pitchRef.current = Math.max(
                -Math.PI / 3,
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

    useFrame((_, delta) => {
        if (!rigidBodyRef.current || gameState !== 'playing') return;

        // Update animation mixer
        mixer?.update(delta);

        const yaw = rotationRef.current;

        let inputX = 0;
        let inputZ = 0;
        if (keys['KeyW'] || keys['ArrowUp']) inputZ = -1;
        if (keys['KeyS'] || keys['ArrowDown']) inputZ = 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inputX = -1;
        if (keys['KeyD'] || keys['ArrowRight']) inputX = 1;

        const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (len > 0) {
            inputX /= len;
            inputZ /= len;
        }

        const isMoving = len > 0;

        // Switch animations
        if (isMoving && !isMovingRef.current) {
            switchAnimation('run');
        } else if (!isMoving && isMovingRef.current) {
            switchAnimation('idle');
        }
        isMovingRef.current = isMoving;

        // Rotate input by yaw
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
            <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} />
            <group ref={meshRef}>
                {/* Animated character model */}
                <primitive object={clonedScene} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />

                {/* Gun held at right hand level */}
                <group position={[0.3, 0.7, -0.4]}>
                    {/* Gun body */}
                    <mesh position={[0, 0, -0.35]} castShadow>
                        <boxGeometry args={[0.08, 0.1, 0.5]} />
                        <meshStandardMaterial
                            color="#2a2a4a"
                            emissive="#ff4400"
                            emissiveIntensity={0.5}
                            metalness={0.9}
                            roughness={0.1}
                        />
                    </mesh>
                    {/* Muzzle */}
                    <mesh position={[0, 0, -0.65]}>
                        <sphereGeometry args={[0.04, 8, 8]} />
                        <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={3} />
                    </mesh>
                    {/* Laser sight */}
                    <mesh position={[0, 0, -4]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.004, 0.004, 6, 4]} />
                        <meshStandardMaterial
                            color="#ff0000"
                            emissive="#ff0000"
                            emissiveIntensity={5}
                            transparent
                            opacity={0.35}
                        />
                    </mesh>
                </group>

                {/* Player glow */}
                <pointLight position={[0, 1.2, 0]} color="#00aaff" intensity={3} distance={8} />
            </group>
        </RigidBody>
    );
}
