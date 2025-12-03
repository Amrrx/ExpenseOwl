import type { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { PageTransition } from './PageTransition';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="pt-16 pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
