'use client';

import { useState } from 'react';
import { useTasks } from '@/lib/store';
import { Agent } from '@/lib/types';

const DIVISION_COLORS: Record<string, string> = {
  'Engineering':       'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Marketing':         'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Sales & Revenue':   'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Data & Analytics':  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Operations':        'text-slate-400 bg-slate-500/10 border-slate-500/20',
  'Finance':           'text-green-400 bg-green-500/10 border-green-500/20',
  'AI Infrastructure': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Product':           'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'Security':          'text-red-400 bg-red-500/10 border-red-500/20',
  'QA & Testing':      'text-teal-400 bg-teal-500/10 border-teal-500/20',
  'Gaming':            'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function AgentsPage() {
  const { state } = useTasks();
  const [search, setSearch] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const divisions = Array.from(new Set(state.agents.map((a) => a.division))).sort();

  const filtered = state.agents.filter((a) => {
    if (filterDivision && a.division !== filterDivision) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.division.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = divisions.reduce<Record<string, Agent[]>>((acc, div) => {
    const agents = filtered.filter((a) => a.division === div);
    if (agents.length > 0) acc[div] = agents;
    return acc;
  }, {});

  function getAgentTaskCount(agentId: string) {
    return state.tasks.filter((t) => t.agent_id === agentId && t.status !== 'done').length;
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Agent Roster</h1>
        <p className="text-sm text-slate-500">
          {state.agents.length} agents across {divisions.length} divisions
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-colors w-56"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterDivision('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterDivision === ''
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-transparent border-white/5 text-slate-500 hover:text-white hover:border-white/15'
            }`}
          >
            All
          </button>
          {divisions.map((div) => {
            const colorClass = DIVISION_COLORS[div] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            const isActive = filterDivision === div;
            return (
              <button
                key={div}
                onClick={() => setFilterDivision(isActive ? '' : div)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  isActive ? colorClass : 'bg-transparent border-white/5 text-slate-500 hover:text-white hover:border-white/15'
                }`}
              >
                {div}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent Grid by Division */}
      <div className="space-y-10">
        {Object.entries(grouped).map(([division, agents]) => {
          const colorClass = DIVISION_COLORS[division] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';
          return (
            <div key={division}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold text-white">{division}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
                  {agents.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {agents.map((agent) => {
                  const activeCount = getAgentTaskCount(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className="group text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-xl p-4 transition-all duration-150"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="text-2xl">{agent.emoji}</div>
                        {activeCount > 0 && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/20 text-[10px] font-semibold text-cyan-400">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                            {activeCount}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm text-white group-hover:text-cyan-50 transition-colors mb-1 leading-snug">
                        {agent.name}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {agent.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          tasks={state.tasks.filter((t) => t.agent_id === selectedAgent.id)}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

function AgentDetailModal({
  agent,
  tasks,
  onClose,
}: {
  agent: Agent;
  tasks: ReturnType<typeof useTasks>['state']['tasks'];
  onClose: () => void;
}) {
  const colorClass = DIVISION_COLORS[agent.division] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0d1421] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{agent.emoji}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white mb-1">{agent.name}</h2>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
                {agent.division}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">{agent.description}</p>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b border-white/5">
          <div className="text-center">
            <div className="text-xl font-bold text-white tabular-nums">{tasks.length}</div>
            <div className="text-xs text-slate-500">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-cyan-400 tabular-nums">{activeTasks.length}</div>
            <div className="text-xs text-slate-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400 tabular-nums">{completedTasks.length}</div>
            <div className="text-xs text-slate-500">Completed</div>
          </div>
        </div>

        {/* Tasks */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    task.status === 'done' ? 'bg-green-400' :
                    task.status === 'in_progress' ? 'bg-cyan-400 animate-pulse' :
                    task.status === 'review' ? 'bg-violet-400' :
                    task.status === 'todo' ? 'bg-blue-400' : 'bg-slate-500'
                  }`} />
                  <span className="text-sm text-slate-300 flex-1 truncate">{task.title}</span>
                  <span className="text-[10px] text-slate-600 shrink-0 capitalize">
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
