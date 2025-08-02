'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { FaTimesCircle, FaInfoCircle, FaEnvelope, FaPhoneAlt } from 'react-icons/fa';
import Link from 'next/link';

interface UserProfileNotificationProps {
  onClose: () => void;
  missingFields: {
    email: boolean;
    phone: boolean;
  };
}

const UserProfileNotification: React.FC<UserProfileNotificationProps> = ({ onClose, missingFields }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Анимация появления
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Функция закрытия с анимацией
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-50 flex items-center justify-center px-4 py-4">
      <div 
        className={`rounded-xl backdrop-blur-xl shadow-2xl w-full max-w-lg transition-all duration-300 ${
          isVisible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform -translate-y-4'
        }`}
        style={{ 
          backgroundColor: 'rgba(59, 130, 246, 0.4)', // Увеличена прозрачность стекла
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <FaInfoCircle className="h-4 w-4 text-white" />
            </div>
            <div className="ml-2 flex-1">
              <p className="text-sm font-semibold text-white">
                Заполните профиль
              </p>
              <p className="mt-1 text-xs text-white/90">
                Для бронирования услуг необходимо заполнить:
              </p>
              <div className="mt-1.5 space-y-1 text-xs text-white/90">
                {missingFields.email && (
                  <div className="flex items-center">
                    <FaEnvelope className="mr-1.5 h-3 w-3" />
                    <span>Email-адрес</span>
                  </div>
                )}
                {missingFields.phone && (
                  <div className="flex items-center">
                    <FaPhoneAlt className="mr-1.5 h-3 w-3" />
                    <span>Номер телефона</span>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <Link
                  href="/cabinet/settings"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-white"
                >
                  Настройки профиля
                </Link>
              </div>
            </div>
            <div className="ml-2 flex-shrink-0 flex">
              <button
                onClick={handleClose}
                className="bg-transparent rounded-full p-1 inline-flex text-white hover:text-blue-200 focus:outline-none focus:ring-1 focus:ring-white"
              >
                <span className="sr-only">Закрыть</span>
                <FaTimesCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileNotification; 