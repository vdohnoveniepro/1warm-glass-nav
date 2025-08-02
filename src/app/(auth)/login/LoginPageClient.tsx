'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/Toast';
import { FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import dynamic from 'next/dynamic';

// Динамический импорт компонента TelegramLoginButton
const TelegramLoginButton = dynamic(() => import('@/components/TelegramLoginButton'), {
  ssr: false,
  loading: () => <div className="w-full h-10 bg-gray-200 animate-pulse rounded-md"></div>
});

function LoginPageClientContent() {
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();
  const { login, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const redirectTo = searchParams.get('redirectTo') || '/cabinet';
  
  // Обработка авторизации через Telegram
  useEffect(() => {
    const telegramAuth = searchParams.get('telegramAuth');
    const telegramDataParam = searchParams.get('telegramData');
    
    if (telegramAuth === 'true' && telegramDataParam) {
      try {
        const telegramData = JSON.parse(telegramDataParam);
        console.log('Получены данные для авторизации через Telegram:', telegramData);
        
        // Отправляем запрос на авторизацию через Telegram
        const handleTelegramAuth = async () => {
          setIsLoading(true);
          try {
            const response = await fetch('/api/auth/telegram', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(telegramData),
              credentials: 'include',
            });
            
            const data = await response.json();
            
            if (data.success) {
              toast.success('Вход через Telegram выполнен успешно');
              // Обновляем страницу для применения авторизации
              window.location.href = redirectTo;
            } else {
              toast.error('Ошибка при входе через Telegram');
            }
          } catch (error) {
            console.error('Ошибка при авторизации через Telegram:', error);
            toast.error('Произошла ошибка при авторизации через Telegram');
          } finally {
            setIsLoading(false);
          }
        };
        
        handleTelegramAuth();
      } catch (error) {
        console.error('Ошибка при обработке данных Telegram:', error);
      }
    }
  }, [searchParams, redirectTo]);
  
  useEffect(() => {
    // Если пользователь уже авторизован, перенаправляем его
    if (user) {
      router.replace(redirectTo);
    }
    
    // Проверяем, есть ли сообщение в URL параметрах
    const message = searchParams.get('message');
    if (message) {
      toast.info(decodeURIComponent(message));
    }
  }, [user, router, redirectTo, searchParams]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      setIsLoading(true);
      const success = await login(email, password);
      
      if (success) {
        toast.success('Вход выполнен успешно');
        router.replace(redirectTo);
      } else {
        toast.error('Неверный email или пароль');
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      toast.error('Произошла ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Вход в личный кабинет</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
            placeholder="Введите ваш email"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Пароль
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6] pr-10"
              placeholder="Введите ваш пароль"
              required
            />
            <button 
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-[#48a9a6] focus:ring-[#48a9a6] border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Запомнить меня
            </label>
          </div>
          
          <div className="text-sm">
            <Link href="/forgot-password" className="text-[#48a9a6] hover:text-[#357d7a]">
              Забыли пароль?
            </Link>
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#48a9a6] hover:bg-[#357d7a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#48a9a6] disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin mr-2" /> Вход...
              </>
            ) : (
              'Войти'
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">или</span>
          </div>
        </div>
        
        <div className="mt-6">
          <TelegramLoginButton 
            className="w-full py-3 text-lg font-medium" 
            redirectTo={redirectTo}
            text="Войти через Telegram"
          />
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-[#48a9a6] hover:text-[#357d7a] font-medium">
            Зарегистрируйтесь
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка формы входа...</p>
        </div>
      </div>
    }>
      <LoginPageClientContent />
    </Suspense>
  );
}
