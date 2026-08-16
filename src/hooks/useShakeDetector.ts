import { useEffect, useRef } from 'react';

/**
 * Reusable React hook for cross-platform shake detection using DeviceMotionEvent
 * @param onShake Callback executed when a shake gesture exceeds the threshold
 * @param enabled Whether motion listening is currently active
 * @param threshold Sensitivity threshold across delta X/Y/Z (default: 22)
 */
export function useShakeDetector(
  onShake: () => void,
  enabled: boolean,
  threshold: number = 22
) {
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const lastCoordsRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastShakeTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      lastCoordsRef.current = null;
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;

      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;

      if (lastCoordsRef.current !== null) {
        const deltaX = Math.abs(x - lastCoordsRef.current.x);
        const deltaY = Math.abs(y - lastCoordsRef.current.y);
        const deltaZ = Math.abs(z - lastCoordsRef.current.z);
        const change = deltaX + deltaY + deltaZ;

        const now = Date.now();
        // Trigger shake if threshold is met and cooldown (1500ms) has elapsed
        if (change > threshold && now - lastShakeTimeRef.current > 1500) {
          lastShakeTimeRef.current = now;
          onShakeRef.current();
        }
      }

      lastCoordsRef.current = { x, y, z };
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      lastCoordsRef.current = null;
    };
  }, [enabled, threshold]);
}
