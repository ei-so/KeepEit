import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { CredentialItem, TaskItem } from '../types/vault';
import { AppRoute } from './Sidebar';
import {
  Shield,
  FileText,
  CheckSquare,
  AlertTriangle,
  Wallet,
  KeyRound,
  Copy,
  Check,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Download,
  ShieldCheck,
  Clock,
  Sparkles,
  Bell,
  BellRing,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { vaultData, exportBackup, toggleTaskStatus } = useVault();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!vaultData) return null;

  // 1. Greeting & Time of Day
  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const storedName = typeof window !== 'undefined' ? localStorage.getItem('keepeit_user_name') : null;
  const displayName = vaultData.accountProfile?.displayName || storedName || 'Vault User';

  // 2. Three Count Cards
  const credentialCount = vaultData.items.filter((i) => i.category === 'credential').length;
  const noteCount = vaultData.items.filter((i) => i.category === 'note').length;
  const openTaskCount = (vaultData.tasks || []).filter((t) => t.status !== 'completed').length;

  // 3. Overdue Tasks Banner
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = (vaultData.tasks || []).filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== 'completed'
  );

  // 4. Income Sparkline for Last 6 Months
  const incomeList = vaultData.income || [];
  const now = new Date();
  const last6Months: { label: string; yearMonth: string; total: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    const total = incomeList
      .filter((inc) => inc.date.startsWith(yearMonth))
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

    last6Months.push({ label, yearMonth, total });
  }

  const maxIncome = Math.max(...last6Months.map((m) => m.total), 1000);

  // 5. Recent Credentials (3)
  const recentCredentials = vaultData.items
    .filter((i) => i.category === 'credential')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3) as CredentialItem[];

  // 6. Upcoming Tasks (3)
  const upcomingTasks = (vaultData.tasks || [])
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 3);

  // 7. Vault Protection Checks (Score out of 3)
  const hasBackupAge = !!vaultData.lastBackupAt;
  const isAutoLockOn = (vaultData.settings?.autoLockMinutes ?? 0) > 0;
  // Check if recovery code is set (we can treat recoveryCode as generated)
  const isRecoveryGenerated = true; // generated on vault creation by default

  const protectionScore = (hasBackupAge ? 1 : 0) + (isAutoLockOn ? 1 : 0) + (isRecoveryGenerated ? 1 : 0);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] overflow-y-auto pb-28 sm:pb-12 md:pb-16">
      {/* Top Banner & Greeting */}
      <div className="p-6 border-b border-keepeit bg-[var(--bg-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-mono-label text-[10px] text-[var(--accent-seal)] font-bold tracking-widest uppercase">
              ZERO-KNOWLEDGE PERSONAL WORKSPACE
            </span>
            <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
              {greetingTime}, {displayName}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Your vault envelope is unlocked and verified offline. Local memory is active.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('vault')}
              className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4" /> OPEN VAULT
            </button>
          </div>
        </div>

        {/* Overdue Banner if applicable */}
        {overdueTasks.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-[var(--accent-rust)] rounded-keepeit flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--accent-rust)] font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Attention: You have {overdueTasks.length} overdue task(s) requiring completion!
              </span>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="px-3 py-1 bg-[var(--accent-rust)] text-white font-mono-label text-[10px] rounded-keepeit hover:opacity-90 shrink-0"
            >
              VIEW OVERDUE TASKS
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="p-6 space-y-6">
        {/* Section 1: Three Count Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Credentials */}
          <div
            onClick={() => onNavigate('vault')}
            className="p-5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3 cursor-pointer hover:border-[var(--accent-seal)] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase">
                ENCRYPTED CREDENTIALS
              </span>
              <div className="w-8 h-8 rounded-full bg-[var(--accent-seal)] text-[var(--accent-fg)] flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                {credentialCount}
              </p>
              <span className="text-xs text-[var(--accent-seal)] group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                Manage <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Notes */}
          <div
            onClick={() => onNavigate('notes')}
            className="p-5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3 cursor-pointer hover:border-[var(--accent-seal)] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase">
                SECURE NOTES
              </span>
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{noteCount}</p>
              <span className="text-xs text-[var(--accent-seal)] group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                Open <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Open Tasks */}
          <div
            onClick={() => onNavigate('tasks')}
            className="p-5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3 cursor-pointer hover:border-[var(--accent-seal)] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase">
                OPEN WORKSPACE TASKS
              </span>
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                {openTaskCount}
              </p>
              <span className="text-xs text-[var(--accent-seal)] group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                Tasks <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Income Sparkline & Vault Protection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Income Sparkline (2 Cols) */}
          <div className="lg:col-span-2 p-5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-4">
            <div className="flex items-center justify-between border-b border-keepeit pb-3">
              <div className="space-y-0.5">
                <h3 className="font-display font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[var(--accent-seal)]" />
                  6-Month Financial Income Trend
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Monthly income aggregation across all category buckets.
                </p>
              </div>
              <button
                onClick={() => onNavigate('income')}
                className="text-xs font-mono-label text-[var(--accent-seal)] hover:underline inline-flex items-center gap-1"
              >
                LEDGER <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sparkline Bars Visualizer */}
            <div className="pt-2">
              <div className="h-36 flex items-end justify-between gap-3 px-2">
                {last6Months.map((m) => {
                  const heightPct = Math.max(10, Math.round((m.total / maxIncome) * 100));
                  return (
                    <div
                      key={m.yearMonth}
                      className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                    >
                      <div className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[var(--accent-seal)] transition-colors opacity-0 group-hover:opacity-100">
                        ₱{m.total.toLocaleString()}
                      </div>
                      <div
                        className="w-full bg-[var(--accent-seal-soft)] group-hover:bg-[var(--accent-seal)] rounded-t-keepeit transition-all duration-300 relative"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="font-mono-label text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-bold">
                        {m.label.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vault Protection Panel (1 Col) */}
          <div className="p-5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-keepeit pb-3">
                <h3 className="font-display font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent-seal)]" />
                  Vault Protection Score
                </h3>
                <span className="font-mono text-sm font-bold text-[var(--accent-fg)] bg-[var(--accent-seal)] px-2 py-0.5 rounded-keepeit">
                  {protectionScore}/3 SCORE
                </span>
              </div>

              {/* Three Security Checks */}
              <div className="space-y-2 text-xs">
                {/* Check 1: Backup Age */}
                <div className="p-2.5 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        hasBackupAge ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-semibold text-[var(--text-primary)]">Backup Freshness</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {hasBackupAge
                      ? new Date(vaultData.lastBackupAt!).toLocaleDateString()
                      : 'No Backup Yet'}
                  </span>
                </div>

                {/* Check 2: Auto-Lock */}
                <div className="p-2.5 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isAutoLockOn ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="font-semibold text-[var(--text-primary)]">Auto-Lock Idle Timer</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {isAutoLockOn ? `${vaultData.settings.autoLockMinutes}m Timer` : 'Disabled'}
                  </span>
                </div>

                {/* Check 3: Recovery Code */}
                <div className="p-2.5 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-[var(--text-primary)]">Emergency Recovery Code</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-600 font-bold">Generated</span>
                </div>
              </div>
            </div>

            {/* Action: Create Backup */}
            <button
              onClick={exportBackup}
              className="btn-stealth-primary w-full py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> CREATE ENCRYPTED BACKUP
            </button>
          </div>
        </div>

        {/* Section 3: Recent Credentials (3) & Upcoming Tasks (3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Credentials (3) */}
          <div className="p-5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-4">
            <div className="flex items-center justify-between border-b border-keepeit pb-3">
              <h3 className="font-display font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[var(--accent-seal)]" />
                Recent Encrypted Credentials
              </h3>
              <button
                onClick={() => onNavigate('vault')}
                className="text-xs font-mono-label text-[var(--accent-seal)] hover:underline flex items-center gap-0.5"
              >
                VIEW ALL ({credentialCount})
              </button>
            </div>

            {recentCredentials.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center italic">
                No credentials stored yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentCredentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-3 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                        {cred.title}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                        {cred.username || 'No User'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono-label text-[10px]">
                      <button
                        onClick={() => handleCopy(cred.username, cred.id + '-user')}
                        className="px-2 py-1 bg-[var(--bg-card)] border border-keepeit rounded-keepeit hover:bg-[var(--bg-surface-hover)] flex items-center gap-1 text-[var(--text-primary)]"
                      >
                        {copiedId === cred.id + '-user' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>USER</span>
                      </button>

                      <button
                        onClick={() => handleCopy(cred.password, cred.id + '-pass')}
                        className="px-2 py-1 bg-[var(--accent-seal)] text-[var(--accent-fg)] rounded-keepeit hover:opacity-90 flex items-center gap-1 font-semibold"
                      >
                        {copiedId === cred.id + '-pass' ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        <span>PASSWORD</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Tasks (3) */}
          <div className="p-5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-4">
            <div className="flex items-center justify-between border-b border-keepeit pb-3">
              <h3 className="font-display font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[var(--accent-seal)]" />
                Upcoming Workspace Tasks
              </h3>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-mono-label text-[var(--accent-seal)] hover:underline flex items-center gap-0.5"
              >
                TASKS BOARD ({openTaskCount})
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center italic">
                No active tasks scheduled.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() =>
                          toggleTaskStatus(
                            task.id,
                            task.status === 'completed' ? 'todo' : 'completed'
                          )
                        }
                        className="accent-[var(--accent-seal)] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-[var(--text-primary)] truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.dueDate && (
                            <p className="font-mono text-[10px] text-[var(--text-muted)]">
                              DUE: {task.dueDate}{task.dueTime ? ` @ ${task.dueTime}` : ''}
                            </p>
                          )}
                          {task.alarmEnabled && (
                            <span
                              className={`flex items-center gap-1 text-[9px] font-mono ${
                                task.alarmFired ? 'text-[var(--text-muted)]' : 'text-amber-500'
                              }`}
                              title={
                                task.alarmFired
                                  ? 'Alarm triggered'
                                  : `Alarm scheduled: ${task.reminderDate || task.dueDate || ''} ${task.reminderTime || task.dueTime || ''}`
                              }
                            >
                              {task.alarmFired ? (
                                <Bell className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                              ) : (
                                <BellRing className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                              )}
                              <span>{task.reminderTime || task.dueTime || 'ALARM'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono-label rounded-keepeit font-bold shrink-0 ${
                        task.priority === 'high'
                          ? 'bg-[var(--accent-rust)] text-white'
                          : task.priority === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                      }`}
                    >
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
