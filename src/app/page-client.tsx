'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

/**
 * Клиентский компонент для главной страницы
 * Используется для предотвращения автоматического перенаправления пользователей
 */
export default function HomePageClient() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Отключаем автоматическое перенаправление на кабинет
    // Это позволит пользователям оставаться на главной странице
    console.log('HomePageClient: Перенаправление на кабинет отключено');
    
    // Для отладки выводим информацию о пользователе
    if (user) {
      console.log('HomePageClient: Пользователь авторизован', {
        id: user.id,
        role: user.role,
        telegramId: user.telegramId || 'нет'
      });
    }
  }, [user, isLoading]);

  return null;
} 