'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Task, TasksState, TasksAction, TaskStatus } from './types';
import { INITIAL_TASKS, AGENTS } from './mockData';

function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
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
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, {
    tasks: INITIAL_TASKS,
    agents: AGENTS,
  });

  return (
    <TasksContext.Provider value={{ state, dispatch }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
