'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TELEGRAM_MINI_APP_URL } from '@/lib/telegram-config';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ReferralRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const [redirectMessage, setRedirectMessage] = useState('Подготовка перенаправления...');
  
  useEffect(() => {
    if (!params.code) return;
    
    const refCode = params.code as string;
    
    // Определяем, открыта ли страница в Telegram
    const isTelegramBrowser = typeof navigator !== 'undefined' && 
      /Telegram/i.test(navigator.userAgent);

    // Если открыто в Telegram, перенаправляем в мини-приложение
    if (isTelegramBrowser) {
      setRedirectMessage('Перенаправляем в Telegram мини-приложение...');
      console.log('Обнаружен браузер Telegram, перенаправляем на мини-приложение');
      
      // Создаем URL для Telegram Mini App с реф. кодом
      const miniAppUrl = `${TELEGRAM_MINI_APP_URL}?startapp=ref-${refCode}`;
      
      // Перенаправляем пользователя
      window.location.href = miniAppUrl;
    } else {
      // Если открыто в обычном браузере, перенаправляем на страницу регистрации
      setRedirectMessage('Перенаправляем на страницу регистрации...');
      console.log('Обычный браузер, перенаправляем на страницу регистрации');
      
      // Используем роутер Next.js для перенаправления
      router.push(`/register?ref=${refCode}`);
    }
  }, [params.code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EAE8E1]">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4">
          <LoadingSpinner size="lg" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Переадресация</h2>
        <p className="text-gray-600">{redirectMessage}</p>
      </div>
    </div>
  );
} 