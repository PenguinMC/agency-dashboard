'use client';

import { Task } from '@/lib/types';
import PriorityBadge from './PriorityBadge';
import { useRouter } from 'next/navigation';

function timeElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  return `${day}d`;
}

interface Props {
  task: Task;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: Props) {
  const router = useRouter();

  function handleClick() {
    if (onClick) {
      onClick();
    } else {
      router.push(`/task/${task.id}`);
    }
  }

  return (
    <div
      onClick={handleClick}
      className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-xl p-3.5 cursor-pointer transition-all duration-150 select-none"
    >
      {/* Priority */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <PriorityBadge priority={task.priority} />
        {task.agent_id && (
          <span className="text-sm" title={task.agent_name}>
            {/* emoji lookup via name from context is expensive; just show initials or nothing */}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-white leading-snug line-clamp-2 mb-3 group-hover:text-cyan-50 transition-colors">
        {task.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {task.agent_name ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-slate-300 shrink-0">
              {task.agent_name.charAt(0)}
            </div>
            <span className="text-[11px] text-slate-500 truncate">{task.agent_name}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-600 italic">Unassigned</span>
        )}
        <span className="text-[11px] text-slate-600 shrink-0 tabular-nums">
          {timeElapsed(task.created_at)}
        </span>
      </div>
    </div>
  );
}
