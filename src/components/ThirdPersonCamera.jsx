import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';

// Camera distance from player
const CAM_DISTANCE = 7;
const CAM_HEIGHT_BASE = 3;  // base height above player
const LERP_SPEED = 10;
const LOOK_AHEAD = 2;  // how far ahead of the player the camera looks

export default function ThirdPersonCamera() {
    const currentPosition = useRef(new THREE.Vector3(0, 5, 7));
    const currentLookAt = useRef(new THREE.Vector3(0, 1.5, 0));

    const gameState = useGameStore((s) => s.gameState);

    useFrame((state, delta) => {
        if (gameState !== 'playing') return;

        const playerPos = useGameStore.getState().playerPosition;
        const yaw = useGameStore.getState().playerRotation;
        const pitch = useGameStore.getState().playerPitch;

        // Calculate camera position using spherical coordinates around the player
        // pitch < 0 means looking up, pitch > 0 means looking down
        // Camera should go higher when looking down, lower when looking up
        const verticalAngle = Math.PI / 6 - pitch * 0.8; // Base angle + pitch influence
        const horizontalDist = CAM_DISTANCE * Math.cos(verticalAngle);
        const verticalDist = CAM_DISTANCE * Math.sin(verticalAngle) + CAM_HEIGHT_BASE;

        // Camera position: behind the player based on yaw, above based on pitch
        const targetX = playerPos[0] + Math.sin(yaw) * horizontalDist;
        const targetY = playerPos[1] + verticalDist;
        const targetZ = playerPos[2] + Math.cos(yaw) * horizontalDist;

        // Smooth camera position
        const clampedDelta = Math.min(delta, 0.05); // prevent huge jumps
        currentPosition.current.lerp(
            new THREE.Vector3(targetX, targetY, targetZ),
            LERP_SPEED * clampedDelta
        );

        // Look-at target: slightly ahead of and above the player
        const lookAtY = playerPos[1] + 1.2 - pitch * 2; // look higher/lower with pitch
        const lookAheadX = playerPos[0] - Math.sin(yaw) * LOOK_AHEAD;
        const lookAheadZ = playerPos[2] - Math.cos(yaw) * LOOK_AHEAD;

        currentLookAt.current.lerp(
            new THREE.Vector3(lookAheadX, lookAtY, lookAheadZ),
            LERP_SPEED * clampedDelta
        );

        state.camera.position.copy(currentPosition.current);
        state.camera.lookAt(currentLookAt.current);
    });

    return null;
}
