import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { TasksProvider } from '@/lib/store';
import Header from '@/components/Header';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'Agency Dashboard',
  description: 'Command center for Parker to assign tasks to AI agents and monitor progress.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="bg-[#04080f] text-slate-100 antialiased min-h-screen">
        <TasksProvider>
          <Header />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
        </TasksProvider>
      </body>
    </html>
  );
}
