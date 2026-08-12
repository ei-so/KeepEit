import React, { useState, useEffect } from 'react';
import { VaultItem, VaultCategory, NoteItem, CredentialItem, CardItem, SnippetItem, FileItem } from '../types/vault';
import { useVault } from '../hooks/useVault';
import { generateSecurePassword, evaluatePasswordStrength } from '../services/crypto';
import {
  X,
  FileText,
  Key,
  CreditCard,
  Code,
  File,
  Plus,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Upload,
  Sparkles,
} from 'lucide-react';

interface ItemEditorModalProps {
  isOpen: boolean;
  itemToEdit: VaultItem | null;
  defaultCategory?: VaultCategory;
  onClose: () => void;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  isOpen,
  itemToEdit,
  defaultCategory = 'note',
  onClose,
}) => {
  const { vaultData, addItem, updateItem, addTag } = useVault();

  const [category, setCategory] = useState<VaultCategory>(defaultCategory);
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Note fields
  const [noteContent, setNoteContent] = useState('');
  const [noteFormat, setNoteFormat] = useState<'markdown' | 'plain'>('markdown');

  // Credential fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [customFields, setCustomFields] = useState<{ label: string; value: string; isSecret?: boolean }[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Card fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('01');
  const [expiryYear, setExpiryYear] = useState('2028');
  const [cvv, setCvv] = useState('');
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'amex' | 'discover' | 'other'>('visa');
  const [pin, setPin] = useState('');

  // Snippet fields
  const [snippetCode, setSnippetCode] = useState('');
  const [snippetLang, setSnippetLang] = useState('typescript');

  // File fields
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileDataUrl, setFileDataUrl] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setCategory(itemToEdit.category);
      setTitle(itemToEdit.title);
      setFolderId(itemToEdit.folderId || '');
      setSelectedTags(itemToEdit.tags || []);
      setNotes(itemToEdit.notes || '');
      setIsFavorite(itemToEdit.isFavorite || false);

      if (itemToEdit.category === 'note') {
        setNoteContent(itemToEdit.content);
        setNoteFormat(itemToEdit.format || 'markdown');
      } else if (itemToEdit.category === 'credential') {
        setUsername(itemToEdit.username);
        setPassword(itemToEdit.password);
        setUrl(itemToEdit.url || '');
        setCustomFields(itemToEdit.customFields || []);
      } else if (itemToEdit.category === 'card') {
        setCardholderName(itemToEdit.cardholderName);
        setCardNumber(itemToEdit.cardNumber);
        setExpiryMonth(itemToEdit.expiryMonth);
        setExpiryYear(itemToEdit.expiryYear);
        setCvv(itemToEdit.cvv);
        setCardType(itemToEdit.cardType || 'visa');
        setPin(itemToEdit.pin || '');
      } else if (itemToEdit.category === 'snippet') {
        setSnippetCode(itemToEdit.code);
        setSnippetLang(itemToEdit.language || 'typescript');
      } else if (itemToEdit.category === 'file') {
        setFileName(itemToEdit.fileName);
        setFileType(itemToEdit.fileType);
        setFileSize(itemToEdit.fileSize);
        setFileDataUrl(itemToEdit.dataUrl);
      }
    } else {
      // Reset form for fresh item
      setCategory(defaultCategory);
      setTitle('');
      setFolderId('');
      setSelectedTags([]);
      setNewTagInput('');
      setNotes('');
      setIsFavorite(false);
      setNoteContent('');
      setNoteFormat('markdown');
      setUsername('');
      setPassword('');
      setUrl('');
      setCustomFields([]);
      setCardholderName('');
      setCardNumber('');
      setExpiryMonth('01');
      setExpiryYear('2028');
      setCvv('');
      setCardType('visa');
      setPin('');
      setSnippetCode('');
      setSnippetLang('typescript');
      setFileName('');
      setFileType('');
      setFileSize(0);
      setFileDataUrl('');
      setErrorMessage(null);
    }
  }, [itemToEdit, isOpen, defaultCategory]);

  if (!isOpen || !vaultData) return null;

  const handleGeneratePassword = () => {
    const gen = generateSecurePassword({
      length: 18,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    setPassword(gen);
    setShowPassword(true);
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tagClean = newTagInput.trim();
    if (!selectedTags.includes(tagClean)) {
      setSelectedTags([...selectedTags, tagClean]);
      addTag(tagClean);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size limit is 5MB for IndexedDB encrypted envelope stability.');
      return;
    }

    setFileName(file.name);
    setFileType(file.type || 'application/octet-stream');
    setFileSize(file.size);
    if (!title) setTitle(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Title is required for vault items.');
      return;
    }

    try {
      const basePayload = {
        title: title.trim(),
        category,
        folderId: folderId || undefined,
        tags: selectedTags,
        isFavorite,
        notes: notes.trim() || undefined,
      };

      if (category === 'note') {
        const payload: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> = {
          ...basePayload,
          category: 'note',
          content: noteContent,
          format: noteFormat,
        };
        if (itemToEdit) await updateItem({ ...payload, id: itemToEdit.id, createdAt: itemToEdit.createdAt, updatedAt: itemToEdit.updatedAt });
        else await addItem(payload);
      } else if (category === 'credential') {
        const payload: Omit<CredentialItem, 'id' | 'createdAt' | 'updatedAt'> = {
          ...basePayload,
          category: 'credential',
          username,
          password,
          url: url.trim() || undefined,
          customFields,
        };
        if (itemToEdit) await updateItem({ ...payload, id: itemToEdit.id, createdAt: itemToEdit.createdAt, updatedAt: itemToEdit.updatedAt });
        else await addItem(payload);
      } else if (category === 'card') {
        const payload: Omit<CardItem, 'id' | 'createdAt' | 'updatedAt'> = {
          ...basePayload,
          category: 'card',
          cardholderName,
          cardNumber,
          expiryMonth,
          expiryYear,
          cvv,
          cardType,
          pin: pin || undefined,
        };
        if (itemToEdit) await updateItem({ ...payload, id: itemToEdit.id, createdAt: itemToEdit.createdAt, updatedAt: itemToEdit.updatedAt });
        else await addItem(payload);
      } else if (category === 'snippet') {
        const payload: Omit<SnippetItem, 'id' | 'createdAt' | 'updatedAt'> = {
          ...basePayload,
          category: 'snippet',
          code: snippetCode,
          language: snippetLang,
        };
        if (itemToEdit) await updateItem({ ...payload, id: itemToEdit.id, createdAt: itemToEdit.createdAt, updatedAt: itemToEdit.updatedAt });
        else await addItem(payload);
      } else if (category === 'file') {
        if (!fileDataUrl) {
          setErrorMessage('Please select a file to upload.');
          return;
        }
        const payload: Omit<FileItem, 'id' | 'createdAt' | 'updatedAt'> = {
          ...basePayload,
          category: 'file',
          fileName,
          fileType,
          fileSize,
          dataUrl: fileDataUrl,
        };
        if (itemToEdit) await updateItem({ ...payload, id: itemToEdit.id, createdAt: itemToEdit.createdAt, updatedAt: itemToEdit.updatedAt });
        else await addItem(payload);
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save item to encrypted vault.');
    }
  };

  const categories = [
    { id: 'credential', label: 'Credential', icon: Key },
    { id: 'note', label: 'Note', icon: FileText },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'snippet', label: 'Snippet', icon: Code },
    { id: 'file', label: 'Document', icon: File },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-keepeit flex items-center justify-between bg-[var(--bg-surface)]">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            {itemToEdit ? 'Edit Vault Item' : 'Create New Vault Record'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:ring-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-[var(--accent-rust)] text-[var(--accent-rust)] text-xs rounded-keepeit">
              {errorMessage}
            </div>
          )}

          {/* Category Tabs (Only if creating fresh item) */}
          {!itemToEdit && (
            <div>
              <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1.5">
                RECORD TYPE
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSel = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as any)}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-keepeit text-xs font-mono-label border-keepeit transition-colors ${
                        isSel
                          ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
              RECORD TITLE *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub Production Key, WiFi Password, Private Journal"
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
              required
            />
          </div>

          {/* Folder & Tag Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                ASSIGN SHARED FOLDER
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs text-[var(--text-primary)] focus-visible:ring-2"
              >
                <option value="">(No Folder Assigned)</option>
                {vaultData.folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                TAGS
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag + Enter"
                  className="flex-1 bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2.5 py-1.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)]"
                >
                  ADD
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-keepeit bg-[var(--bg-surface)] border-keepeit text-[10px] font-mono-label text-[var(--text-primary)]"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-[var(--accent-rust)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* DYNAMIC FORM FIELDS BY CATEGORY */}

          {/* 1. CREDENTIAL */}
          {category === 'credential' && (
            <div className="space-y-3 pt-2 border-t border-keepeit">
              <div>
                <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                  USERNAME / EMAIL
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john.doe@company.com"
                  className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono-label text-[var(--text-muted)]">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-mono-label text-[var(--accent-seal)] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>GENERATE SECURE PASSWORD</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password or generate..."
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                  WEBSITE URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://app.example.com/login"
                  className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />
              </div>
            </div>
          )}

          {/* 2. SECURE NOTE */}
          {category === 'note' && (
            <div className="space-y-3 pt-2 border-t border-keepeit">
              <div>
                <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                  NOTE CONTENT (MARKDOWN SUPPORTED)
                </label>
                <textarea
                  rows={6}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your encrypted notes here..."
                  className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit p-3 text-xs font-mono text-[var(--text-primary)] focus-visible:ring-2"
                />
              </div>
            </div>
          )}

          {/* 3. PAYMENT CARD */}
          {category === 'card' && (
            <div className="space-y-3 pt-2 border-t border-keepeit">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    CARDHOLDER NAME
                  </label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="KURT GONZAGA"
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono uppercase text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    CARD TYPE
                  </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as any)}
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="discover">Discover</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                  CARD NUMBER
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4532 1234 5678 9010"
                  className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    EXP MONTH
                  </label>
                  <input
                    type="text"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                    placeholder="08"
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    EXP YEAR
                  </label>
                  <input
                    type="text"
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    placeholder="2028"
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. CODE SNIPPET */}
          {category === 'snippet' && (
            <div className="space-y-3 pt-2 border-t border-keepeit">
              <div>
                <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                  LANGUAGE
                </label>
                <select
                  value={snippetLang}
                  onChange={(e) => setSnippetLang(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                >
                  <option value="typescript">TypeScript / JavaScript</option>
                  <option value="python">Python</option>
                  <option value="bash">Shell / Bash</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                  <option value="css">CSS / Tailwind</option>
                  <option value="yaml">YAML</option>
                  <option value="other">Plain Text</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                  CODE SNIPPET
                </label>
                <textarea
                  rows={6}
                  value={snippetCode}
                  onChange={(e) => setSnippetCode(e.target.value)}
                  placeholder="// Paste code snippet here..."
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border-keepeit rounded-keepeit p-3 text-xs font-mono leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* 5. FILE / DOCUMENT */}
          {category === 'file' && (
            <div className="space-y-3 pt-2 border-t border-keepeit">
              <div>
                <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
                  ATTACH FILE (MAX 5MB ENCRYPTED)
                </label>
                <div className="p-4 bg-[var(--bg-surface)] border-2 border-dashed border-keepeit rounded-keepeit text-center cursor-pointer hover:bg-[var(--bg-surface-hover)] relative">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-[var(--accent-seal)] mx-auto mb-1" />
                  <span className="text-xs font-mono-label text-[var(--text-primary)] block">
                    {fileName ? `Selected: ${fileName}` : 'Click or drop file to attach'}
                  </span>
                  {fileSize > 0 && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {(fileSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
              OPTIONAL NOTES & REMINDERS
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal reminders or security instructions..."
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit p-2.5 text-xs text-[var(--text-primary)]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-keepeit flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-keepeit rounded-keepeit font-mono-label text-xs hover:bg-[var(--bg-surface)] text-[var(--text-primary)]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="btn-stealth-primary px-5 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B]"
            >
              SAVE TO ENCRYPTED VAULT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
