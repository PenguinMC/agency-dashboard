'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTasks } from '@/lib/store';
import TaskModal from '@/components/TaskModal';
import { Task } from '@/lib/types';

const KanbanBoard = dynamic(() => import('@/components/KanbanBoard'), { ssr: false });

export default function DashboardPage() {
  const { state, apiCreateTask } = useTasks();
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const taskCounts = {
    total: state.tasks.length,
    active: state.tasks.filter((t) => t.status === 'in_progress').length,
    review: state.tasks.filter((t) => t.status === 'review').length,
    done: state.tasks.filter((t) => t.status === 'done').length,
  };

  async function handleCreateTask(data: Partial<Task>) {
    await apiCreateTask(data);
  }

  const taskAgents = Array.from(
    new Map(state.tasks.map((t) => [t.agent_id, { id: t.agent_id, name: t.agent_name }])).values()
  ).filter((a) => a.id);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-white/5 bg-[#04080f]/50">
        <div className="flex items-center gap-6 mb-4 flex-wrap">
          <div>
            <div className="text-2xl font-bold text-white tabular-nums">{taskCounts.total}</div>
            <div className="text-xs text-slate-500">Total Tasks</div>
          </div>
          <div className="w-px h-8 bg-white/5 hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-cyan-400 tabular-nums">{taskCounts.active}</div>
            <div className="text-xs text-slate-500">In Progress</div>
          </div>
          <div className="w-px h-8 bg-white/5 hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-violet-400 tabular-nums">{taskCounts.review}</div>
            <div className="text-xs text-slate-500">In Review</div>
          </div>
          <div className="w-px h-8 bg-white/5 hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-green-400 tabular-nums">{taskCounts.done}</div>
            <div className="text-xs text-slate-500">Completed</div>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => setNewTaskOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-sm font-semibold text-black transition-colors shadow-lg shadow-cyan-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-colors w-52"
            />
          </div>

          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 outline-none focus:border-cyan-500/50 transition-colors"
          >
            <option value="" className="bg-[#0d1421]">All Agents</option>
            {taskAgents.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#0d1421]">{a.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 outline-none focus:border-cyan-500/50 transition-colors"
          >
            <option value="" className="bg-[#0d1421]">All Priorities</option>
            <option value="urgent" className="bg-[#0d1421]">Urgent</option>
            <option value="high" className="bg-[#0d1421]">High</option>
            <option value="medium" className="bg-[#0d1421]">Medium</option>
            <option value="low" className="bg-[#0d1421]">Low</option>
          </select>

          {(search || filterAgent || filterPriority) && (
            <button
              onClick={() => { setSearch(''); setFilterAgent(''); setFilterPriority(''); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto px-6 pt-4">
        <KanbanBoard
          search={search}
          filterAgent={filterAgent}
          filterPriority={filterPriority}
        />
      </div>

      {newTaskOpen && (
        <TaskModal
          agents={state.agents}
          onSave={handleCreateTask}
          onClose={() => setNewTaskOpen(false)}
        />
      )}
    </div>
  );
}
