'use client';

import React, { useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { FaChevronLeft } from 'react-icons/fa';
import AdminLayout from '@/components/AdminLayout';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Проверяем доступ к админке один раз при загрузке страницы
  useEffect(() => {
    if (!isLoading) {
      console.log('AdminLayout: Проверка доступа к админке');
      console.log('AdminLayout: Пользователь:', user ? `${user.email} (${user.role})` : 'не авторизован');
    
      // Если пользователь не авторизован, перенаправляем на страницу входа
      if (!user) {
        console.log('AdminLayout: Перенаправление на страницу входа');
        router.push('/login');
        toast.error('Для доступа к панели администратора необходимо авторизоваться');
        return;
      }
      
      // Проверяем роль пользователя
      const userRole = (user.role || '').toLowerCase();
      console.log('AdminLayout: Роль пользователя:', userRole);
      
      // Разрешаем доступ пользователям с ролью admin
      if (userRole === 'admin') {
        console.log('AdminLayout: Доступ разрешен для администратора');
        return;
      }
      
      // Если роль не admin, перенаправляем на главную страницу
      console.log('AdminLayout: Доступ запрещен, перенаправление на главную страницу');
      router.push('/');
      toast.error('У вас нет доступа к панели администратора');
    }
  }, [user, isLoading, router]);

  // Пока идет загрузка данных пользователя, показываем индикатор загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#EAE8E1]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
      </div>
    );
  }

  // Если пользователь не авторизован, не показываем содержимое
  if (!user) {
    return null;
  }

  // Проверяем роль пользователя
  const userRole = (user.role || '').toLowerCase();
  
  // Показываем содержимое только для пользователей с ролью admin
  if (userRole !== 'admin') {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
} 