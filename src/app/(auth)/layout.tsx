'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Если пользователь уже аутентифицирован, перенаправляем в кабинет
  useEffect(() => {
    if (user && !isLoading) {
      router.replace('/cabinet');
    }
  }, [user, isLoading, router]);

  // Пока проверяем аутентификацию, ничего не показываем
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-color)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[var(--accent-color)] border-r-2"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <main>{children}</main>
      
      <footer className="py-4 px-4 mt-8">
        <div className="container mx-auto text-center text-[var(--secondary-color)] text-sm">
          &copy; {new Date().getFullYear()} Центр психологической помощи "Вдохновение"
        </div>
      </footer>
    </div>
  );
} 