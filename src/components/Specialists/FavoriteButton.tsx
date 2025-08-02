'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { FaRegHeart, FaHeart, FaSpinner } from 'react-icons/fa';
import LoginModal from '../LoginModal';

interface FavoriteButtonProps {
  specialistId: string;
  initialIsFavorite?: boolean;
  isCompact?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  specialistId, 
  initialIsFavorite = false,
  isCompact = false
}) => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Проверяем, есть ли специалист в избранном при загрузке компонента
  useEffect(() => {
    if (isAuthenticated && user?.favorites?.specialists) {
      setIsFavorite(user.favorites.specialists.includes(specialistId));
    } else {
      setIsFavorite(false);
    }
  }, [specialistId, isAuthenticated, user]);

  // Обработчик добавления/удаления из избранного
  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/favorites/specialists/${specialistId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isFavorite ? 'remove' : 'add',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsFavorite(!isFavorite);
        // Обновляем данные пользователя, чтобы синхронизировать избранное
        await refreshUser();
      } else {
        console.error('Ошибка при обновлении избранного:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при обновлении избранного:', error);
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