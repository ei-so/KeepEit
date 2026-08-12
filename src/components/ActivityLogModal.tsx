import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { ActivityLogItem } from '../types/vault';
import { X, Activity, Filter, Trash2, Calendar, Shield } from 'lucide-react';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const { vaultData, recordActivity } = useVault();
  const [actionFilter, setActionFilter] = useState<string>('all');

  if (!isOpen || !vaultData) return null;

  let logs = vaultData.activityLogs || [];

  if (actionFilter !== 'all') {
    logs = logs.filter((l) => l.action === actionFilter);
  }

  const getActionBadge = (action: ActivityLogItem['action']) => {
    switch (action) {
      case 'create':
        return <span className="px-2 py-0.5 rounded-keepeit bg-zinc-500/10 text-[var(--text-primary)] border border-zinc-500/20 font-mono-label text-[10px]">CREATE</span>;
      case 'update':
        return <span className="px-2 py-0.5 rounded-keepeit bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono-label text-[10px]">UPDATE</span>;
      case 'delete':
        return <span className="px-2 py-0.5 rounded-keepeit bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono-label text-[10px]">DELETE</span>;
      case 'unlock':
        return <span className="px-2 py-0.5 rounded-keepeit bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono-label text-[10px]">UNLOCK</span>;
      case 'lock':
        return <span className="px-2 py-0.5 rounded-keepeit bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 font-mono-label text-[10px]">LOCK</span>;
      case 'export':
      case 'import':
        return <span className="px-2 py-0.5 rounded-keepeit bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono-label text-[10px]">{action.toUpperCase()}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-keepeit bg-slate-500/10 text-slate-600 border border-slate-500/20 font-mono-label text-[10px]">{action.toUpperCase()}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-keepeit flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--accent-seal)]" />
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
              Vault Activity Audit Log
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-3 border-b border-keepeit bg-[var(--bg-surface)] flex items-center justify-between gap-3 text-xs font-mono-label">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">FILTER:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-[var(--bg-card)] border-keepeit rounded-keepeit px-2 py-1 text-xs text-[var(--text-primary)] font-mono"
            >
              <option value="all">All Actions</option>
              <option value="create">Created Items</option>
              <option value="update">Updated Items</option>
              <option value="delete">Deleted Items</option>
              <option value="unlock">Vault Unlocks</option>
              <option value="export">Exports & Imports</option>
            </select>
          </div>

          <span className="text-[var(--text-muted)]">{logs.length} RECORDED EVENTS</span>
        </div>

        {/* Log Entries List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <p className="text-center text-xs text-[var(--text-muted)] py-8 italic">
              No activity recorded matching this filter.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-[var(--bg-surface)] border-keepeit rounded-keepeit flex items-start justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    {log.itemTitle && (
                      <span className="font-semibold text-[var(--text-primary)] truncate">
                        {log.itemTitle}
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                      {log.details}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono-label">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-keepeit bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono-label text-[var(--text-muted)]">
          <span>ALL AUDIT LOGS ARE ENCRYPTED WITHIN THE PRIMARY ENVELOPE</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[var(--bg-card)] border-keepeit rounded-keepeit hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
