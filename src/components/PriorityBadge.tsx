import { TaskPriority } from '@/lib/types';

const config: Record<TaskPriority, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  high:   { label: 'High',   className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  medium: { label: 'Medium', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  low:    { label: 'Low',    className: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

export default function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, className } = config[priority];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${className}`}>
      {label}
    </span>
  );
}
