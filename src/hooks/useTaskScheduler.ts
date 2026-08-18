import { useEffect, useRef } from 'react';
import { TaskItem } from '../types/vault';
import { playTaskAlarmSound } from '../lib/alarmAudio';
import { sendTaskNotification } from '../lib/notifications';

interface TaskSchedulerOptions {
  enabled: boolean;
  tasks?: TaskItem[];
  onAlarmFired: (task: TaskItem) => void;
}

export function useTaskScheduler({ enabled, tasks = [], onAlarmFired }: TaskSchedulerOptions) {
  const tasksRef = useRef<TaskItem[]>(tasks);
  const onAlarmFiredRef = useRef(onAlarmFired);
  const localTriggeredIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    onAlarmFiredRef.current = onAlarmFired;
  }, [onAlarmFired]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const checkScheduledTasks = () => {
      const now = new Date();
      const currentTimestamp = now.getTime();
      const currentTasks = tasksRef.current || [];

      for (const task of currentTasks) {
        // Skip completed tasks or tasks without active alarm or already fired
        if (task.status === 'completed') continue;
        if (!task.alarmEnabled || task.alarmFired) continue;
        if (localTriggeredIdsRef.current.has(task.id)) continue;

        const targetDate = task.reminderDate || task.dueDate;
        if (!targetDate) continue;

        const targetTime = task.reminderTime || task.dueTime || '09:00';
        const [yearStr, monthStr, dayStr] = targetDate.split('-');
        const [hourStr, minStr] = targetTime.split(':');

        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        const hour = parseInt(hourStr || '0', 10);
        const minute = parseInt(minStr || '0', 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) continue;

        const scheduledTime = new Date(year, month - 1, day, hour, minute, 0).getTime();
        const diffMs = currentTimestamp - scheduledTime;

        // Trigger if scheduled time has arrived and is within 15-minute active window
        if (diffMs >= 0 && diffMs <= 15 * 60 * 1000) {
          localTriggeredIdsRef.current.add(task.id);
          playTaskAlarmSound();
          sendTaskNotification(
            task.title,
            task.description || `Task scheduled for ${targetDate} at ${targetTime} is due now.`
          );
          onAlarmFiredRef.current(task);
        }
      }
    };

    // Initial check on mount/unlock
    checkScheduledTasks();

    // Check every 20 seconds
    const interval = setInterval(checkScheduledTasks, 20000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled]);
}
