'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import UserAvatar from '@/components/UserAvatar';

// Интерфейс для списка специалистов
interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  description: string;
  userId?: string;
}

export default function ProfileClient() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();
  
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isLoadingSpecialists, setIsLoadingSpecialists] = useState(false);
  const [linkedSpecialist, setLinkedSpecialist] = useState<Specialist | null>(null);
  const [showSpecialistsList, setShowSpecialistsList] = useState(false);
  
  // Состояние для формы изменения email и пароля
  const [showEmailPasswordForm, setShowEmailPasswordForm] = useState(false);
  const [emailPasswordForm, setEmailPasswordForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // Инициализация формы данными пользователя
  useEffect(() => {
    if (user && user.email) {
      setEmailPasswordForm(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user]);
  
  // Загрузка данных о специалистах
  useEffect(() => {
    const loadSpecialists = async () => {
      if (!user) return;
      
      setIsLoadingSpecialists(true);
      try {
        // Получаем список всех специалистов
        const response = await fetch('/api/specialists');
        const data = await response.json();
        
        if (data.success) {
          setSpecialists(data.data || []);
        } else {
          console.error('Ошибка при загрузке специалистов:', data.error);
        }
      } catch (error) {
        console.error('Ошибка при загрузке специалистов:', error);
      } finally {
        setIsLoadingSpecialists(false);
      }
    };
    
    loadSpecialists();
  }, [user]);
  
  // Загрузка данных о привязанном специалисте
  useEffect(() => {
    const loadLinkedSpecialist = async () => {
      if (!user || !user.specialistId) {
        setLinkedSpecialist(null);
        return;
      }
      
      try {
        const response = await fetch(`/api/specialists/${user.specialistId}`);
        const data = await response.json();
        
        if (data.success) {
          setLinkedSpecialist(data.data);
        } else {
          console.error('Ошибка при загрузке данных специалиста:', data.error);
          setLinkedSpecialist(null);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных специалиста:', error);
        setLinkedSpecialist(null);
      }
    };
    
    loadLinkedSpecialist();
  }, [user]);
  
  // Добавляем отладочный вывод для проверки данных пользователя
  useEffect(() => {
    if (user) {
      console.log('[ProfileClient] Данные пользователя:', { 
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        avatar: user.avatar,
        photo_url: (user as any).photo_url,
        telegramId: (user as any).telegramId
      });
    }
  }, [user]);
  
  // Привязка специалиста
  const handleLinkSpecialist = async (specialistId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/auth/me/link-specialist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ specialistId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Профиль специалиста успешно привязан к вашему аккаунту');
        refreshUser(); // Обновляем данные пользователя
        setShowSpecialistsList(false);
      } else {
        toast.error(`Ошибка при привязке специалиста: ${data.error}`);
      }
    } catch (error) {
      console.error('Ошибка при привязке специалиста:', error);
      toast.error('Произошла ошибка при привязке специалиста');
    }
  };
  
  // Отвязка специалиста
  const handleUnlinkSpecialist = async () => {
    if (!user || !linkedSpecialist) return;
    
    if (!confirm('Вы уверены, что хотите отвязать профиль специалиста от вашего аккаунта?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/auth/me/link-specialist', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Профиль специалиста успешно отвязан от вашего аккаунта');
        refreshUser(); // Обновляем данные пользователя
        setLinkedSpecialist(null);
      } else {
        toast.error(`Ошибка при отвязке специалиста: ${data.error}`);
      }
    } catch (error) {
      console.error('Ошибка при отвязке специалиста:', error);
      toast.error('Произошла ошибка при отвязке специалиста');
    }
  };
  
  // Обработчик изменения полей формы email/пароля
  const handleEmailPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailPasswordForm(prev => ({ ...prev, [name]: value }));
    
    // Очищаем ошибку при изменении поля
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Валидация формы email/пароля
  const validateEmailPasswordForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Валидация email
    if (!emailPasswordForm.email) {
      errors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(emailPasswordForm.email)) {
      errors.email = 'Введите корректный email';
    }
    
    // Валидация пароля только если он был введен
    if (emailPasswordForm.password) {
      if (emailPasswordForm.password.length < 4) {
        errors.password = 'Пароль должен содержать не менее 4 символов';
      }
      
      if (emailPasswordForm.password !== emailPasswordForm.confirmPassword) {
        errors.confirmPassword = 'Пароли не совпадают';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Сохранение email и пароля
  const handleSaveEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailPasswordForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/auth/me/update-credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailPasswordForm.email,
          password: emailPasswordForm.password || undefined // Отправляем пароль только если он был введен
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Данные для входа успешно обновлены');
        refreshUser(); // Обновляем данные пользователя
        setShowEmailPasswordForm(false);
        
        // Очищаем пароли из формы
        setEmailPasswordForm(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      } else {
        toast.error(`Ошибка при обновлении данных: ${data.message || data.error}`);
      }
    } catch (error) {
      console.error('Ошибка при обновлении данных для входа:', error);
      toast.error('Произошла ошибка при обновлении данных для входа');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  if (!user) {
    router.replace('/login');
    return null;
  }
  
  // Определяем роль пользователя
  const userRole = user.role.toLowerCase();
  // Проверяем, авторизован ли пользователь через Telegram
  const isTelegramUser = Boolean((user as any).telegramId);
  
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Профиль пользователя</h1>
        <Link href="/cabinet" className="text-[#48a9a6] hover:underline">
          ← Назад в кабинет
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-6">
          <UserAvatar user={user} size="lg" />
          <div className="ml-4">
            <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
            <p className="text-gray-600">{user.email || 'Email не указан'}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-full bg-[#48a9a6]/10 text-[#48a9a6] text-xs">
                {userRole === 'admin' && 'Администратор'}
                {userRole === 'specialist' && 'Специалист'}
                {userRole === 'user' && 'Пользователь'}
              </span>
              {isTelegramUser && (
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-600 text-xs">
                  Telegram
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Контактная информация</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="mb-3">
                <span className="block text-sm text-gray-500">Имя</span>
                <span className="font-medium">{user.firstName}</span>
              </div>
              <div className="mb-3">
                <span className="block text-sm text-gray-500">Фамилия</span>
                <span className="font-medium">{user.lastName}</span>
              </div>
              <div className="mb-3">
                <span className="block text-sm text-gray-500">Email</span>
                <span className="font-medium">{user.email || 'Не указан'}</span>
              </div>
              <div className="mb-3">
                <span className="block text-sm text-gray-500">Телефон</span>
                <span className="font-medium">{user.phone || 'Не указан'}</span>
              </div>
              
              {/* Кнопка для установки/изменения email и пароля */}
              <button
                onClick={() => setShowEmailPasswordForm(true)}
                className="mt-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                {user.email ? 'Изменить email/пароль' : 'Установить email и пароль'}
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Профиль специалиста</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {linkedSpecialist ? (
                <div>
                  <div className="flex items-center mb-3">
                    <UserAvatar 
                      user={{
                        firstName: linkedSpecialist.firstName,
                        lastName: linkedSpecialist.lastName,
                        photo: linkedSpecialist.photo
                      }} 
                      size="sm"
                    />
                    <div className="ml-3">
                      <p className="font-medium">{linkedSpecialist.firstName} {linkedSpecialist.lastName}</p>
                      <p className="text-sm text-gray-500">Специалист центра</p>
                    </div>
                  </div>
                  
                  <div className="flex mt-4 space-x-3">
                    <Link 
                      href={`/specialists/${linkedSpecialist.id}`} 
                      className="px-3 py-1.5 rounded-md bg-[#48a9a6] text-white text-sm hover:bg-[#48a9a6]/90"
                    >
                      Просмотреть
                    </Link>
                    <Link 
                      href="/cabinet/specialist" 
                      className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 text-sm hover:bg-gray-200"
                    >
                      Редактировать
                    </Link>
                    <button 
                      onClick={handleUnlinkSpecialist}
                      className="px-3 py-1.5 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-200"
                    >
                      Отвязать
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-4">У вас еще нет привязанного профиля специалиста</p>
                  <button
                    onClick={() => setShowSpecialistsList(true)}
                    className="px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#48a9a6]/90"
                  >
                    Привязать профиль
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Модальное окно для выбора специалиста */}
      {showSpecialistsList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Выберите профиль специалиста</h2>
              <button 
                onClick={() => setShowSpecialistsList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              {isLoadingSpecialists ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#48a9a6] border-r-2"></div>
                </div>
              ) : specialists.length > 0 ? (
                <div className="space-y-4">
                  {specialists
                    .filter(spec => !spec.userId || spec.userId === user.id)
                    .map(specialist => (
                      <div 
                        key={specialist.id} 
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <UserAvatar 
                          user={{
                            firstName: specialist.firstName,
                            lastName: specialist.lastName,
                            photo: specialist.photo
                          }} 
                          size="sm"
                        />
                        <div className="ml-3 flex-grow">
                          <h3 className="font-medium">{specialist.firstName} {specialist.lastName}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{specialist.description}</p>
                        </div>
                        <button
                          onClick={() => handleLinkSpecialist(specialist.id)}
                          className="px-3 py-1.5 bg-[#48a9a6] text-white rounded-md hover:bg-[#48a9a6]/90 text-sm"
                        >
                          Привязать
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Нет доступных профилей специалистов для привязки</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно для установки/изменения email и пароля */}
      {showEmailPasswordForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {user.email ? 'Изменить email и пароль' : 'Установить email и пароль'}
              </h2>
              <button 
                onClick={() => setShowEmailPasswordForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSaveEmailPassword} className="p-4">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={emailPasswordForm.email}
                  onChange={handleEmailPasswordChange}
                  className={`w-full px-3 py-2 border rounded-md ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Введите email"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {user.email ? 'Новый пароль (оставьте пустым, если не хотите менять)' : 'Пароль'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={emailPasswordForm.password}
                  onChange={handleEmailPasswordChange}
                  className={`w-full px-3 py-2 border rounded-md ${formErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Введите пароль"
                />
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Подтверждение пароля
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={emailPasswordForm.confirmPassword}
                  onChange={handleEmailPasswordChange}
                  className={`w-full px-3 py-2 border rounded-md ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Повторите пароль"
                />
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
                )}
              </div>
              
              {isTelegramUser && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
                  <p>Установка email и пароля позволит вам входить в аккаунт как через Telegram, так и через форму входа на сайте.</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEmailPasswordForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#48a9a6]/90 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Сохранение...
                    </span>
                  ) : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
