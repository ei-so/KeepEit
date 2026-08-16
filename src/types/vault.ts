export type VaultCategory = 'note' | 'credential' | 'card' | 'snippet' | 'file';

export interface Folder {
  id: string;
  name: string;
  color?: string;
  scope?: 'credentials' | 'notes' | 'tasks' | 'income' | 'all';
  isFavorite?: boolean;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface BaseVaultItem {
  id: string;
  title: string;
  category: VaultCategory;
  folderId?: string;
  tags: string[]; // tag names or IDs
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface NoteItem extends BaseVaultItem {
  category: 'note';
  content: string;
  format?: 'markdown' | 'plain';
}

export interface CredentialItem extends BaseVaultItem {
  category: 'credential';
  username: string;
  password: string;
  url?: string;
  totpSecret?: string;
  customFields?: { label: string; value: string; isSecret?: boolean }[];
}

export interface CardItem extends BaseVaultItem {
  category: 'card';
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardType?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  pin?: string;
}

export interface SnippetItem extends BaseVaultItem {
  category: 'snippet';
  code: string;
  language: string;
}

export interface FileItem extends BaseVaultItem {
  category: 'file';
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  dataUrl: string; // base64 encoded data
}

export type VaultItem = NoteItem | CredentialItem | CardItem | SnippetItem | FileItem;

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'export' | 'import' | 'unlock' | 'lock' | 'password_change' | 'security';
  itemTitle?: string;
  category?: VaultCategory;
  details?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  completedAt?: string;
  folderId?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeItem {
  id: string;
  source: string;
  amount: number;
  currency: string; // e.g. PHP
  category: string; // Salary, Freelance, Investments, Client Work, Other
  date: string; // YYYY-MM-DD
  notes?: string;
  remarks?: string;
  folderId?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountProfile {
  displayName: string;
  avatarColor: string;
}

export interface VaultSettings {
  autoLockMinutes: number; // e.g. 5
  theme: 'light' | 'dark' | 'system';
  accent?: 'seal' | 'rust' | 'graphite' | 'ink';
  fontScale?: 'S' | 'M' | 'L';
  showPasswordHint: boolean;
  clearClipboardSeconds: number; // e.g. 30
  panicShakeEnabled?: boolean;
}

export interface VaultData {
  version: '1.0.0';
  developer: 'Kurt Ross Gonzaga';
  accountProfile?: AccountProfile;
  items: VaultItem[];
  tasks?: TaskItem[];
  income?: IncomeItem[];
  folders: Folder[];
  tags: Tag[];
  activityLogs: ActivityLogItem[];
  settings: VaultSettings;
  lastBackupAt?: string;
}

export interface VaultWrapperPassword {
  iv: string;         // base64, 12 bytes IV
  wrappedDek: string; // base64, AES-GCM(KEK_pw, DEK)
}

export interface VaultWrapperRecovery {
  iv: string;         // base64, 12 bytes IV
  wrappedDek: string; // base64, AES-GCM(KEK_rec, DEK)
  salt: string;       // base64, 16 bytes salt
}

export interface VaultWrapperPasskey {
  iv: string;
  wrappedDek: string;
  credentialId: string;
  prfSalt: string;
}

export interface VaultEnvelopeV3 {
  version: 3;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64, 16 bytes
  wrappers: {
    password: VaultWrapperPassword;
    recovery?: VaultWrapperRecovery;
    passkey?: VaultWrapperPasskey;
  };
  iv: string;         // base64, 12 bytes IV for main ciphertext
  ciphertext: string; // AES-GCM(DEK, JSON.stringify(VaultData))
  createdAt: string;
  updatedAt: string;
  hint?: string;
}

export interface VaultEnvelopeLegacy {
  version?: '1.0.0' | 1 | 2;
  salt: string;
  iv: string;
  ciphertext: string;
  recoverySalt?: string;
  recoveryIv?: string;
  recoveryCiphertext?: string;
  createdAt: string;
  updatedAt: string;
  hint?: string;
}

export type VaultEnvelope = VaultEnvelopeV3 | VaultEnvelopeLegacy;
export type EncryptedEnvelope = VaultEnvelope;

