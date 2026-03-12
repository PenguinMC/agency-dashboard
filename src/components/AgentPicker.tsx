'use client';

import { useState, useRef, useEffect } from 'react';
import { Agent } from '@/lib/types';

interface Props {
  agents: Agent[];
  value: string;
  onChange: (agentId: string, agentName: string, agentEmoji?: string) => void;
}

export default function AgentPicker({ agents, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = agents.find((a) => a.id === value);
  const divisions = Array.from(new Set(agents.map((a) => a.division))).sort();

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.division.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-left hover:bg-white/8 transition-colors"
      >
        {selected ? (
          <>
            <span className="text-base">{selected.emoji}</span>
            <span className="flex-1 text-white">{selected.name}</span>
            <span className="text-xs text-slate-500">{selected.division}</span>
          </>
        ) : (
          <span className="text-slate-500 flex-1">Select an agent...</span>
        )}
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1421] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-white/5">
            <input
              autoFocus
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {search ? (
              filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-500 text-center">No agents found</div>
              ) : (
                filtered.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    selected={agent.id === value}
                    onSelect={() => {
                      onChange(agent.id, agent.name, agent.emoji);
                      setOpen(false);
                      setSearch('');
                    }}
                  />
                ))
              )
            ) : (
              divisions.map((div) => {
                const divAgents = agents.filter((a) => a.division === div);
                return (
                  <div key={div}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-white/2">
                      {div}
                    </div>
                    {divAgents.map((agent) => (
                      <AgentRow
                        key={agent.id}
                        agent={agent}
                        selected={agent.id === value}
                        onSelect={() => {
                          onChange(agent.id, agent.name, agent.emoji);
                          setOpen(false);
                          setSearch('');
                        }}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentRow({
  agent,
  selected,
  onSelect,
}: {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${
        selected ? 'bg-cyan-500/10' : ''
      }`}
    >
      <span className="text-base w-6 text-center">{agent.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${selected ? 'text-cyan-400' : 'text-white'}`}>
          {agent.name}
        </div>
        <div className="text-[11px] text-slate-500 truncate">{agent.description}</div>
      </div>
      {selected && (
        <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
