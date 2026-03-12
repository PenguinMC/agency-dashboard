import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask, addTaskLog } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tasks/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTaskById(id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ task });
}

// PATCH /api/tasks/:id - update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // If body has a "log" field, append to logs
    if (body.log) {
      const log = {
        id: `l-${Date.now()}`,
        timestamp: new Date().toISOString(),
        message: body.log.message || body.log,
        type: body.log.type || 'info',
      };
      const task = addTaskLog(id, log);
      if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ task });
    }

    const task = updateTask(id, body);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ task });
  } catch (err) {
    console.error('PATCH /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteTask(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
