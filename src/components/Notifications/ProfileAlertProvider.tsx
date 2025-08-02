'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import ProfileAlert from './ProfileAlert';

interface ProfileAlertContextType {
  showAlert: (phone?: string, email?: string) => void;
  hideAlert: () => void;
}

const ProfileAlertContext = createContext<ProfileAlertContextType | undefined>(undefined);

export const useProfileAlert = () => {
  const context = useContext(ProfileAlertContext);
  if (!context) {
    throw new Error('useProfileAlert должен использоваться внутри ProfileAlertProvider');
  }
  return context;
};

interface ProfileAlertProviderProps {
  children: ReactNode;
}

export default function ProfileAlertProvider({ children }: ProfileAlertProviderProps) {
  const [alertData, setAlertData] = useState<{ phone?: string; email?: string; visible: boolean }>({
    visible: false
  });
  const [mounted, setMounted] = useState(false);
  
  // Создаем DOM элемент для портала при монтировании
  useEffect(() => {
    setMounted(true);
    
    // Проверяем, существует ли уже контейнер для уведомлений
    let portalContainer = document.getElementById('profile-alert-portal');
    
    // Если контейнера нет, создаем его
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = 'profile-alert-portal';
      document.body.appendChild(portalContainer);
    }
    
    return () => {
      setMounted(false);
    };
  }, []);

  // showAlert теперь просто всегда показывает уведомление
  const showAlert = (phone?: string, email?: string) => {
    setAlertData({ phone, email, visible: true });
  };

  // hideAlert просто временно скрывает уведомление (например, при анимации закрытия)
  const hideAlert = () => {
    setAlertData(prev => ({ ...prev, visible: false }));
  };

  return (
    <ProfileAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {mounted && createPortal(
        alertData.visible ? (
          <ProfileAlert phone={alertData.phone} email={alertData.email} />
        ) : null,
        document.getElementById('profile-alert-portal') || document.body
      )}
    </ProfileAlertContext.Provider>
  );
} 