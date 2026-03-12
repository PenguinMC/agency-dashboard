import { NextResponse } from 'next/server';
import { getAllAgents } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/agents - list all agents
export async function GET() {
  const agents = getAllAgents();
  return NextResponse.json({ agents });
}
