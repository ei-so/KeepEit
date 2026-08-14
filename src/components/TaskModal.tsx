import React, { useState, useEffect } from 'react';
import { TaskItem, TaskPriority, TaskStatus, Folder } from '../types/vault';
import { useVault } from '../hooks/useVault';
import { useToast } from './Toast';
import { X, Calendar, CheckSquare, Tag as TagIcon, Folder as FolderIcon, AlertCircle, Star, Trash2 } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskItem | null;
  initialStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  initialStatus = 'todo',
}) => {
  const { vaultData, addTask, updateTask, deleteTask, addTag } = useVault();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const taskFolders = (vaultData?.folders || []).filter(
    (f) => !f.scope || f.scope === 'tasks' || f.scope === 'all'
  );

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status || 'todo');
      setPriority(taskToEdit.priority || 'medium');
      setDueDate(taskToEdit.dueDate || '');
      setFolderId(taskToEdit.folderId);
      setTags(taskToEdit.tags || []);
      setIsFavorite(taskToEdit.isFavorite || false);
    } else {
      setTitle('');
      setDescription('');
      setStatus(initialStatus);
      setPriority('medium');
      setDueDate('');
      setFolderId(undefined);
      setTags([]);
      setIsFavorite(false);
    }
  }, [taskToEdit, initialStatus, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (tags.length >= 5) {
      showToast('Maximum 5 tags allowed per task.', 'info');
      return;
    }
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
      addTag(clean);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Task title is required.', 'error');
      return;
    }

    if (taskToEdit) {
      await updateTask({
        ...taskToEdit,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        folderId,
        tags,
        isFavorite,
      });
      showToast('Task updated.', 'success');
    } else {
      await addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        folderId,
        tags,
        isFavorite,
      });
      showToast('New task created.', 'success');
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!taskToEdit) return;
    await deleteTask(taskToEdit.id);
    showToast('Task deleted.', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-md w-full p-4 sm:p-6 pb-8 shadow-2xl space-y-4 font-mono text-xs max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-keepeit pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[var(--accent-seal)]" />
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
              {taskToEdit ? 'EDIT TASK' : 'NEW TASK'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-keepeit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              TASK TITLE *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audit encryption key recovery process"
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-seal)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional task details or instructions..."
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-seal)] resize-none"
            />
          </div>

          {/* Grid: Status, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status */}
            <div>
              <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
                STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)]"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)]"
              >
                <option value="low">Low (--graphite)</option>
                <option value="medium">Medium (--seal)</option>
                <option value="high">High (--rust)</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
                DUE DATE
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2 py-1.5 text-xs font-mono text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Folder Select */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              FOLDER
            </label>
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || undefined)}
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
            >
              <option value="">(No Folder / Root)</option>
              {taskFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              TAGS (MAX 5)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-keepeit bg-[var(--bg-surface)] border-keepeit text-xs font-mono text-[var(--text-primary)] inline-flex items-center gap-1"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-[var(--text-muted)] hover:text-[var(--accent-rust)]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {tags.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Type tag name and press Enter..."
                  className="flex-1 bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-1.5 text-xs font-mono text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit hover:bg-[var(--bg-card)] font-mono-label"
                >
                  ADD
                </button>
              </div>
            )}
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded-keepeit accent-[var(--accent-seal)]"
              />
              <span className="text-xs text-[var(--text-primary)]">Mark as Favorite</span>
            </label>

            {taskToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-[var(--accent-rust)] hover:underline text-xs flex items-center gap-1 font-mono-label"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE TASK</span>
              </button>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-keepeit flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-mono-label border-keepeit rounded-keepeit text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="btn-stealth-primary px-5 py-2 font-mono-label bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] rounded-keepeit text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] shadow-xs"
            >
              {taskToEdit ? 'SAVE CHANGES' : 'CREATE TASK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
