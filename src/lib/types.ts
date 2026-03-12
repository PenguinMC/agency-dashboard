export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  output?: string;
  logs: LogEntry[];
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  division: string;
  description: string;
}

export interface TasksState {
  tasks: Task[];
  agents: Agent[];
}

export type TasksAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_AGENTS'; payload: Agent[] }
  | { type: 'CREATE_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> & { id: string } }
  | { type: 'DELETE_TASK'; payload: { id: string } }
  | { type: 'MOVE_TASK'; payload: { id: string; status: TaskStatus } };
