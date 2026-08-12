import { CredentialItem, NoteItem, VaultItem } from '../types/vault';

/**
 * Escape field for CSV
 */
export function escapeCSVField(field: string = ''): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Generate CSV string from Vault items
 */
export function exportVaultToCSV(items: VaultItem[]): string {
  const headers = ['Type', 'Title', 'Username', 'Password', 'URL', 'Notes', 'Folder', 'Tags'];
  const rows = [headers.join(',')];

  for (const item of items) {
    if (item.category === 'credential') {
      const cred = item as CredentialItem;
      const row = [
        'credential',
        escapeCSVField(cred.title),
        escapeCSVField(cred.username),
        escapeCSVField(cred.password),
        escapeCSVField(cred.url || ''),
        escapeCSVField(cred.notes || ''),
        escapeCSVField(cred.folderId || ''),
        escapeCSVField((cred.tags || []).join(';')),
      ];
      rows.push(row.join(','));
    } else if (item.category === 'note') {
      const note = item as NoteItem;
      const row = [
        'note',
        escapeCSVField(note.title),
        '',
        '',
        '',
        escapeCSVField(note.content || note.notes || ''),
        escapeCSVField(note.folderId || ''),
        escapeCSVField((note.tags || []).join(';')),
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

/**
 * Get CSV Template
 */
export function getCSVTemplate(): string {
  return [
    'Type,Title,Username,Password,URL,Notes,Folder,Tags',
    'credential,Example Account,user@example.com,p@ssw0rd123!,https://example.com,Personal login,,work;login',
    'note,Meeting Notes,,,,"# Agenda\n- Discuss project roadmap",,notes;project',
  ].join('\n');
}

/**
 * Parse CSV String into array of credential/note items
 */
export function parseCSVToVaultItems(csvContent: string): Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const items: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  // Simple CSV parser supporting quotes
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  // Process data lines (skip header line 0)
  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    if (fields.length < 2) continue;

    const [type, title, username, password, url, notes, folderId, tagsStr] = fields;
    const tags = tagsStr ? tagsStr.split(';').map((t) => t.trim()).filter(Boolean) : [];

    if (type.toLowerCase() === 'note') {
      items.push({
        title: title || 'Untitled Imported Note',
        category: 'note',
        content: notes || '',
        notes: notes || '',
        folderId: folderId || undefined,
        tags,
        isFavorite: false,
      } as any);
    } else {
      // Default to credential
      items.push({
        title: title || 'Untitled Imported Credential',
        category: 'credential',
        username: username || '',
        password: password || '',
        url: url || undefined,
        notes: notes || undefined,
        folderId: folderId || undefined,
        tags,
        isFavorite: false,
      } as any);
    }
  }

  return items;
}
