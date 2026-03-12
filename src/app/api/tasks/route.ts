import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, createTask } from '@/lib/db';
import { Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/tasks - list all tasks
export async function GET() {
  try {
    const tasks = getAllTasks();
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - create a task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const task: Task = {
      id: body.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: body.title || '',
      description: body.description || '',
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      agent_id: body.agent_id || '',
      agent_name: body.agent_name || '',
      agent_emoji: body.agent_emoji || '',
      created_at: body.created_at || now,
      updated_at: now,
      completed_at: body.completed_at,
      output: body.output,
      logs: body.logs || [{ id: `l-${Date.now()}`, timestamp: now, message: 'Task created', type: 'info' }],
    };

    const created = createTask(task);
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
