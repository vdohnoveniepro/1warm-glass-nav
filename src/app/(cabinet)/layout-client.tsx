'use client';

import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ClientCabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Если пользователь не аутентифицирован, перенаправляем на страницу входа
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Пока проверяем аутентификацию, показываем загрузку
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-color)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[var(--accent-color)] border-r-2"></div>
      </div>
    );
  }

  // Если пользователь не аутентифицирован, ничего не показываем
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen pb-16">
      <main className="container mx-auto px-4 py-6">
        <div className="card">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
} 