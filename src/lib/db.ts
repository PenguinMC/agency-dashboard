import Database from 'better-sqlite3';
import path from 'path';
import { Task, Agent, LogEntry, TaskStatus, TaskPriority } from './types';
import { AGENTS } from './mockData';

const DB_PATH = path.join(process.env.HOME || '/tmp', '.openclaw', 'agency-dashboard.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initDb(_db);
  }
  return _db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      agent_id TEXT DEFAULT '',
      agent_name TEXT DEFAULT '',
      agent_emoji TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      output TEXT,
      logs TEXT DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
  `);
}

// --- Task CRUD ---

export function getAllTasks(): Task[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
  return rows.map(rowToTask);
}

export function getTasksByStatus(status: TaskStatus): Task[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC').all(status) as Array<Record<string, unknown>>;
  return rows.map(rowToTask);
}

export function getTaskById(id: string): Task | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToTask(row) : null;
}

export function createTask(task: Task): Task {
  const db = getDb();
  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, agent_id, agent_name, agent_emoji, created_at, updated_at, completed_at, output, logs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.title,
    task.description,
    task.status,
    task.priority,
    task.agent_id,
    task.agent_name,
    task.agent_emoji,
    task.created_at,
    task.updated_at,
    task.completed_at || null,
    task.output || null,
    JSON.stringify(task.logs)
  );
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const db = getDb();
  const existing = getTaskById(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
  if (updates.status === 'done' && !merged.completed_at) {
    merged.completed_at = new Date().toISOString();
  }

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      agent_id = ?, agent_name = ?, agent_emoji = ?,
      updated_at = ?, completed_at = ?, output = ?, logs = ?
    WHERE id = ?
  `).run(
    merged.title,
    merged.description,
    merged.status,
    merged.priority,
    merged.agent_id,
    merged.agent_name,
    merged.agent_emoji,
    merged.updated_at,
    merged.completed_at || null,
    merged.output || null,
    JSON.stringify(merged.logs),
    id
  );

  return merged;
}

export function deleteTask(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function addTaskLog(id: string, log: LogEntry): Task | null {
  const task = getTaskById(id);
  if (!task) return null;
  const logs = [...task.logs, log];
  return updateTask(id, { logs });
}

// --- Agents ---

export function getAllAgents(): Agent[] {
  return AGENTS;
}

export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find(a => a.id === id);
}

// --- Helpers ---

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    agent_id: (row.agent_id as string) || '',
    agent_name: (row.agent_name as string) || '',
    agent_emoji: (row.agent_emoji as string) || '',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    completed_at: (row.completed_at as string) || undefined,
    output: (row.output as string) || undefined,
    logs: JSON.parse((row.logs as string) || '[]'),
  };
}
