import { LogEntry } from '@/lib/types';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

const typeConfig = {
  info:    { icon: '●', className: 'text-slate-400' },
  success: { icon: '✓', className: 'text-green-400' },
  warning: { icon: '!', className: 'text-yellow-400' },
  error:   { icon: '✕', className: 'text-red-400' },
};

export default function ActivityLog({ logs }: { logs: LogEntry[] }) {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4 text-center">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {sorted.map((log, i) => {
        const { icon, className } = typeConfig[log.type];
        return (
          <div key={log.id} className="flex gap-3 py-2.5 border-b border-white/5 last:border-0">
            <div className={`text-xs font-mono mt-0.5 w-3 shrink-0 text-center ${className}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300 leading-snug">{log.message}</p>
            </div>
            <div className="text-[11px] text-slate-500 shrink-0 tabular-nums pt-0.5">
              {formatTime(log.timestamp)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
