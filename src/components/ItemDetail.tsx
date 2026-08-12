import React, { useState } from 'react';
import { VaultItem } from '../types/vault';
import { useVault } from '../hooks/useVault';
import {
  FileText,
  Key,
  CreditCard,
  Code,
  File,
  Star,
  Edit,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Folder as FolderIcon,
  Tag as TagIcon,
  Calendar,
  Clock,
  ShieldAlert,
  Download,
} from 'lucide-react';

interface ItemDetailProps {
  item: VaultItem | null;
  onEditItem: (item: VaultItem) => void;
  onDeleteItem: (itemId: string) => void;
  onCloseMobileDetail?: () => void;
}

export const ItemDetail: React.FC<ItemDetailProps> = ({
  item,
  onEditItem,
  onDeleteItem,
  onCloseMobileDetail,
}) => {
  const { vaultData, toggleFavorite } = useVault();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!item || !vaultData) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)] bg-[var(--bg-main)] select-none">
        <div className="w-12 h-12 rounded-keepeit bg-[var(--bg-surface)] border-keepeit flex items-center justify-center mb-3">
          <Key className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
        <h3 className="font-display font-semibold text-base text-[var(--text-primary)]">
          No Item Selected
        </h3>
        <p className="text-xs max-w-xs mt-1 leading-relaxed">
          Select an item from the list to view encrypted details, copy credentials, or edit vault records.
        </p>
      </div>
    );
  }

  const folder = vaultData.folders.find((f) => f.id === item.folderId);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'note':
        return <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'credential':
        return <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'card':
        return <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'snippet':
        return <Code className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'file':
        return <File className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      default:
        return <FileText className="w-5 h-5 text-[var(--accent-seal)]" />;
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-card)] overflow-y-auto">
      {/* Top Header & Actions */}
      <div className="p-4 sm:p-6 border-b border-keepeit flex items-start justify-between gap-4 bg-[var(--bg-surface)]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 rounded-keepeit bg-[var(--bg-card)] border-keepeit shrink-0">
            {getCategoryIcon(item.category)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono-label text-[10px] px-2 py-0.5 rounded-keepeit bg-[var(--bg-card)] border-keepeit text-[var(--text-muted)] uppercase">
                {item.category}
              </span>

              {folder && (
                <span
                  className="font-mono-label text-[10px] px-2 py-0.5 rounded-keepeit font-semibold text-white"
                  style={{ backgroundColor: folder.color || 'var(--accent-seal)' }}
                >
                  {folder.name}
                </span>
              )}

              {item.tags?.map((tagName) => (
                <span
                  key={tagName}
                  className="font-mono-label text-[10px] px-1.5 py-0.5 rounded-keepeit bg-[var(--bg-card)] border-keepeit text-[var(--text-muted)]"
                >
                  #{tagName}
                </span>
              ))}
            </div>

            <h2 className="text-xl font-display font-bold text-[var(--text-primary)] truncate">
              {item.title}
            </h2>

            <div className="flex items-center gap-3 text-[11px] font-mono-label text-[var(--text-muted)] mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Updated {new Date(item.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => toggleFavorite(item.id)}
            title={item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            className={`p-2 rounded-keepeit border-keepeit transition-colors focus-visible:ring-2 ${
              item.isFavorite
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
          </button>

          <button
            onClick={() => onEditItem(item)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-card)] border-keepeit hover:bg-[var(--bg-surface-hover)] rounded-keepeit font-mono-label text-xs text-[var(--text-primary)] transition-colors focus-visible:ring-2"
          >
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EDIT</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-[var(--accent-rust)] hover:bg-[var(--accent-rust)]/10 rounded-keepeit border-keepeit transition-colors focus-visible:ring-2"
            title="Delete Vault Record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Viewer according to category */}
      <div className="p-4 sm:p-6 space-y-6 flex-1">
        {/* CATEGORY 1: CREDENTIAL */}
        {item.category === 'credential' && (
          <div className="space-y-4">
            {/* Username / Login */}
            <div className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-1">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                USERNAME / EMAIL / ACCOUNT
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-[var(--text-primary)] select-all font-medium">
                  {item.username || '—'}
                </span>
                {item.username && (
                  <button
                    onClick={() => handleCopy(item.username, 'username')}
                    className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-card)] border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                  >
                    {copiedField === 'username' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'username' ? 'COPIED' : 'COPY'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-1">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                PASSWORD
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-[var(--text-primary)] font-medium">
                  {showSecrets['password'] ? item.password : '••••••••••••••••'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleSecretVisibility('password')}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit"
                  >
                    {showSecrets['password'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleCopy(item.password, 'password')}
                    className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-card)] border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                  >
                    {copiedField === 'password' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'password' ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* URL */}
            {item.url && (
              <div className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-1">
                <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                  WEBSITE / SERVICE URL
                </span>
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[var(--accent-seal)] hover:underline flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{item.url}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                  <button
                    onClick={() => handleCopy(item.url!, 'url')}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {item.customFields && item.customFields.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                  CUSTOM CREDENTIAL FIELDS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.customFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                          {field.label}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-primary)]">
                          {field.isSecret
                            ? showSecrets[`field-${idx}`]
                              ? field.value
                              : '••••••••'
                            : field.value}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {field.isSecret && (
                          <button
                            onClick={() => toggleSecretVisibility(`field-${idx}`)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showSecrets[`field-${idx}`] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(field.value, `field-${idx}`)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CATEGORY 2: SECURE NOTE */}
        {item.category === 'note' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)]">
                NOTE CONTENT ({item.format || 'markdown'})
              </span>
              <button
                onClick={() => handleCopy(item.content, 'note')}
                className="flex items-center gap-1 text-xs font-mono-label text-[var(--accent-seal)] hover:underline"
              >
                {copiedField === 'note' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedField === 'note' ? 'COPIED NOTE' : 'COPY CONTENT'}</span>
              </button>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-primary)] font-mono selection:bg-[var(--accent-seal-soft)]">
              {item.content || <span className="italic text-[var(--text-muted)]">Empty note.</span>}
            </div>
          </div>
        )}

        {/* CATEGORY 3: PAYMENT CARD */}
        {item.category === 'card' && (
          <div className="space-y-4">
            {/* Stylized Visual Card */}
            <div className="p-6 rounded-keepeit bg-gradient-to-br from-[#121A16] to-[#2F6F52] text-white space-y-4 shadow-md font-mono relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-widest text-[#CBDCD0]">PAYMENT CARD</span>
                <span className="font-bold text-sm uppercase">{item.cardType || 'VISA'}</span>
              </div>
              <div className="text-xl tracking-widest font-semibold py-2">
                {showSecrets['cardNum'] ? item.cardNumber : `•••• •••• •••• ${item.cardNumber.slice(-4) || '••••'}`}
              </div>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#CBDCD0] block">CARDHOLDER</span>
                  <span className="uppercase font-semibold">{item.cardholderName || 'VALUED HOLDER'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#CBDCD0] block">EXPIRES</span>
                  <span>{item.expiryMonth}/{item.expiryYear}</span>
                </div>
              </div>
            </div>

            {/* Card Numbers & CVV Detail */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit">
                <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                  CARD NUMBER
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-xs text-[var(--text-primary)]">
                    {showSecrets['cardNum'] ? item.cardNumber : '•••• ' + item.cardNumber.slice(-4)}
                  </span>
                  <button
                    onClick={() => handleCopy(item.cardNumber, 'cardNum')}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit">
                <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                  SECURITY CVV
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-xs text-[var(--text-primary)]">
                    {showSecrets['cvv'] ? item.cvv : '•••'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSecretVisibility('cvv')}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showSecrets['cvv'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleCopy(item.cvv, 'cvv')}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {item.pin && (
                <div className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit">
                  <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
                    CARD PIN
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs text-[var(--text-primary)]">
                      {showSecrets['pin'] ? item.pin : '••••'}
                    </span>
                    <button
                      onClick={() => toggleSecretVisibility('pin')}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showSecrets['pin'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY 4: CODE SNIPPET */}
        {item.category === 'snippet' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)]">
                LANGUAGE: {item.language?.toUpperCase() || 'TEXT'}
              </span>
              <button
                onClick={() => handleCopy(item.code, 'code')}
                className="flex items-center gap-1 text-xs font-mono-label text-[var(--accent-seal)] hover:underline"
              >
                {copiedField === 'code' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedField === 'code' ? 'COPIED CODE' : 'COPY CODE'}</span>
              </button>
            </div>
            <pre className="p-4 bg-[#121A16] text-[#E9EBE4] border-keepeit rounded-keepeit text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{item.code}</code>
            </pre>
          </div>
        )}

        {/* CATEGORY 5: FILE / DOCUMENT */}
        {item.category === 'file' && (
          <div className="space-y-4">
            <div className="p-4 bg-[var(--bg-surface)] border-keepeit rounded-keepeit flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <File className="w-8 h-8 text-[var(--accent-seal)]" />
                <div>
                  <span className="font-mono text-sm font-semibold text-[var(--text-primary)] block">
                    {item.fileName}
                  </span>
                  <span className="text-[11px] font-mono-label text-[var(--text-muted)]">
                    {item.fileType} • {(item.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              {item.dataUrl && (
                <a
                  href={item.dataUrl}
                  download={item.fileName}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-seal)] text-white font-mono-label text-xs font-semibold rounded-keepeit hover:opacity-90"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD</span>
                </a>
              )}
            </div>

            {/* Image Preview if image */}
            {item.fileType?.startsWith('image/') && item.dataUrl && (
              <div className="border-keepeit rounded-keepeit p-2 bg-[var(--bg-surface)]">
                <img
                  src={item.dataUrl}
                  alt={item.fileName}
                  className="max-h-96 w-auto rounded-keepeit mx-auto object-contain"
                />
              </div>
            )}
          </div>
        )}

        {/* Optional Notes Attachment */}
        {item.notes && (
          <div className="pt-4 border-t border-keepeit space-y-1">
            <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
              ITEM NOTES & REMINDERS
            </span>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {item.notes}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-[var(--accent-rust)] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Delete Vault Item?
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-[var(--text-primary)]">'{item.title}'</strong>? This change will be encrypted and saved immediately.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-mono-label border-keepeit rounded-keepeit hover:bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  onDeleteItem(item.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-mono-label bg-[var(--accent-rust)] text-white rounded-keepeit hover:opacity-90 font-semibold"
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
