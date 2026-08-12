export interface StorageEstimateResult {
  persisted: boolean;
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
}

let cachedPersistedStatus: boolean | null = null;

/**
 * Call navigator.storage.persist() if available and cache result
 */
export async function checkAndRequestPersistedStorage(): Promise<boolean> {
  if (cachedPersistedStatus !== null) {
    return cachedPersistedStatus;
  }

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        cachedPersistedStatus = granted;
        return granted;
      } else {
        cachedPersistedStatus = true;
        return true;
      }
    } catch (err) {
      console.warn('Storage persistence request failed:', err);
      cachedPersistedStatus = false;
      return false;
    }
  }

  cachedPersistedStatus = false;
  return false;
}

/**
 * Query navigator.storage.estimate() and persistence status
 */
export async function getStorageEstimateInfo(): Promise<StorageEstimateResult> {
  let persisted = false;
  let usageMB = 0;
  let quotaMB = 0;
  let percentUsed = 0;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
        cachedPersistedStatus = persisted;
      }

      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1;

        usageMB = Number((usageBytes / (1024 * 1024)).toFixed(2));
        quotaMB = Number((quotaBytes / (1024 * 1024)).toFixed(1));
        percentUsed = Number(((usageBytes / quotaBytes) * 100).toFixed(1));
      }
    } catch (err) {
      console.warn('Failed to estimate storage:', err);
    }
  }

  return {
    persisted,
    usageMB,
    quotaMB,
    percentUsed,
  };
}

/**
 * Helper to calculate backup age in days
 */
export function getBackupAgeInDays(lastBackupAt?: string): { days: number; isOver14Days: boolean } {
  if (!lastBackupAt) {
    return { days: 999, isOver14Days: true };
  }

  const backupTime = new Date(lastBackupAt).getTime();
  const nowTime = new Date().getTime();
  const diffMs = nowTime - backupTime;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    days: Math.max(0, days),
    isOver14Days: days >= 14,
  };
}
