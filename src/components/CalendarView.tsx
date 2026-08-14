import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { TaskItem, TaskPriority } from '../types/vault';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wallet,
  CheckSquare,
  X,
} from 'lucide-react';

type CalendarViewMode = 'month' | 'week' | 'year';

export const CalendarView: React.FC = () => {
  const { vaultData, addTask, toggleTaskStatus } = useVault();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Quick Add Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');

  if (!vaultData) return null;

  const tasks = vaultData.tasks || [];
  const incomeList = vaultData.income || [];

  const todayStr = new Date().toISOString().slice(0, 10);

  // Month Math Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Navigation Handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      setCurrentDate(new Date(year - 1, month, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      setCurrentDate(new Date(year + 1, month, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenAddTaskModal = (dateStr: string) => {
    setPrefilledDate(dateStr);
    setTaskTitle('');
    setTaskPriority('medium');
    setIsTaskModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    await addTask({
      title: taskTitle.trim(),
      status: 'todo',
      priority: taskPriority,
      dueDate: prefilledDate || todayStr,
      tags: [],
      isFavorite: false,
    });

    setIsTaskModalOpen(false);
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  // Helper to get priority color
  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-[var(--accent-rust)] text-white';
      case 'medium':
        return 'bg-amber-500 text-white';
      case 'low':
      default:
        return 'bg-[var(--accent-seal)] text-[var(--accent-fg)]';
    }
  };

  // Calculate Period Totals for Summary Row
  let periodOpenTasks = 0;
  let periodCompletedTasks = 0;
  let periodIncomeTotal = 0;

  if (viewMode === 'month') {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    periodOpenTasks = tasks.filter(
      (t) => t.dueDate?.startsWith(monthPrefix) && t.status !== 'completed'
    ).length;
    periodCompletedTasks = tasks.filter(
      (t) => t.dueDate?.startsWith(monthPrefix) && t.status === 'completed'
    ).length;
    periodIncomeTotal = incomeList
      .filter((i) => i.date.startsWith(monthPrefix))
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  } else if (viewMode === 'year') {
    const yearPrefix = `${year}`;
    periodOpenTasks = tasks.filter(
      (t) => t.dueDate?.startsWith(yearPrefix) && t.status !== 'completed'
    ).length;
    periodCompletedTasks = tasks.filter(
      (t) => t.dueDate?.startsWith(yearPrefix) && t.status === 'completed'
    ).length;
    periodIncomeTotal = incomeList
      .filter((i) => i.date.startsWith(yearPrefix))
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  } else {
    // Week mode
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay();
    const startOfWeek = new Date(curr.setDate(first));
    const endOfWeek = new Date(curr.setDate(first + 6));

    const startStr = startOfWeek.toISOString().slice(0, 10);
    const endStr = endOfWeek.toISOString().slice(0, 10);

    periodOpenTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate >= startStr && t.dueDate <= endStr && t.status !== 'completed'
    ).length;
    periodCompletedTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate >= startStr && t.dueDate <= endStr && t.status === 'completed'
    ).length;
    periodIncomeTotal = incomeList
      .filter((i) => i.date >= startStr && i.date <= endStr)
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }

  // Overdue and Upcoming Lists
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== 'completed'
  );
  const upcomingTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate >= todayStr && t.status !== 'completed'
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] overflow-y-auto">
      {/* Header Bar */}
      <div className="p-6 border-b border-keepeit bg-[var(--bg-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[var(--accent-seal)]" />
              Unified Workspace Calendar
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Integrated view mapping scheduled tasks, deadlines, and financial income entries across timelines.
            </p>
          </div>

          {/* Controls: Prev/Next/Today & Mode Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Nav Arrows */}
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 border border-keepeit rounded-keepeit">
              <button
                onClick={handlePrev}
                className="p-1 rounded-keepeit text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2 py-1 text-[10px] font-mono-label font-bold text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-keepeit"
              >
                TODAY
              </button>
              <button
                onClick={handleNext}
                className="p-1 rounded-keepeit text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Title Display */}
            <span className="font-display font-bold text-sm text-[var(--text-primary)] min-w-[130px] text-center">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>

            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 border border-keepeit rounded-keepeit font-mono-label text-xs">
              {(['week', 'month', 'year'] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-keepeit transition-colors uppercase ${
                    viewMode === mode
                      ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="p-4 sm:p-6 pb-28 sm:pb-12 md:pb-16 space-y-6">
        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit overflow-hidden shadow-sm">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-keepeit bg-[var(--bg-surface)] font-mono-label text-[10px] text-[var(--text-muted)] text-center py-2">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-keepeit">
              {/* Empty padding cells before 1st of month */}
              {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-28 bg-[var(--bg-surface)]/30 p-1" />
              ))}

              {/* Day cells */}
              {Array.from({ length: totalDaysInMonth }).map((_, dayIdx) => {
                const dayNum = dayIdx + 1;
                const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;
                const isToday = cellDateStr === todayStr;

                // Day Tasks
                const dayTasks = tasks.filter((t) => t.dueDate === cellDateStr);

                // Day Income
                const dayIncomeSum = incomeList
                  .filter((i) => i.date === cellDateStr)
                  .reduce((sum, i) => sum + Number(i.amount || 0), 0);

                return (
                  <div
                    key={cellDateStr}
                    className={`h-28 p-1.5 flex flex-col justify-between group transition-colors hover:bg-[var(--bg-surface-hover)] ${
                      isToday ? 'bg-[var(--accent-seal-soft)]/20 border-2 border-[var(--accent-seal)]' : ''
                    }`}
                  >
                    {/* Top Row: Date Number & + Task Trigger */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          isToday
                            ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {dayNum}
                      </span>

                      <button
                        onClick={() => handleOpenAddTaskModal(cellDateStr)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--accent-seal)] transition-opacity"
                        title="Add Task to Date"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Task Chips */}
                    <div className="flex-1 overflow-y-auto my-1 space-y-1 text-[10px]">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => toggleTaskStatus(task.id, task.status === 'completed' ? 'todo' : 'completed')}
                          className={`px-1.5 py-0.5 rounded-keepeit truncate cursor-pointer font-sans transition-opacity ${getPriorityBadgeClass(
                            task.priority
                          )} ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}
                          title={`${task.title} (${task.priority})`}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>

                    {/* Income Total Chip if non-zero */}
                    {dayIncomeSum > 0 && (
                      <div className="font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded-keepeit text-right truncate">
                        +{formatCurrency(dayIncomeSum)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => {
              const curr = new Date(currentDate);
              const first = curr.getDate() - curr.getDay();
              const dayDate = new Date(curr.setDate(first + i));
              const cellDateStr = dayDate.toISOString().slice(0, 10);
              const isToday = cellDateStr === todayStr;

              const dayTasks = tasks.filter((t) => t.dueDate === cellDateStr);
              const dayIncomeSum = incomeList
                .filter((i) => i.date === cellDateStr)
                .reduce((sum, i) => sum + Number(i.amount || 0), 0);

              return (
                <div
                  key={cellDateStr}
                  className={`p-3 bg-[var(--bg-card)] border rounded-keepeit space-y-3 flex flex-col justify-between min-h-[220px] ${
                    isToday ? 'border-[var(--accent-seal)] ring-1 ring-[var(--accent-seal)]' : 'border-keepeit'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between border-b border-keepeit pb-2">
                      <div className="space-y-0.5">
                        <span className="font-mono-label text-[10px] text-[var(--text-muted)] block">
                          {dayDate.toLocaleString('default', { weekday: 'short' }).toUpperCase()}
                        </span>
                        <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                          {dayDate.getDate()} {dayDate.toLocaleString('default', { month: 'short' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenAddTaskModal(cellDateStr)}
                        className="p-1 rounded-keepeit bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]"
                        title="Add Task"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Task items */}
                    <div className="space-y-1.5 pt-1">
                      {dayTasks.length === 0 ? (
                        <p className="text-[10px] text-[var(--text-muted)] italic">No tasks</p>
                      ) : (
                        dayTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => toggleTaskStatus(t.id, t.status === 'completed' ? 'todo' : 'completed')}
                            className={`p-1.5 rounded-keepeit text-[10px] cursor-pointer flex items-center justify-between gap-1 ${getPriorityBadgeClass(
                              t.priority
                            )} ${t.status === 'completed' ? 'line-through opacity-50' : ''}`}
                          >
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {dayIncomeSum > 0 && (
                    <div className="pt-2 border-t border-keepeit font-mono text-[10px] font-bold text-emerald-600 text-right">
                      +{formatCurrency(dayIncomeSum)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* YEAR VIEW */}
        {viewMode === 'year' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, mIdx) => {
              const monthPrefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
              const monthName = new Date(year, mIdx, 1).toLocaleString('default', { month: 'long' });

              const openCount = tasks.filter(
                (t) => t.dueDate?.startsWith(monthPrefix) && t.status !== 'completed'
              ).length;

              const monthIncome = incomeList
                .filter((i) => i.date.startsWith(monthPrefix))
                .reduce((sum, i) => sum + Number(i.amount || 0), 0);

              const isCurrentMonth =
                new Date().getFullYear() === year && new Date().getMonth() === mIdx;

              return (
                <div
                  key={mIdx}
                  onClick={() => {
                    setCurrentDate(new Date(year, mIdx, 1));
                    setViewMode('month');
                  }}
                  className={`p-4 bg-[var(--bg-card)] border rounded-keepeit space-y-3 cursor-pointer hover:border-[var(--accent-seal)] transition-colors ${
                    isCurrentMonth ? 'border-[var(--accent-seal)] bg-[var(--accent-seal-soft)]/10' : 'border-keepeit'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">{monthName}</h3>
                    {isCurrentMonth && (
                      <span className="px-1.5 py-0.5 bg-[var(--accent-seal)] text-[var(--accent-fg)] text-[9px] font-mono-label rounded-full font-bold">
                        CURRENT
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>OPEN TASKS:</span>
                      <span className="font-bold text-[var(--text-primary)]">{openCount}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>INCOME:</span>
                      <span className="font-bold text-emerald-600">
                        {monthIncome > 0 ? formatCurrency(monthIncome) : '₱0'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BELOW THE GRID: SUMMARY ROW & OVERDUE/UPCOMING PANELS */}
        <div className="space-y-6 pt-4 border-t border-keepeit">
          {/* Summary Row */}
          <div className="p-4 bg-[var(--bg-card)] border border-keepeit rounded-keepeit grid grid-cols-1 sm:grid-cols-3 gap-4 text-center font-mono-label">
            <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-keepeit pb-3 sm:pb-0">
              <span className="text-[10px] text-[var(--text-muted)]">PERIOD OPEN TASKS</span>
              <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{periodOpenTasks}</p>
            </div>
            <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-keepeit pb-3 sm:pb-0">
              <span className="text-[10px] text-[var(--text-muted)]">PERIOD COMPLETED</span>
              <p className="font-mono text-lg font-bold text-emerald-600">{periodCompletedTasks}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--text-muted)]">PERIOD INCOME TOTAL</span>
              <p className="font-mono text-lg font-bold text-[var(--accent-seal)]">
                {formatCurrency(periodIncomeTotal)}
              </p>
            </div>
          </div>

          {/* Two Panels: Needs Attention (Overdue) & Upcoming Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Needs Attention (Overdue) */}
            <div className="p-4 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3">
              <div className="flex items-center justify-between border-b border-keepeit pb-2">
                <h3 className="font-mono-label text-xs text-[var(--accent-rust)] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  NEEDS ATTENTION (OVERDUE: {overdueTasks.length})
                </h3>
              </div>

              {overdueTasks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center italic">
                  No overdue tasks requiring immediate attention.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {overdueTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{t.title}</p>
                        <p className="font-mono text-[10px] text-[var(--accent-rust)] font-bold">
                          DUE: {t.dueDate}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleTaskStatus(t.id, 'completed')}
                        className="px-2 py-1 bg-[var(--accent-seal)] text-[var(--accent-fg)] text-[10px] font-mono-label font-bold rounded-keepeit shrink-0"
                      >
                        DONE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Tasks */}
            <div className="p-4 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3">
              <div className="flex items-center justify-between border-b border-keepeit pb-2">
                <h3 className="font-mono-label text-xs text-[var(--accent-seal)] font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  UPCOMING SCHEDULED TASKS ({upcomingTasks.length})
                </h3>
              </div>

              {upcomingTasks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center italic">
                  No upcoming tasks scheduled in calendar.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {upcomingTasks.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{t.title}</p>
                        <p className="font-mono text-[10px] text-[var(--text-muted)]">DUE: {t.dueDate}</p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-mono-label rounded-keepeit text-white ${getPriorityBadgeClass(
                          t.priority
                        )}`}
                      >
                        {t.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Quick Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit max-w-sm w-full p-4 sm:p-6 pb-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-keepeit pb-3">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[var(--accent-seal)]" />
                Add Scheduled Task
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-mono-label text-[var(--text-muted)] block">TASK TITLE *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task description..."
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono-label text-[var(--text-muted)] block">DUE DATE</label>
                <input
                  type="date"
                  value={prefilledDate}
                  onChange={(e) => setPrefilledDate(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono-label text-[var(--text-muted)] block">PRIORITY LEVEL</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="low">LOW PRIORITY</option>
                  <option value="medium">MEDIUM PRIORITY</option>
                  <option value="high">HIGH PRIORITY</option>
                </select>
              </div>

              <div className="pt-3 border-t border-keepeit flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 bg-[var(--bg-surface)] border border-keepeit text-[var(--text-primary)] rounded-keepeit font-mono-label text-xs hover:bg-[var(--bg-surface-hover)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B]"
                >
                  CREATE TASK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
