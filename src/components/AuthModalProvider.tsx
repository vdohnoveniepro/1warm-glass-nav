'use client';

import { useEffect } from 'react';
import { useAuthModalStore } from '../lib/AuthContext';
import LoginModal from './LoginModal';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';

const AuthModalProvider = () => {
  const { isOpen, returnUrl, onSuccess, close } = useAuthModalStore();
  const router = useRouter();
  const { refreshUser } = useAuth();
  
  // Добавляем отладочные логи
  useEffect(() => {
    console.log('[AuthModalProvider] Состояние модального окна:', { isOpen, returnUrl });
  }, [isOpen, returnUrl]);
  
  // Обработчик успешной авторизации
  const handleSuccess = async () => {
    console.log('[AuthModalProvider] Успешная авторизация, закрываем модальное окно');
    
    // Обновляем данные пользователя
    await refreshUser();
    
    // Закрываем модальное окно
    close();
    
    // Если есть callback, вызываем его
    if (onSuccess) {
      console.log('[AuthModalProvider] Вызываем callback onSuccess');
      onSuccess();
    }
    
    // Если есть returnUrl и он отличается от текущего пути, перенаправляем на него
    if (returnUrl) {
      const currentPath = window.location.pathname;
      console.log('[AuthModalProvider] Проверка путей:', { returnUrl, currentPath });
      
      // Проверяем, совпадает ли returnUrl с текущим путем
      // Если совпадает, то не делаем перенаправление, чтобы остаться на текущей позиции страницы
      if (returnUrl !== currentPath) {
        console.log('[AuthModalProvider] Перенаправляем на:', returnUrl);
        router.push(returnUrl);
      } else {
        console.log('[AuthModalProvider] Пользователь остается на текущей странице');
      }
    }
  };
  
  return (
    <>
      {isOpen && (
        <LoginModal 
          isOpen={isOpen} 
          onClose={close} 
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

export default AuthModalProvider; 