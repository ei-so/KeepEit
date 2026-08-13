import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import {
  ActivityLogItem,
  Folder,
  IncomeItem,
  Tag,
  TaskItem,
  TaskStatus,
  VaultData,
  VaultItem,
  VaultSettings,
} from '../types/vault';
import * as store from '../lib/store';
import { getHint } from '../lib/store';
import * as passkeyLib from '../lib/passkey';

interface VaultContextType {
  isUnlocked: boolean;
  hasVault: boolean | null; // null = checking
  vaultData: VaultData | null;
  lockCountdownSeconds: number;
  passwordHint?: string;
  isPasskeySupported: boolean;
  hasPasskey: boolean;
  autosaveState: 'idle' | 'saving' | 'saved';
  setAutosaveState: (state: 'idle' | 'saving' | 'saved') => void;
  createVault: (password: string, hint?: string, displayName?: string) => Promise<{ recoveryCode: string }>;
  unlockVault: (password: string) => Promise<void>;
  unlockWithRecoveryCode: (code: string) => Promise<void>;
  unlockWithPasskey: () => Promise<void>;
  enrollPasskey: (displayName?: string) => Promise<void>;
  removePasskey: () => Promise<void>;
  lockVault: () => void;
  addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (item: VaultItem) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleFavorite: (itemId: string) => Promise<void>;
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (task: TaskItem) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  toggleTaskFavorite: (taskId: string) => Promise<void>;
  addIncome: (income: Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (income: IncomeItem) => Promise<void>;
  deleteIncome: (incomeId: string) => Promise<void>;
  toggleIncomeFavorite: (incomeId: string) => Promise<void>;
  addFolder: (
    folderName: string,
    color?: string,
    scope?: 'credentials' | 'notes' | 'tasks' | 'income' | 'all'
  ) => Promise<void>;
  updateFolder: (folder: Folder) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  toggleFavoriteFolder: (folderId: string) => Promise<void>;
  addTag: (tagName: string, color?: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<VaultSettings>) => Promise<void>;
  updateAccountProfile: (profile: Partial<{ displayName: string; avatarColor: string }>) => Promise<void>;
  regenerateRecoveryCode: (masterPassword: string) => Promise<string>;
  exportBackup: () => Promise<void>;
  importBackup: (backupEnvelopeJson: string, masterPassword: string) => Promise<void>;
  importCSVItems: (items: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<number>;
  changeMasterPassword: (newPassword: string, hint?: string) => Promise<void>;
  wipeVault: () => Promise<void>;
  recordActivity: (action: ActivityLogItem['action'], details?: string) => Promise<void>;
  refreshTimer: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [passwordHint, setPasswordHint] = useState<string | undefined>(undefined);
  const [isPasskeySupported, setIsPasskeySupported] = useState<boolean>(false);
  const [hasPasskey, setHasPasskey] = useState<boolean>(false);

  const autoLockMinutes = vaultData?.settings?.autoLockMinutes ?? 5;
  const initialSeconds = autoLockMinutes > 0 ? autoLockMinutes * 60 : 300;
  const [lockCountdownSeconds, setLockCountdownSeconds] = useState<number>(initialSeconds);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const lastActivityRef = useRef<number>(Date.now());
  const hiddenTimeRef = useRef<number | null>(null);

  // Check IndexedDB & Passkey state on init
  useEffect(() => {
    passkeyLib.isSupported().then((sup) => setIsPasskeySupported(sup));

    store.exists().then(async (exists) => {
      setHasVault(exists);
      if (exists) {
        const hint = await getHint();
        setPasswordHint(hint);
        const pkExists = await passkeyLib.hasPasskey();
        setHasPasskey(pkExists);
      }
    });
  }, []);

  const refreshPasskeyState = async () => {
    const pkExists = await passkeyLib.hasPasskey();
    setHasPasskey(pkExists);
  };

  // Idle countdown ticker
  useEffect(() => {
    if (!isUnlocked || autoLockMinutes <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const totalAllowed = autoLockMinutes * 60;
      const remaining = Math.max(0, totalAllowed - elapsed);

      setLockCountdownSeconds(remaining);

      if (remaining <= 0) {
        lockVault();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isUnlocked, autoLockMinutes]);

  // Tab visibility change auto-lock check (>60 seconds hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenTimeRef.current && isUnlocked) {
          const hiddenDuration = (Date.now() - hiddenTimeRef.current) / 1000;
          if (hiddenDuration >= 60) {
            lockVault();
          }
        }
        hiddenTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isUnlocked]);

  // Apply saved accent palette and font scale to document
  useEffect(() => {
    if (vaultData?.settings) {
      const root = document.documentElement;
      const accent = vaultData.settings.accent || 'seal';
      const fontScale = vaultData.settings.fontScale || 'M';

      if (accent === 'rust') {
        root.style.setProperty('--accent-seal', '#DC2626');
        root.style.setProperty('--accent-seal-soft', 'rgba(220, 38, 38, 0.15)');
        root.style.setProperty('--accent-fg', '#FAFAFA');
      } else if (accent === 'graphite') {
        root.style.setProperty('--accent-seal', '#71717A');
        root.style.setProperty('--accent-seal-soft', 'rgba(113, 113, 122, 0.15)');
        root.style.setProperty('--accent-fg', '#FAFAFA');
      } else if (accent === 'ink') {
        root.style.setProperty('--accent-seal', '#09090B');
        root.style.setProperty('--accent-seal-soft', '#27272A');
        root.style.setProperty('--accent-fg', '#FFFFFF');
      } else {
        // seal (STEALTH SILVER) default
        root.style.setProperty('--accent-seal', '#E4E4E7');
        root.style.setProperty('--accent-seal-soft', '#27272A');
        root.style.setProperty('--accent-fg', '#09090B');
      }

      if (fontScale === 'S') {
        root.style.fontSize = '13px';
      } else if (fontScale === 'L') {
        root.style.fontSize = '15px';
      } else {
        root.style.fontSize = '14px';
      }
    }
  }, [vaultData?.settings?.accent, vaultData?.settings?.fontScale]);

  // Reset idle timer on user activity
  useEffect(() => {
    const handleUserActivity = () => {
      if (isUnlocked) {
        lastActivityRef.current = Date.now();
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [isUnlocked]);

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    setLockCountdownSeconds(autoLockMinutes * 60);
  };

  const createVault = async (password: string, hint?: string, displayName?: string) => {
    const res = await store.create(password, hint, displayName);
    setHasVault(true);
    setVaultData(res.vault);
    setIsUnlocked(true);
    setPasswordHint(hint);
    if (displayName) {
      localStorage.setItem('keepeit_user_name', displayName.trim());
    }
    resetTimer();
    return { recoveryCode: res.recoveryCode };
  };

  const unlockVault = async (password: string) => {
    const unlockedData = await store.unlock(password);
    setVaultData(unlockedData);
    setIsUnlocked(true);
    await refreshPasskeyState();
    resetTimer();
  };

  const unlockWithRecoveryCode = async (code: string) => {
    const unlockedData = await store.unlockWithRecovery(code);
    setVaultData(unlockedData);
    setIsUnlocked(true);
    await refreshPasskeyState();
    resetTimer();
  };

  const unlockWithPasskey = async () => {
    const unlockedData = await passkeyLib.unlockPasskey();
    setVaultData(unlockedData);
    setIsUnlocked(true);
    await refreshPasskeyState();
    resetTimer();
  };

  const enrollPasskey = async (displayName?: string) => {
    await passkeyLib.enrollPasskey(displayName);
    setHasPasskey(true);
    resetTimer();
  };

  const removePasskey = async () => {
    await passkeyLib.removePasskey();
    setHasPasskey(false);
    resetTimer();
  };

  const lockVault = () => {
    store.lock();
    setVaultData(null);
    setIsUnlocked(false);
  };

  const addItem = async (itemData: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newItem = {
      ...itemData,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: now,
      updatedAt: now,
    } as VaultItem;

    const updated = await store.mutate((data) => {
      data.items = [newItem, ...data.items];
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'create',
          itemTitle: newItem.title,
          details: `Created ${newItem.category} item`,
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const updateItem = async (updatedItem: VaultItem) => {
    const now = new Date().toISOString();
    const itemToSave = { ...updatedItem, updatedAt: now };

    const updated = await store.mutate((data) => {
      data.items = data.items.map((i) => (i.id === itemToSave.id ? itemToSave : i));
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'update',
          itemTitle: itemToSave.title,
          details: `Updated ${itemToSave.category} item`,
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const deleteItem = async (itemId: string) => {
    let deletedTitle = 'Item';
    const updated = await store.mutate((data) => {
      const item = data.items.find((i) => i.id === itemId);
      if (item) deletedTitle = item.title;
      data.items = data.items.filter((i) => i.id !== itemId);
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'delete',
          itemTitle: deletedTitle,
          details: 'Deleted item',
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const toggleFavorite = async (itemId: string) => {
    const updated = await store.mutate((data) => {
      data.items = data.items.map((item) =>
        item.id === itemId
          ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() }
          : item
      );
    });
    setVaultData(updated);
    resetTimer();
  };

  const addTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTask: TaskItem = {
      ...task,
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: now,
      updatedAt: now,
      completedAt: task.status === 'completed' ? now : undefined,
    };

    const updated = await store.mutate((data) => {
      data.tasks = data.tasks || [];
      data.tasks.unshift(newTask);
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'create',
          itemTitle: newTask.title,
          details: 'Created task item',
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const updateTask = async (updatedTask: TaskItem) => {
    const now = new Date().toISOString();
    const taskToSave: TaskItem = {
      ...updatedTask,
      updatedAt: now,
      completedAt:
        updatedTask.status === 'completed'
          ? updatedTask.completedAt || now
          : undefined,
    };

    const updated = await store.mutate((data) => {
      data.tasks = (data.tasks || []).map((t) => (t.id === taskToSave.id ? taskToSave : t));
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'update',
          itemTitle: taskToSave.title,
          details: 'Updated task item',
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const deleteTask = async (taskId: string) => {
    let deletedTitle = 'Task';
    const updated = await store.mutate((data) => {
      const existing = (data.tasks || []).find((t) => t.id === taskId);
      if (existing) deletedTitle = existing.title;
      data.tasks = (data.tasks || []).filter((t) => t.id !== taskId);
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'delete',
          itemTitle: deletedTitle,
          details: 'Deleted task item',
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const toggleTaskStatus = async (taskId: string, status: TaskStatus) => {
    const now = new Date().toISOString();
    const updated = await store.mutate((data) => {
      data.tasks = (data.tasks || []).map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status,
            updatedAt: now,
            completedAt: status === 'completed' ? t.completedAt || now : undefined,
          };
        }
        return t;
      });
    });

    setVaultData(updated);
    resetTimer();
  };

  const toggleTaskFavorite = async (taskId: string) => {
    const updated = await store.mutate((data) => {
      data.tasks = (data.tasks || []).map((t) =>
        t.id === taskId ? { ...t, isFavorite: !t.isFavorite, updatedAt: new Date().toISOString() } : t
      );
    });

    setVaultData(updated);
    resetTimer();
  };

  const addIncome = async (incomeInput: Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newIncome: IncomeItem = {
      ...incomeInput,
      id: 'income-' + Date.now(),
      createdAt: now,
      updatedAt: now,
    };

    const updated = await store.mutate((data) => {
      data.income = [newIncome, ...(data.income || [])];
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: now,
          action: 'create',
          itemTitle: newIncome.source,
          details: `Added income entry: ${newIncome.currency} ${newIncome.amount}`,
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const updateIncome = async (income: IncomeItem) => {
    const now = new Date().toISOString();
    const incomeToSave = { ...income, updatedAt: now };

    const updated = await store.mutate((data) => {
      data.income = (data.income || []).map((i) => (i.id === incomeToSave.id ? incomeToSave : i));
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: now,
          action: 'update',
          itemTitle: incomeToSave.source,
          details: 'Updated income entry',
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const deleteIncome = async (incomeId: string) => {
    let deletedTitle = 'Income';
    const updated = await store.mutate((data) => {
      const existing = (data.income || []).find((i) => i.id === incomeId);
      if (existing) deletedTitle = existing.source;
      data.income = (data.income || []).filter((i) => i.id !== incomeId);
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'delete',
          itemTitle: deletedTitle,
          details: 'Deleted income entry',
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
  };

  const toggleIncomeFavorite = async (incomeId: string) => {
    const updated = await store.mutate((data) => {
      data.income = (data.income || []).map((i) =>
        i.id === incomeId ? { ...i, isFavorite: !i.isFavorite, updatedAt: new Date().toISOString() } : i
      );
    });

    setVaultData(updated);
    resetTimer();
  };

  const addFolder = async (
    folderName: string,
    color = '#71717A',
    scope: 'credentials' | 'notes' | 'tasks' | 'income' | 'all' = 'credentials'
  ) => {
    const newFolder: Folder = {
      id: 'folder-' + Date.now(),
      name: folderName.trim(),
      color,
      scope,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    const updated = await store.mutate((data) => {
      data.folders = [...data.folders, newFolder];
    });
    setVaultData(updated);
    resetTimer();
  };

  const updateFolder = async (folder: Folder) => {
    const updated = await store.mutate((data) => {
      data.folders = data.folders.map((f) => (f.id === folder.id ? folder : f));
    });
    setVaultData(updated);
    resetTimer();
  };

  const deleteFolder = async (folderId: string) => {
    const updated = await store.mutate((data) => {
      data.folders = data.folders.filter((f) => f.id !== folderId);
      data.items = data.items.map((item) =>
        item.folderId === folderId ? { ...item, folderId: undefined } : item
      );
    });
    setVaultData(updated);
    resetTimer();
  };

  const toggleFavoriteFolder = async (folderId: string) => {
    const updated = await store.mutate((data) => {
      data.folders = data.folders.map((f) =>
        f.id === folderId ? { ...f, isFavorite: !f.isFavorite } : f
      );
    });
    setVaultData(updated);
    resetTimer();
  };

  const addTag = async (tagName: string, color = '#71717A') => {
    const cleanName = tagName.trim();
    const newTag: Tag = {
      id: 'tag-' + Date.now(),
      name: cleanName,
      color,
    };

    const updated = await store.mutate((data) => {
      if (!data.tags.some((t) => t.name.toLowerCase() === cleanName.toLowerCase())) {
        data.tags = [...data.tags, newTag];
      }
    });
    setVaultData(updated);
    resetTimer();
  };

  const deleteTag = async (tagId: string) => {
    const updated = await store.mutate((data) => {
      const tag = data.tags.find((t) => t.id === tagId);
      if (tag) {
        data.tags = data.tags.filter((t) => t.id !== tagId);
        data.items = data.items.map((item) => ({
          ...item,
          tags: item.tags.filter((tName) => tName !== tag.name && tName !== tag.id),
        }));
      }
    });
    setVaultData(updated);
    resetTimer();
  };

  const updateSettings = async (newSettings: Partial<VaultSettings>) => {
    const updated = await store.mutate((data) => {
      data.settings = { ...data.settings, ...newSettings };
    });
    setVaultData(updated);
    resetTimer();
  };

  const updateAccountProfile = async (profile: Partial<{ displayName: string; avatarColor: string }>) => {
    const updated = await store.mutate((data) => {
      data.accountProfile = {
        displayName: profile.displayName ?? data.accountProfile?.displayName ?? 'Vault User',
        avatarColor: profile.avatarColor ?? data.accountProfile?.avatarColor ?? '#27272A',
      };
    });
    setVaultData(updated);
    if (profile.displayName) {
      localStorage.setItem('keepeit_user_name', profile.displayName.trim());
    }
    resetTimer();
  };

  const regenerateRecoveryCode = async (masterPassword: string): Promise<string> => {
    const code = await store.regenerateRecoveryCode(masterPassword);
    const updated = await store.mutate((data) => {
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'update',
          details: 'Regenerated vault emergency recovery code.',
        },
        ...data.activityLogs,
      ];
    });
    setVaultData(updated);
    resetTimer();
    return code;
  };

  const exportBackup = async () => {
    const now = new Date().toISOString();
    const updated = await store.mutate((data) => {
      data.lastBackupAt = now;
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: now,
          action: 'export',
          details: 'Exported zero-knowledge encrypted vault envelope (.keepeit file).',
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);

    const rawEnvelope = await store.getRawEnvelope();
    if (!rawEnvelope) {
      throw new Error('Unable to read raw envelope for backup.');
    }

    const blob = new Blob([JSON.stringify(rawEnvelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keepeit-backup-${now.slice(0, 10)}.keepeit`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importBackup = async (backupEnvelopeJson: string, masterPassword: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(backupEnvelopeJson);
    } catch {
      throw new Error('Invalid backup file JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.salt || !parsed.ciphertext) {
      throw new Error('Invalid .keepeit envelope structure.');
    }

    const restoredData = await store.replaceEnvelopeWithBackup(parsed, masterPassword);
    setVaultData(restoredData);
    if (parsed.hint) {
      setPasswordHint(parsed.hint);
    }
    resetTimer();
  };

  const importCSVItems = async (
    itemsToImport: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<number> => {
    if (itemsToImport.length === 0) return 0;

    const now = new Date().toISOString();
    let count = 0;

    const updated = await store.mutate((data) => {
      const newItems: VaultItem[] = itemsToImport.map((item, index) => {
        count++;
        return {
          ...item,
          id: 'item-' + (Date.now() + index),
          createdAt: now,
          updatedAt: now,
        } as VaultItem;
      });

      data.items = [...data.items, ...newItems];
      data.activityLogs = [
        {
          id: 'log-' + Date.now(),
          timestamp: now,
          action: 'import',
          details: `Imported ${count} item(s) from CSV spreadsheet.`,
        },
        ...data.activityLogs,
      ];
    });

    setVaultData(updated);
    resetTimer();
    return count;
  };

  const changeMasterPassword = async (newPassword: string, hint?: string) => {
    const updatedData = await store.reEncryptWithNewPassword(newPassword, hint);
    setPasswordHint(hint);
    setVaultData(updatedData);
    resetTimer();
  };

  const wipeVault = async () => {
    await store.destroy();
    setHasVault(false);
    setVaultData(null);
    setIsUnlocked(false);
  };

  const recordActivity = async (action: ActivityLogItem['action'], details?: string) => {
    if (isUnlocked) {
      const updated = await store.mutate((data) => {
        data.activityLogs = [
          {
            id: 'log-' + Date.now(),
            timestamp: new Date().toISOString(),
            action,
            details,
          },
          ...data.activityLogs,
        ];
      });
      setVaultData(updated);
    }
  };

  return (
    <VaultContext.Provider
      value={{
        isUnlocked,
        hasVault,
        vaultData,
        lockCountdownSeconds,
        passwordHint,
        isPasskeySupported,
        hasPasskey,
        autosaveState,
        setAutosaveState,
        createVault,
        unlockVault,
        unlockWithRecoveryCode,
        unlockWithPasskey,
        enrollPasskey,
        removePasskey,
        lockVault,
        addItem,
        updateItem,
        deleteItem,
        toggleFavorite,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        toggleTaskFavorite,
        addIncome,
        updateIncome,
        deleteIncome,
        toggleIncomeFavorite,
        addFolder,
        updateFolder,
        deleteFolder,
        toggleFavoriteFolder,
        addTag,
        deleteTag,
        updateSettings,
        updateAccountProfile,
        regenerateRecoveryCode,
        exportBackup,
        importBackup,
        importCSVItems,
        changeMasterPassword,
        wipeVault,
        recordActivity,
        refreshTimer: resetTimer,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
