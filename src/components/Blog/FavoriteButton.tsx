'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { FaRegHeart, FaHeart, FaSpinner } from 'react-icons/fa';
import LoginModal from '../LoginModal';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface FavoriteButtonProps {
  articleId: string;
  initialIsFavorite?: boolean;
  isCompact?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  articleId, 
  initialIsFavorite = false,
  isCompact = false
}) => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  
  // При изменении пользователя или ID статьи, проверяем статус избранного
  useEffect(() => {
    if (user && user.favorites) {
      // Проверяем, есть ли статья в избранном у текущего пользователя
      const isInFavorites = user.favorites.articles && 
        Array.isArray(user.favorites.articles) && 
        user.favorites.articles.includes(articleId);
      
      setIsFavorite(!!isInFavorites);
    }
  }, [user, articleId]);

  // Функция для обновления данных пользователя с повторными попытками
  const refreshUserData = useCallback(async (maxRetries = 3) => {
    console.log('[FavoriteButton] Обновление данных пользователя, попытка', retryCount + 1);
    
    try {
      const refreshResult = await refreshUser();
      console.log('[FavoriteButton] Результат обновления данных:', refreshResult);
      
      if (!refreshResult && retryCount < maxRetries) {
        // Если обновление не удалось, пробуем еще раз
        setRetryCount(prev => prev + 1);
        setTimeout(() => refreshUserData(maxRetries), 500);
      } else if (refreshResult) {
        // Если обновление успешно, сбрасываем счетчик попыток
        setRetryCount(0);
      }
    } catch (error) {
      console.error('[FavoriteButton] Ошибка при обновлении данных пользователя:', error);
      
      if (retryCount < maxRetries) {
        // Если произошла ошибка, пробуем еще раз
        setRetryCount(prev => prev + 1);
        setTimeout(() => refreshUserData(maxRetries), 500);
      }
    }
  }, [refreshUser, retryCount]);

  // Функция для переключения статуса избранного
  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setIsLoading(true);
    
    try {
      console.log(`[FavoriteButton] Отправка запроса на ${isFavorite ? 'удаление из' : 'добавление в'} избранное статьи ${articleId}`);
      
      const response = await fetch(`/api/favorites/articles/${articleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isFavorite ? 'remove' : 'add',
        }),
        credentials: 'include', // Важно для передачи куки
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[FavoriteButton] Ответ от API:`, data);
      
      if (data.success) {
        setIsFavorite(!isFavorite);
        console.log(`[FavoriteButton] Статья ${articleId} ${!isFavorite ? 'добавлена в' : 'удалена из'} избранное`);
        
        // Обновляем данные пользователя, чтобы синхронизировать избранное
        console.log('[FavoriteButton] Обновляем данные пользователя...');
        
        // Делаем несколько попыток обновления данных пользователя
        let refreshSuccess = false;
        for (let i = 0; i < 5; i++) {
          console.log(`[FavoriteButton] Попытка обновления данных пользователя #${i+1}`);
          refreshSuccess = await refreshUser();
          if (refreshSuccess) {
            console.log('[FavoriteButton] Данные пользователя успешно обновлены');
            break;
          }
          // Небольшая задержка между попытками
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!refreshSuccess) {
          console.warn('[FavoriteButton] Не удалось обновить данные пользователя после нескольких попыток');
          
          // Если не удалось обновить данные пользователя, принудительно обновляем страницу
          if (!isFavorite) { // Только если добавили в избранное
            console.log('[FavoriteButton] Принудительное обновление страницы через router.refresh()');
            router.refresh();
          }
        }
        
        // Принудительно обновляем страницу избранного, если мы находимся на ней
        if (window.location.pathname.includes('/cabinet/favorites')) {
          console.log('[FavoriteButton] Обнаружена страница избранного, обновляем через router.refresh()');
          router.refresh();
        }
        
        // Показываем уведомление пользователю
        toast.success(
          !isFavorite 
            ? 'Добавлено в избранное' 
            : 'Удалено из избранного'
        );
      } else {
        console.error('[FavoriteButton] Ошибка при обновлении избранного:', data.message);
        toast.error('Произошла ошибка при обновлении избранного. Пожалуйста, попробуйте еще раз.');
      }
    } catch (error) {
      console.error('[FavoriteButton] Ошибка при запросе к API:', error);
      toast.error('Произошла ошибка при обновлении избранного. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isCompact ? (
        <button
          onClick={toggleFavorite}
          disabled={isLoading}
          className={`w-6 h-6 flex items-center justify-center rounded-full hover:scale-110 active:scale-90 transition-all duration-200 ${
            isFavorite 
              ? 'text-[#77CFD2]' 
              : 'text-white'
          }`}
          title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
        >
          {isLoading ? (
            <FaSpinner className="animate-spin" size={14} />
          ) : isFavorite ? (
            <FaHeart size={14} />
          ) : (
            <FaRegHeart size={14} />
          )}
        </button>
      ) : (
        <button
          onClick={toggleFavorite}
          disabled={isLoading}
          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
            isFavorite 
              ? 'bg-[#48a9a6]/10 text-[#48a9a6]' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } transition-colors`}
          title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
        >
          {isLoading ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : isFavorite ? (
            <FaHeart className="mr-2 text-[#48a9a6]" />
          ) : (
            <FaRegHeart className="mr-2" />
          )}
          {isFavorite ? 'В избранном' : 'В избранное'}
        </button>
      )}
      
      {/* Модальное окно авторизации */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          // Продолжаем с добавлением в избранное после авторизации
          setTimeout(() => toggleFavorite(), 500);
        }}
      />
    </>
  );
};

export default FavoriteButton; 