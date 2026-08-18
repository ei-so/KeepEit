/**
 * Cross-platform helper to request sensor/motion permissions
 * Supports iOS 13+ DeviceMotionEvent.requestPermission and standard browsers
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as any).requestPermission === 'function'
  ) {
    try {
      const permissionState = await (DeviceMotionEvent as any).requestPermission();
      return permissionState === 'granted';
    } catch (err) {
      console.warn('Motion permission request failed:', err);
      return false;
    }
  }
  return true;
}
