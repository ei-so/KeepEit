import { useEffect, useRef } from 'react';
import { requestMotionPermission } from '../lib/deviceSensors';

// Calibrated Sensitivity & Multi-Shake Validation Constants
export const THRESHOLD = 9.0;
export const REQUIRED_SHAKES = 2;
export const SHAKE_TIMEOUT = 500;
export const COOLDOWN = 1000;

export interface ShakeDetectorOptions {
  onPanic?: () => void;
  onShake?: () => void;
  enabled: boolean;
  threshold?: number;
  requiredShakes?: number;
  shakeTimeout?: number;
  cooldownMs?: number;
}

export function useShakeDetector({
  onPanic,
  onShake,
  enabled,
  threshold = THRESHOLD,
  requiredShakes = REQUIRED_SHAKES,
  shakeTimeout = SHAKE_TIMEOUT,
  cooldownMs = COOLDOWN,
}: ShakeDetectorOptions) {
  const onPanicCallbackRef = useRef(onPanic || onShake);
  const enabledRef = useRef(enabled);
  const lastCoordsRef = useRef<{ x: number | null; y: number | null; z: number | null }>({
    x: null,
    y: null,
    z: null,
  });

  const shakeCountRef = useRef<number>(0);
  const lastShakeTimeRef = useRef<number>(0);
  const lastTriggerTimeRef = useRef<number>(0);

  // Keep callback and enabled refs synchronized
  useEffect(() => {
    onPanicCallbackRef.current = onPanic || onShake;
    enabledRef.current = enabled;
  }, [onPanic, onShake, enabled]);

  useEffect(() => {
    if (!enabled) {
      // Reset coordinates and shake counters when disabled
      lastCoordsRef.current = { x: null, y: null, z: null };
      shakeCountRef.current = 0;
      lastShakeTimeRef.current = 0;
      return;
    }

    // Set initial cooldown anchor when enabled/unlocked to avoid accidental trigger
    lastTriggerTimeRef.current = Date.now();
    shakeCountRef.current = 0;
    lastShakeTimeRef.current = 0;
    lastCoordsRef.current = { x: null, y: null, z: null };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!enabledRef.current) return;

      const current = event.accelerationIncludingGravity || event.acceleration;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const { x, y, z } = current;
      const { x: lastX, y: lastY, z: lastZ } = lastCoordsRef.current;
      const now = Date.now();

      if (lastX !== null && lastY !== null && lastZ !== null) {
        // Multi-axis acceleration delta calculation
        const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);

        // Ignore events if within cooldown period
        if (now - lastTriggerTimeRef.current >= cooldownMs) {
          if (delta > threshold) {
            // Check sliding window timeout
            if (now - lastShakeTimeRef.current > shakeTimeout) {
              shakeCountRef.current = 1;
            } else {
              shakeCountRef.current += 1;
            }
            lastShakeTimeRef.current = now;

            // Trigger panic callback when required directional peaks are reached
            if (shakeCountRef.current >= requiredShakes) {
              lastTriggerTimeRef.current = now;
              shakeCountRef.current = 0;
              lastShakeTimeRef.current = 0;
              lastCoordsRef.current = { x: null, y: null, z: null };

              if (onPanicCallbackRef.current) {
                onPanicCallbackRef.current();
              }
            }
          }
        }
      }

      lastCoordsRef.current = { x, y, z };
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, threshold, requiredShakes, shakeTimeout, cooldownMs]);

  return {
    requestPermission: requestMotionPermission,
  };
}

