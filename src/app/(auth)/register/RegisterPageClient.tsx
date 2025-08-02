'use client';

import Link from 'next/link';
import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { FaEnvelope, FaLock, FaUser, FaPhone, FaUserPlus } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

function RegisterFormContent() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showTelegramBanner, setShowTelegramBanner] = useState(false);
  const [telegramMiniAppUrl, setTelegramMiniAppUrl] = useState('');

  // Извлекаем реферальный код из URL-параметров и проверяем, запущены ли мы в Telegram
  useEffect(() => {
    // Проверка, запущено ли приложение в Telegram Mini App
    const isTelegramWebApp = 
      typeof window !== 'undefined' && 
      window.Telegram && 
      window.Telegram.WebApp;
    
    const isTelegramBrowser = 
      typeof navigator !== 'undefined' && 
      /Telegram/i.test(navigator.userAgent);
      
    console.log('Определение платформы:', { 
      isTelegramWebApp,
      isTelegramBrowser,
      userAgent: navigator.userAgent
    });
    
    // Если мы в Telegram Browser, но не в Mini App, показываем баннер
    if (isTelegramBrowser && !isTelegramWebApp) {
      console.log('Обнаружен браузер Telegram, но не Mini App - показываем баннер');
      
      // Устанавливаем URL для мини-аппа (реальный URL с параметрами)
      const miniAppUrl = `https://t.me/vdohnoveniepro_bot/shop`;
      setTelegramMiniAppUrl(miniAppUrl);
      setShowTelegramBanner(true);
    }
      
    // Проверяем localStorage на наличие сохраненного реферального кода из Telegram
    if (typeof window !== 'undefined') {
      const telegramRefCode = localStorage.getItem('telegram_referral_code');
      if (telegramRefCode) {
        console.log('Найден реферальный код из Telegram в localStorage:', telegramRefCode);
        setReferralCode(telegramRefCode);
        
        // Очищаем код, чтобы он использовался только один раз
        localStorage.removeItem('telegram_referral_code');
      }
    }
      
    // Извлекаем реферальный код из URL если его ещё нет
    if (!referralCode) {
    const code = searchParams.get('ref');
    if (code) {
      setReferralCode(code);
      console.log('Найден реферальный код в URL:', code);
    }
    }
    
    // Если у нас есть реферальный код (из любого источника), очистим куки авторизации
    if (referralCode) {
      // Если у нас реферальный код, очистим куки авторизации и localStorage,
      // чтобы предотвратить автоматическую авторизацию под чужим аккаунтом
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'client_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'user_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'telegram_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }, [searchParams, referralCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (
      !formData.email || 
      !formData.password || 
      !formData.passwordConfirm || 
      !formData.firstName || 
      !formData.lastName || 
      !formData.phone
    ) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('Отправка данных для регистрации с реферальным кодом:', referralCode);
      
      // Создаем объект с данными пользователя и добавляем реферальный код
      const userData = {
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm, 
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        referralCode: referralCode // Добавляем реферальный код
      };
      
      // Отправляем запрос на регистрацию напрямую
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Регистрация выполнена успешно!');
        console.log('Регистрация успешна, данные пользователя:', data.data?.user);
        
        // Сохраняем токен авторизации, если он есть в ответе
        if (data.data?.token) {
          console.log('Сохраняем токен авторизации в localStorage');
          localStorage.setItem('auth_token', data.data.token);
        } else {
          console.log('ВНИМАНИЕ: Токен авторизации отсутствует в ответе от сервера');
        }
        
        // Делаем паузу перед перенаправлением
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Для надежности делаем прямой вход с имеющимися данными
        console.log('Выполняем дополнительный прямой вход после регистрации');
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: formData.email, 
              password: formData.password 
            }),
            credentials: 'include' // Важно для работы с куками
          });
          
          const loginData = await loginResponse.json();
          
          if (loginResponse.ok && loginData.success) {
            console.log('Вход выполнен успешно, получен токен:', !!loginData.data?.token);
            
            // Сохраняем токен в localStorage
            if (loginData.data?.token) {
              localStorage.setItem('auth_token', loginData.data.token);
              console.log('Токен сохранен в localStorage');
            }
            
            // Делаем еще одну паузу для надежности
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Принудительно перенаправляем на страницу кабинета, заменяя историю браузера
            console.log('Перенаправляем на страницу кабинета');
            window.location.href = '/cabinet';
          } else {
            console.error('Ошибка при автоматическом входе:', loginData.error);
            // Пробуем еще раз перенаправить
            window.location.href = '/cabinet';
          }
        } catch (loginErr) {
          console.error('Критическая ошибка при попытке входа:', loginErr);
          // В случае ошибки всё равно перенаправляем
          window.location.href = '/cabinet';
        }
      } else {
        setError(data.error || 'Ошибка при регистрации. Пожалуйста, попробуйте позже.');
        toast.error(data.error || 'Ошибка при регистрации');
      }
    } catch (err) {
      console.error('Ошибка при регистрации:', err);
      setError('Произошла непредвиденная ошибка');
      toast.error('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-[#EAE8E1] pt-1 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#48a9a6] rounded-full flex items-center justify-center">
              <FaUserPlus className="text-white text-3xl" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">
            Регистрация
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Создайте аккаунт для доступа к услугам центра "Вдохновение"
          </p>
          {referralCode && (
            <div className="mt-2 p-2 bg-green-50 text-green-700 rounded-lg text-sm">
              Вы регистрируетесь по реферальной ссылке с кодом: <strong>{referralCode}</strong>
            </div>
          )}
          {showTelegramBanner && (
            <div className="mt-3 p-3 border border-blue-100 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-blue-800 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 496 512">
                  <path fill="currentColor" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z"/>
                </svg>
                <span className="font-medium">Откройте в Telegram App</span>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                Для полного доступа ко всем функциям, включая уведомления и быструю авторизацию, 
                откройте приложение в Telegram
              </p>
              <a 
                href={telegramMiniAppUrl} 
                className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Открыть в Telegram
              </a>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Имя
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6] sm:text-sm"
                  placeholder="Иван"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Фамилия
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6] sm:text-sm"
                  placeholder="Иванов"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Электронная почта
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6] sm:text-sm"
                placeholder="example@mail.ru"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Телефон
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaPhone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6] sm:text-sm"
                placeholder="+7 (XXX) XXX-XX-XX"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Пароль
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6] sm:text-sm"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
              Подтверждение пароля
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6] sm:text-sm"
                placeholder="Повторите пароль"
                value={formData.passwordConfirm}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#48a9a6] hover:bg-[#3d908e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#48a9a6] ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="font-medium text-[#48a9a6] hover:text-[#3d908e]">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-start justify-center bg-[#EAE8E1] pt-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#48a9a6] rounded-full flex items-center justify-center">
              <FaUserPlus className="text-white text-3xl" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">
            Регистрация
          </h2>
          <div className="mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
            <p className="mt-4 text-gray-600">Загрузка формы регистрации...</p>
          </div>
        </div>
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
} 