'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTasks } from '@/lib/store';

export default function Header() {
  const pathname = usePathname();
  const { state } = useTasks();
  const activeCount = state.tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'review'
  ).length;

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/agents', label: 'Agents' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#04080f]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
            A
          </div>
          <span className="font-semibold text-white text-sm tracking-tight hidden sm:block">
            Agency Dashboard
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {activeCount} active
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
            P
          </div>
        </div>
      </div>
    </header>
  );
}
