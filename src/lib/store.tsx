'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Task, Agent, TasksState, TasksAction, TaskStatus } from './types';

const API_BASE = '/api';

function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };

    case 'SET_AGENTS':
      return { ...state, agents: action.payload };

    case 'CREATE_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id
            ? { ...t, ...action.payload, updated_at: new Date().toISOString() }
            : t
        ),
      };

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload.id) };

    case 'MOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.payload.id) return t;
          const newStatus: TaskStatus = action.payload.status;
          const completedAt = newStatus === 'done' ? new Date().toISOString() : t.completed_at;
          const newLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: `Status changed to ${newStatus.replace('_', ' ')}`,
            type: 'info' as const,
          };
          return {
            ...t,
            status: newStatus,
            completed_at: completedAt,
            updated_at: new Date().toISOString(),
            logs: [...t.logs, newLog],
          };
        }),
      };

    default:
      return state;
  }
}

interface TasksContextValue {
  state: TasksState;
  dispatch: React.Dispatch<TasksAction>;
  refresh: () => Promise<void>;
  apiCreateTask: (data: Partial<Task>) => Promise<Task | null>;
  apiUpdateTask: (id: string, data: Partial<Task>) => Promise<Task | null>;
  apiDeleteTask: (id: string) => Promise<boolean>;
  apiMoveTask: (id: string, status: TaskStatus) => Promise<Task | null>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, {
    tasks: [],
    agents: [],
  });

  const refresh = useCallback(async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/agents`),
      ]);
      if (tasksRes.ok) {
        const { tasks } = await tasksRes.json();
        dispatch({ type: 'SET_TASKS' as const, payload: tasks } as TasksAction);
      }
      if (agentsRes.ok) {
        const { agents } = await agentsRes.json();
        dispatch({ type: 'SET_AGENTS' as const, payload: agents } as TasksAction);
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 10 seconds for updates from agents
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const apiCreateTask = useCallback(async (data: Partial<Task>): Promise<Task | null> => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const { task } = await res.json();
        dispatch({ type: 'CREATE_TASK', payload: task });
        return task;
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
    return null;
  }, []);

  const apiUpdateTask = useCallback(async (id: string, data: Partial<Task>): Promise<Task | null> => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const { task } = await res.json();
        dispatch({ type: 'UPDATE_TASK', payload: { id, ...task } });
        return task;
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
    return null;
  }, []);

  const apiDeleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        dispatch({ type: 'DELETE_TASK', payload: { id } });
        return true;
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
    return false;
  }, []);

  const apiMoveTask = useCallback(async (id: string, status: TaskStatus): Promise<Task | null> => {
    // Optimistic update
    dispatch({ type: 'MOVE_TASK', payload: { id, status } });
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const { task } = await res.json();
        return task;
      }
    } catch (err) {
      console.error('Failed to move task:', err);
      // Refresh to revert optimistic update
      refresh();
    }
    return null;
  }, [refresh]);

  return (
    <TasksContext.Provider value={{ state, dispatch, refresh, apiCreateTask, apiUpdateTask, apiDeleteTask, apiMoveTask }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
