'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { AppointmentStatus } from '@/models/types';
import { normalizeUserRoles } from '@/utils/user-roles';
import { FaUser, FaCalendarAlt, FaHeart, FaSignOutAlt, FaGift, FaNewspaper } from 'react-icons/fa';
import { useProfileAlert } from '@/components/Notifications/ProfileAlertProvider';

// Типы для меню
type MenuIcon = 'profile' | 'calendar' | 'favorite' | 'review' | 'settings' | 'specialists' | 'services' | 'articles';

interface MenuItem {
  title: string;
  href: string;
  icon: MenuIcon;
}

// Расширяем интерфейс User для поддержки множественных ролей
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[];
  phone: string;
  photo?: string;
  specialistId?: string;
  bonusBalance?: number;
  referralCode?: string;
  favorites?: {
    articles: string[];
    services: string[];
    specialists: string[];
  };
  avatar?: string;
  photo_url?: string;
}

function CabinetContent() {
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [upcomingAppointments, setUpcomingAppointments] = useState<number>(0);
  const [specialistData, setSpecialistData] = useState<any>(null);
  const [totalFavorites, setTotalFavorites] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [isLoadingBonus, setIsLoadingBonus] = useState(false);
  const [apiUser, setApiUser] = useState<User | null>(null);
  const { showAlert } = useProfileAlert();

  // Добавляем отладочный вывод для отслеживания состояния пользователя
  useEffect(() => {
    console.log('[Cabinet] Состояние авторизации:', { 
      isAuthenticated, 
      isLoading,
      hasUser: !!user,
      hasApiUser: !!apiUser,
      user: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.role
      } : undefined,
      apiUser: apiUser ? {
        id: apiUser.id,
        email: apiUser.email,
        firstName: apiUser.firstName,
        role: apiUser.role
      } : undefined
    });
  }, [user, apiUser, isAuthenticated, isLoading]);

  // Проверяем авторизацию через API
  useEffect(() => {
    // Если пользователь уже авторизован в контексте, не делаем запрос
    if (user) return;
    
    const checkApiAuth = async () => {
      try {
        console.log('[CabinetContent] Проверка авторизации через API...');
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          console.log('[CabinetContent] Ответ от API:', data);
          
          if (data.success && data.data && data.data.user) {
            console.log('[CabinetContent] Пользователь найден через API:', data.data.user.email);
            setApiUser(data.data.user);
          }
        }
      } catch (error) {
        console.error('[CabinetContent] Ошибка при проверке авторизации:', error);
      }
    };
    
    checkApiAuth();
  }, [user]);

  // Используем либо пользователя из контекста, либо из API
  const effectiveUser = user || apiUser;

  // Показываем уведомление, если нужно
  useEffect(() => {
    if (effectiveUser) {
      if (!effectiveUser.phone || effectiveUser.phone === '' || 
          (effectiveUser.email && effectiveUser.email.endsWith('@telegram.org'))) {
        showAlert(effectiveUser.phone, effectiveUser.email);
      }
    }
  }, [effectiveUser, showAlert]);

  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      if (!effectiveUser) return;

      try {
        // Загружаем записи используя общий API вместо /upcoming
        console.log('Загрузка записей для пользователя:', effectiveUser.id);
        const appointmentsResponse = await fetch('/api/appointments');
        
        if (!appointmentsResponse.ok) {
          console.error('Ошибка запроса записей:', await appointmentsResponse.text());
          throw new Error('Ошибка при загрузке записей');
        }
        
        const allAppointmentsData = await appointmentsResponse.json();
        console.log('Получено записей:', allAppointmentsData?.data?.length || 0);
        
        if (isSubscribed && allAppointmentsData.success && Array.isArray(allAppointmentsData.data)) {
          // Фильтруем только предстоящие записи
          const now = new Date();
          
          const upcomingAppointments = allAppointmentsData.data.filter((appointment: any) => {
            // Проверяем принадлежность записи текущему пользователю
            const isUsersAppointment = appointment.userId === effectiveUser.id;
            
            // Если запись не принадлежит пользователю, пропускаем её
            if (!isUsersAppointment) return false;
            
            // Проверяем статус (подтвержденные или ожидающие подтверждения)
            const statusOk = appointment.status === 'confirmed' || appointment.status === 'pending';
            
            // Проверяем, что дата и время в будущем
            let isUpcoming = false;
            try {
              // Используем конец записи для определения, закончилась ли она
              const endTime = appointment.endTime || appointment.timeEnd || '23:59';
              const appointmentDate = new Date(`${appointment.date}T${endTime}`);
              isUpcoming = appointmentDate > now;
              
              console.log(`Проверка записи ${appointment.id}: дата=${appointment.date}, конец=${endTime}, прошла=${!isUpcoming}, статус=${appointment.status}, пользователь=${isUsersAppointment ? 'текущий' : 'другой'}`);
            } catch (error) {
              console.error(`Ошибка при проверке даты записи:`, error);
            }
            
            const shouldCount = statusOk && isUpcoming && isUsersAppointment;
            if (shouldCount) {
              console.log(`Запись ${appointment.id} будет учтена в счетчике`);
            }
            
            return shouldCount;
          });
          
          console.log(`Предстоящих записей для пользователя ${effectiveUser.id}: ${upcomingAppointments.length}`);
          setUpcomingAppointments(upcomingAppointments.length);
          
          // Выводим информацию о предстоящих записях для отладки
          if (upcomingAppointments.length > 0) {
            console.log('Предстоящие записи:');
            upcomingAppointments.forEach((appointment: any, index: number) => {
              console.log(`${index + 1}. ID: ${appointment.id}, Дата: ${appointment.date}, Время: ${appointment.startTime || appointment.timeStart}-${appointment.endTime || appointment.timeEnd}, Статус: ${appointment.status}, Пользователь: ${appointment.userId}`);
            });
          }
        }

        // Если пользователь специалист, загружаем данные специалиста
        if (effectiveUser.specialistId) {
          const specialistResponse = await fetch('/api/auth/me/specialist');
          if (!specialistResponse.ok) {
            throw new Error('Ошибка при загрузке данных специалиста');
          }
          const specialistData = await specialistResponse.json();
          if (isSubscribed && specialistData.success) {
            setSpecialistData(specialistData.data);
          }
        }
        
        // Загружаем данные о избранном из специального API endpoint
        try {
          console.log('Загрузка данных о избранном...');
          const favoritesResponse = await fetch('/api/auth/me/favorites');
          
          if (!favoritesResponse.ok) {
            console.error('Ошибка при загрузке избранного:', await favoritesResponse.text());
            throw new Error('Ошибка при загрузке избранного');
          }
          
          const favoritesData = await favoritesResponse.json();
          console.log('[Cabinet] Ответ API избранного:', favoritesData);
          
          if (isSubscribed && favoritesData.success) {
            // Получаем общее количество избранных элементов
            // Проверяем оба возможных формата ответа API
            let total = 0;
            
            if (favoritesData.data) {
              // Новый формат с данными на верхнем уровне
              if (typeof favoritesData.data.total === 'number') {
                total = favoritesData.data.total;
                console.log(`[Cabinet] Получено избранных элементов (новый формат): ${total}`);
              } 
              // Старый формат с данными в поле counts
              else if (favoritesData.data.counts && typeof favoritesData.data.counts.total === 'number') {
                total = favoritesData.data.counts.total;
                console.log(`[Cabinet] Получено избранных элементов (старый формат): ${total}`);
              }
              // Если нет total, пробуем посчитать из отдельных счетчиков
              else {
                const articlesCount = favoritesData.data.articlesCount || favoritesData.data.counts?.articlesCount || 0;
                const servicesCount = favoritesData.data.servicesCount || favoritesData.data.counts?.servicesCount || 0;
                const specialistsCount = favoritesData.data.specialistsCount || favoritesData.data.counts?.specialistsCount || 0;
                total = articlesCount + servicesCount + specialistsCount;
                console.log(`[Cabinet] Посчитано избранных элементов: ${total} (статьи: ${articlesCount}, услуги: ${servicesCount}, специалисты: ${specialistsCount})`);
              }
            }
            
            console.log(`[Cabinet] Итоговое количество избранных элементов: ${total}`);
            console.log('[Cabinet] Детали избранного:', favoritesData.data);
            
            setTotalFavorites(total);
          }
        } catch (favError) {
          console.error('Ошибка при загрузке данных о избранном:', favError);
          
          // Если запрос к новому API не удался, используем данные из user объекта
          // для обратной совместимости
          console.log('Используем данные из объекта user для подсчета избранного');
          const favoriteArticles = effectiveUser.favorites?.articles?.length || 0;
          const favoriteServices = effectiveUser.favorites?.services?.length || 0;
          const favoriteSpecialists = effectiveUser.favorites?.specialists?.length || 0;
          const total = favoriteArticles + favoriteServices + favoriteSpecialists;
          console.log(`[Cabinet] Посчитано избранных элементов из объекта user: ${total} (статьи: ${favoriteArticles}, услуги: ${favoriteServices}, специалисты: ${favoriteSpecialists})`);
          setTotalFavorites(total);
        }

        // Загружаем баланс бонусов пользователя
        await fetchBonusBalance();
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    };

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [effectiveUser]);
  
  // Функция для загрузки баланса бонусов
  const fetchBonusBalance = async () => {
    if (!effectiveUser) return;
    
    setIsLoadingBonus(true);
    try {
      const response = await fetch(`/api/bonus/user/${effectiveUser.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBonusBalance(data.balance);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке баланса бонусов:', error);
    } finally {
      setIsLoadingBonus(false);
    }
  };
  
  // Добавляем обработчик события для обновления баланса бонусов при создании новой записи
  useEffect(() => {
    // Функция обработчик события создания новой записи
    const handleAppointmentCreated = () => {
      console.log('[Cabinet] Получено событие appointmentCreated, обновляем баланс бонусов');
      fetchBonusBalance();
    };
    
    // Регистрируем обработчик события
    window.addEventListener('appointmentCreated', handleAppointmentCreated);
    
    // Отписываемся при размонтировании компонента
    return () => {
      window.removeEventListener('appointmentCreated', handleAppointmentCreated);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }

  // Если нет ни пользователя из контекста, ни из API - перенаправляем на страницу входа
  if (!effectiveUser) {
    router.replace('/login');
    return null;
  }

  // Получаем все роли пользователя с помощью функции нормализации
  const userRoles = normalizeUserRoles(effectiveUser).map(role => role.toUpperCase());
  
  const isAdmin = userRoles.includes('ADMIN');
  const isSpecialist = userRoles.includes('SPECIALIST') || isAdmin;

  // Определяем пункты меню пользователя
  const menuItems: MenuItem[] = [
    { title: 'Мои записи', href: '/cabinet/appointments', icon: 'calendar' },
    { title: 'Избранное', href: '/cabinet/favorites', icon: 'favorite' },
    { title: 'Мои отзывы', href: '/cabinet/reviews', icon: 'review' },
    { title: 'Настройки профиля', href: '/cabinet/settings', icon: 'settings' },
  ];

  // Добавляем пункты меню для специалиста
  if (isSpecialist) {
    menuItems.push(
      { title: 'Календарь', href: '/cabinet/calendar', icon: 'calendar' },
      { title: 'Профиль специалиста', href: '/cabinet/specialist', icon: 'profile' },
      { title: 'Статьи', href: '/cabinet/articles', icon: 'articles' }
    );
  }

  // Добавляем пункт меню для администратора
  if (isAdmin) {
    menuItems.push(
      { title: 'Панель администратора', href: '/admin', icon: 'settings' }
    );
  }

  return (
    <div className="py-6 px-4 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center">
            <div className="w-20 h-20 rounded-full bg-[#48a9a6]/20 flex items-center justify-center text-[#48a9a6] text-xl font-bold overflow-hidden">
              {specialistData?.photo || effectiveUser.photo || effectiveUser.avatar || effectiveUser.photo_url ? (
                <img 
                  src={specialistData?.photo || effectiveUser.photo || effectiveUser.avatar || effectiveUser.photo_url} 
                  alt={`${specialistData?.firstName || effectiveUser.firstName} ${specialistData?.lastName || effectiveUser.lastName}`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{effectiveUser.firstName?.charAt(0) || ''}{effectiveUser.lastName?.charAt(0) || ''}</span>
              )}
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {specialistData?.firstName || effectiveUser.firstName} {specialistData?.lastName || effectiveUser.lastName}
              </h2>
              <p className="text-gray-600">{effectiveUser.email}</p>
              <div className="mt-1 space-x-2">
                {userRoles.map((role: string, index: number) => (
                  <span key={index} className="px-2 py-1 rounded-full bg-[#48a9a6]/10 text-[#48a9a6] text-xs inline-block">
                    {role === 'ADMIN' ? 'Администратор' : 
                     role === 'SPECIALIST' ? 'Специалист' : 'Пользователь'}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center mt-4 md:mt-0 space-x-2">
            <Link href="/cabinet/bonus" className="flex items-center gap-2 px-4 py-2 bg-[#48a9a6]/10 text-[#48a9a6] rounded-md hover:bg-[#48a9a6]/20">
              <FaGift />
              <span>{isLoadingBonus ? '...' : `${bonusBalance} ₽`}</span>
            </Link>
            <button 
              onClick={async () => {
                try {
                  console.log('Нажата кнопка выхода из аккаунта');
                  await logout();
                  // Очищаем localStorage для надежности
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user_data');
                  localStorage.removeItem('client_auth_token');
                  // Перенаправляем на главную страницу
                  window.location.href = '/';
                } catch (error) {
                  console.error('Ошибка при выходе:', error);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <FaSignOutAlt />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Основные пункты меню (для всех пользователей) */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3 pl-1">Основное меню</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menuItems
            .filter(item => 
              item.title === 'Мои записи' || 
              item.title === 'Избранное' || 
              item.title === 'Мои отзывы' || 
              item.title === 'Настройки профиля'
            )
            .map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center gap-2 relative"
              >
                {getMenuIcon(item.icon)}
                <span className="text-sm font-medium text-gray-700">{item.title}</span>
                
                {/* Бейдж для "Мои записи" */}
                {item.title === 'Мои записи' && upcomingAppointments > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {upcomingAppointments > 9 ? '9+' : upcomingAppointments}
                  </div>
                )}
                
                {/* Бейдж для "Избранное" */}
                {item.title === 'Избранное' && totalFavorites > 0 && (
                  <div className="absolute -top-2 -right-2 bg-[#48a9a6] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {totalFavorites > 9 ? '9+' : totalFavorites}
                  </div>
                )}
              </Link>
            ))
          }
        </div>
      </div>

      {/* Пункты меню для специалиста */}
      {isSpecialist && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3 pl-1 flex items-center">
            <svg className="w-5 h-5 text-[#48a9a6] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Специалистам
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {menuItems
              .filter(item => 
                item.title === 'Календарь' || 
                item.title === 'Профиль специалиста' ||
                item.title === 'Статьи'
              )
              .map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="bg-blue-50 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center gap-2 border-2 border-blue-100"
                >
                  {getMenuIcon(item.icon)}
                  <span className="text-sm font-medium text-gray-700">{item.title}</span>
                </Link>
              ))
            }
          </div>
        </div>
      )}

      {/* Пункт меню для администратора */}
      {isAdmin && (
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3 pl-1 flex items-center">
            <svg className="w-5 h-5 text-[#48a9a6] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Администрирование
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => {
                console.log('Нажата кнопка перехода в панель администратора');
                // Прямое перенаправление на страницу администратора
                window.location.href = '/admin';
              }}
              className="bg-gradient-to-r from-purple-100 to-indigo-100 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex flex-row items-center justify-center text-center gap-3 border-2 border-purple-200"
            >
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-base font-medium text-gray-800">Панель администратора</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getMenuIcon(icon: MenuIcon) {
  switch (icon) {
    case 'profile':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'favorite':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'review':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'specialists':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'services':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'articles':
      return (
        <svg className="w-6 h-6 text-[#48a9a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5a2 2 0 00-2 2v12a2 2 0 002 2h5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Cabinet() {
  return (
    <Suspense fallback={<div className="p-4">Загрузка...</div>}>
      {/* Добавляем компонент для проверки авторизации через API */}
      <ApiAuthChecker />
      
      <CabinetContent />
    </Suspense>
  );
}

// Компонент для проверки авторизации через API
function ApiAuthChecker() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [apiUser, setApiUser] = useState(null);
  
  useEffect(() => {
    // Если пользователь уже авторизован в контексте, ничего не делаем
    if (isAuthenticated && user) return;
    
    // Проверяем авторизацию через API
    const checkApiAuth = async () => {
      try {
        console.log('[ApiAuthChecker] Проверка авторизации через API...');
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          console.log('[ApiAuthChecker] Ответ от API:', data);
          
          if (data.success && data.data && data.data.user) {
            console.log('[ApiAuthChecker] Пользователь найден через API:', data.data.user.email);
            setApiUser(data.data.user);
            
            // Сохраняем данные в localStorage для восстановления сессии
            localStorage.setItem('user_data', JSON.stringify(data.data.user));
            if (data.data.token) {
              localStorage.setItem('auth_token', data.data.token);
            }
            
            // Перезагружаем страницу для обновления состояния авторизации
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('[ApiAuthChecker] Ошибка при проверке авторизации:', error);
      }
    };
    
    checkApiAuth();
  }, [isAuthenticated, user, isLoading]);
  
  return null;
}