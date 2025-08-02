'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { FaUser, FaEdit, FaSpinner, FaImage, FaExclamationTriangle } from 'react-icons/fa';
import Link from 'next/link';
import { normalizeUserRoles } from '@/utils/user-roles';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

interface SpecialistProfile {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  avatar?: string;
  photo_url?: string;
  description: string;
  services: {
    id: string;
    name: string;
    color: string;
  }[];
}

export default function SpecialistClient() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();
  const [specialistProfile, setSpecialistProfile] = useState<SpecialistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecialistProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/me/specialist');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке профиля специалиста');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSpecialistProfile(data.data);
      } else {
        throw new Error(data.error || 'Не удалось загрузить профиль специалиста');
      }
    } catch (error) {
      console.error('Ошибка при загрузке профиля специалиста:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    // Получаем все роли пользователя и проверяем доступ с помощью функции нормализации
    const userRoles = user ? normalizeUserRoles(user).map(role => role.toUpperCase()) : [];
    
    const isSpecialist = userRoles.includes('SPECIALIST');
    const isAdmin = userRoles.includes('ADMIN');

    // Если пользователь не специалист и не админ, перенаправляем в обычный кабинет
    if (!isLoading && user && !isSpecialist && !isAdmin) {
      router.replace('/cabinet');
      return;
    }

    // Загружаем профиль специалиста только если изменился пользователь 
    // или страница загружена впервые
    if (!isLoading && user) {
      fetchSpecialistProfile();
    }
  }, [isLoading, user, router, fetchSpecialistProfile]);

  // Отображаем загрузку
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-teal-500 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // Отображаем ошибку, если есть
  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded my-4 flex items-center">
          <FaExclamationTriangle className="mr-2" />
          <span>{error}</span>
        </div>
        <div className="text-center mt-4">
          <Link
            href="/cabinet"
            className="text-teal-600 hover:text-teal-800 underline font-medium"
          >
            Вернуться в личный кабинет
          </Link>
        </div>
      </div>
    );
  }

  // Если профиль не найден
  if (!specialistProfile) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-700 px-4 py-3 rounded my-4">
          <p>Профиль специалиста не найден. Возможно, ваш аккаунт еще не связан с профилем специалиста.</p>
          <p className="mt-2">Обратитесь к администратору для настройки вашего профиля.</p>
        </div>
        <div className="text-center mt-4">
          <Link
            href="/cabinet"
            className="text-teal-600 hover:text-teal-800 underline font-medium"
          >
            Вернуться в личный кабинет
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Мой профиль специалиста</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-teal-500 p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-medium">Данные профиля</h2>
          <Link 
            href="/cabinet/specialist/edit" 
            className="bg-white text-teal-500 px-4 py-2 rounded flex items-center text-sm hover:bg-teal-100 transition-colors"
          >
            <FaEdit className="mr-2" />
            Редактировать
          </Link>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 mb-4 md:mb-0 flex flex-col items-center">
              <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-200 mb-3">
                {specialistProfile.photo || specialistProfile.avatar || specialistProfile.photo_url ? (
                  <img 
                    src={specialistProfile.photo || specialistProfile.avatar || specialistProfile.photo_url} 
                    alt={`${specialistProfile.firstName} ${specialistProfile.lastName}`} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUser className="text-gray-400 text-5xl" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 text-center">
                {specialistProfile.photo || specialistProfile.avatar || specialistProfile.photo_url ? 'Фотография профиля' : 'Фотография отсутствует'}
              </p>
            </div>
            
            <div className="w-full md:w-2/3 md:pl-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {specialistProfile.firstName} {specialistProfile.lastName}
                </h3>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Специализация</h4>
                  <div className="flex flex-wrap gap-2">
                    {specialistProfile.services && specialistProfile.services.length > 0 ? (
                      specialistProfile.services.map(service => (
                        <span 
                          key={`service-${service.id}`}
                          className="inline-block px-3 py-1 rounded-full text-sm"
                          style={{ 
                            backgroundColor: `${service.color}20`, 
                            color: service.color
                          }}
                        >
                          {service.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 italic">Нет выбранных услуг</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">О специалисте</h4>
                {specialistProfile.description ? (
                  <p className="text-gray-700 whitespace-pre-line">{specialistProfile.description}</p>
                ) : (
                  <p className="text-gray-500 italic">Описание отсутствует</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-between">
        <Link
          href="/cabinet"
          className="text-gray-600 hover:text-gray-800 flex items-center"
        >
          ← Вернуться в личный кабинет
        </Link>
        
        <Link
          href={`/specialists/${specialistProfile.id}`}
          target="_blank"
          className="text-teal-600 hover:text-teal-800 flex items-center"
        >
          Как видят клиенты →
        </Link>
      </div>
    </div>
  );
} 