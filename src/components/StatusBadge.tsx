import { TaskStatus } from '@/lib/types';

const config: Record<TaskStatus, { label: string; className: string; dot: string }> = {
  backlog:     { label: 'Backlog',     className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',  dot: 'bg-slate-400' },
  todo:        { label: 'To Do',       className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',    dot: 'bg-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',    dot: 'bg-cyan-400 animate-pulse' },
  review:      { label: 'Review',      className: 'bg-violet-500/15 text-violet-400 border-violet-500/30', dot: 'bg-violet-400' },
  done:        { label: 'Done',        className: 'bg-green-500/15 text-green-400 border-green-500/30',  dot: 'bg-green-400' },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className, dot } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
