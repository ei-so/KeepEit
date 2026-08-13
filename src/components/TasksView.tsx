import React, { useState } from 'react';
import { TaskItem, TaskPriority, TaskStatus, Folder } from '../types/vault';
import { useVault } from '../hooks/useVault';
import { useToast } from './Toast';
import { TaskModal } from './TaskModal';
import { FolderManagerModal } from './FolderManagerModal';
import {
  CheckSquare,
  Square,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertCircle,
  Star,
  Edit2,
  Trash2,
  Filter,
  Folder as FolderIcon,
  Tag as TagIcon,
  ArrowUpDown,
  FolderPlus,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { vaultData, toggleTaskStatus, toggleTaskFavorite, deleteTask } = useVault();
  const { showToast } = useToast();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created'>('dueDate');

  // Group Collapsed States
  const [collapsedGroups, setCollapsedGroups] = useState<Record<TaskStatus, boolean>>({
    todo: false,
    in_progress: false,
    completed: false,
  });

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>('todo');
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);

  if (!vaultData) return null;

  const allTasks = vaultData.tasks || [];
  const taskFolders = (vaultData.folders || []).filter(
    (f) => !f.scope || f.scope === 'tasks' || f.scope === 'all'
  );
  const allTags = vaultData.tags || [];

  // Filter Tasks
  let filteredTasks = [...allTasks];

  if (selectedFolderId) {
    filteredTasks = filteredTasks.filter((t) => t.folderId === selectedFolderId);
  }

  if (selectedTag) {
    filteredTasks = filteredTasks.filter((t) => t.tags && t.tags.includes(selectedTag));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredTasks = filteredTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  }

  // Priority numerical weights for sorting
  const priorityWeight: Record<TaskPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // Sort Tasks
  filteredTasks.sort((a, b) => {
    if (sortBy === 'priority') {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    // Created date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Group tasks by status
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  const toggleGroupCollapse = (status: TaskStatus) => {
    setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const handleOpenNewModal = (status: TaskStatus = 'todo') => {
    setTaskToEdit(null);
    setModalInitialStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: TaskItem) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (task: TaskItem) => {
    await deleteTask(task.id);
    showToast(`Deleted task '${task.title}'.`, 'info');
  };

  // Helper to check if a due date is overdue
  const isOverdue = (dueDateStr?: string) => {
    if (!dueDateStr) return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Render Priority Chip
  const renderPriorityChip = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-keepeit text-[10px] font-mono font-bold bg-[var(--accent-rust)] text-white shadow-xs">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-keepeit text-[10px] font-mono font-bold bg-[var(--accent-seal)] text-[var(--accent-fg)] shadow-xs">
            MEDIUM
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-keepeit text-[10px] font-mono font-bold bg-[#7A8479] text-white">
            LOW
          </span>
        );
    }
  };

  // Render Status Group Section
  const renderTaskGroup = (title: string, statusKey: TaskStatus, tasks: TaskItem[]) => {
    const isCollapsed = collapsedGroups[statusKey];

    return (
      <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit overflow-hidden mb-4 shadow-xs">
        {/* Group Header */}
        <div className="p-3 bg-[var(--bg-surface)] border-b border-keepeit flex items-center justify-between">
          <div
            onClick={() => toggleGroupCollapse(statusKey)}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] uppercase tracking-wide">
              {title}
            </h3>
            <span className="px-2 py-0.5 rounded-keepeit bg-[var(--bg-card)] border-keepeit font-mono text-[11px] font-semibold text-[var(--accent-seal)]">
              {tasks.length}
            </span>
          </div>

          {/* Group Inline "+" */}
          <button
            onClick={() => handleOpenNewModal(statusKey)}
            className="px-2.5 py-1 bg-[var(--accent-seal)] text-[var(--accent-fg)] text-[11px] font-mono-label font-semibold rounded-keepeit hover:opacity-90 flex items-center gap-1 shadow-xs"
            title={`Add new task to ${title}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD</span>
          </button>
        </div>

        {/* Group Items */}
        {!isCollapsed && (
          <div className="divide-y divide-keepeit">
            {tasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)] italic">
                No tasks in {title.toLowerCase()}.
              </div>
            ) : (
              tasks.map((task) => {
                const folder = taskFolders.find((f) => f.id === task.folderId);
                const overdue = task.status !== 'completed' && isOverdue(task.dueDate);

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-surface)]/60 transition-colors ${
                      task.status === 'completed' ? 'opacity-70 bg-[var(--bg-surface)]/30' : ''
                    }`}
                  >
                    {/* Left: Checkbox & Main Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() =>
                          toggleTaskStatus(
                            task.id,
                            task.status === 'completed' ? 'todo' : 'completed'
                          )
                        }
                        className="mt-0.5 text-[var(--accent-seal)] hover:opacity-80 shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <CheckSquare className="w-4 h-4 text-[var(--accent-seal)]" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-display font-semibold text-xs text-[var(--text-primary)] ${
                              task.status === 'completed' ? 'line-through text-[var(--text-muted)]' : ''
                            }`}
                          >
                            {task.title}
                          </span>

                          {/* Priority Chip */}
                          {renderPriorityChip(task.priority)}

                          {/* Folder Badge */}
                          {folder && (
                            <span
                              className="px-1.5 py-0.2 rounded-keepeit text-white font-semibold text-[9px] font-mono truncate"
                              style={{ backgroundColor: folder.color || 'var(--accent-seal)' }}
                            >
                              {folder.name}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 font-sans">
                            {task.description}
                          </p>
                        )}

                        {/* Badges row: Due Date / Overdue, Tags, Completed Date */}
                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-[var(--text-muted)] pt-0.5">
                          {/* Due Date Chip */}
                          {task.dueDate && (
                            <div
                              className={`flex items-center gap-1 font-semibold ${
                                overdue ? 'text-[var(--accent-rust)]' : 'text-[var(--text-muted)]'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              {overdue && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-rust)]" />}
                              <span>
                                {overdue ? 'OVERDUE: ' : 'DUE: '}
                                {new Date(task.dueDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}

                          {/* Completed Date */}
                          {task.status === 'completed' && task.completedAt && (
                            <div className="text-[var(--accent-seal)] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>
                                Completed{' '}
                                {new Date(task.completedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}

                          {/* Tags */}
                          {task.tags?.map((t) => (
                            <span key={t} className="text-[9px] text-[var(--text-muted)]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Row Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => toggleTaskFavorite(task.id)}
                        className={`p-1 rounded-keepeit ${
                          task.isFavorite ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={task.isFavorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Star className={`w-3.5 h-3.5 ${task.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-rust)] rounded-keepeit"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-main)] overflow-hidden">
      {/* HEADER CONTROLS BAR */}
      <div className="p-4 bg-[var(--bg-card)] border-b border-keepeit space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[var(--accent-seal)]" />
            <h2 className="font-display font-bold text-base text-[var(--text-primary)]">
              TASK WORKSPACE
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFolderManagerOpen(true)}
              className="px-3 py-1.5 border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[var(--accent-seal)]" />
              <span>FOLDERS</span>
            </button>

            <button
              onClick={() => handleOpenNewModal('todo')}
              className="btn-stealth-primary px-3.5 py-1.5 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] text-xs font-mono-label font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>NEW TASK</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)]"
            />
          </div>

          {/* Folder Filter */}
          <select
            value={selectedFolderId || ''}
            onChange={(e) => setSelectedFolderId(e.target.value || null)}
            className="bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">All Folders</option>
            {taskFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.name}>
                #{t.name}
              </option>
            ))}
          </select>

          {/* Sort Control */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
            >
              <option value="dueDate">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
              <option value="created">Sort: Created Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* GROUPS SCROLLABLE CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full pb-28 md:pb-16">
        {filteredTasks.length === 0 && (
          <div className="p-8 text-center bg-[var(--bg-card)] border-keepeit rounded-keepeit my-6 space-y-3">
            <CheckSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
              No tasks found
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
              {searchQuery || selectedFolderId || selectedTag
                ? 'No tasks match your filter criteria.'
                : 'Create your first task to start organizing your work.'}
            </p>
            <button
              onClick={() => handleOpenNewModal('todo')}
              className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] text-xs font-mono-label font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] mx-auto block"
            >
              CREATE TASK
            </button>
          </div>
        )}

        {/* Group 1: To Do */}
        {renderTaskGroup('To Do', 'todo', todoTasks)}

        {/* Group 2: In Progress */}
        {renderTaskGroup('In Progress', 'in_progress', inProgressTasks)}

        {/* Group 3: Completed */}
        {renderTaskGroup('Completed', 'completed', completedTasks)}
      </div>

      {/* TASK CREATE/EDIT MODAL */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        initialStatus={modalInitialStatus}
      />

      {/* SHARED FOLDER MANAGER MODAL */}
      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
      />
    </div>
  );
};
