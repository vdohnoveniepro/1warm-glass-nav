'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';

interface ProfileStatus {
  isIncomplete: boolean;
  missingFields: {
    email: boolean;
    phone: boolean;
  };
}

export const useProfileCompleteness = () => {
  const { user } = useAuth();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [missingFields, setMissingFields] = useState<{email: boolean, phone: boolean}>({
    email: false,
    phone: false
  });

  // Проверяем, заполнены ли email и телефон
  const checkProfileStatus = (): ProfileStatus => {
    if (!user) return {
      isIncomplete: false,
      missingFields: { email: false, phone: false }
    };
    
    // Проверяем существование и непустоту email и телефона
    const hasEmail = user.email && typeof user.email === 'string' && user.email.trim().length > 0;
    const hasPhone = user.phone && typeof user.phone === 'string' && user.phone.trim().length > 0;
    
    // Проверяем, что email соответствует базовому формату (содержит @ и .)
    const isValidEmail = hasEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim());
    
    // Проверяем, что телефон содержит достаточно цифр (минимум 10)
    const digitsInPhone = hasPhone ? user.phone.replace(/\D/g, '').length : 0;
    const isValidPhone = digitsInPhone >= 10;
    
    const missingEmail = !isValidEmail;
    const missingPhone = !isValidPhone;
    
    console.log('[ProfileCompleteness]', { 
      hasEmail, hasPhone, isValidEmail, isValidPhone,
      missingEmail, missingPhone,
      email: user.email, phone: user.phone 
    });
    
    return {
      isIncomplete: missingEmail || missingPhone,
      missingFields: {
        email: missingEmail,
        phone: missingPhone
      }
    };
  };

  useEffect(() => {
    // Если пользователь не загружен, прекращаем выполнение
    if (!user) return;
    
    // Проверяем локальное хранилище, было ли уведомление скрыто пользователем
    const dismissedNotification = localStorage.getItem('profile_notification_dismissed');
    const dismissedTimestamp = dismissedNotification ? parseInt(dismissedNotification, 10) : 0;
    const currentTime = Date.now();
    
    // Если прошло более 24 часов с момента скрытия или уведомление не было скрыто
    const showAgain = !dismissedTimestamp || (currentTime - dismissedTimestamp > 24 * 60 * 60 * 1000);
    
    const profileStatus = checkProfileStatus();
    setMissingFields(profileStatus.missingFields);
    
    console.log('[ProfileCompleteness] Проверка состояния:', { 
      isIncomplete: profileStatus.isIncomplete, 
      missingFields: profileStatus.missingFields,
      showAgain, 
      timeSinceDismissed: dismissedTimestamp ? (currentTime - dismissedTimestamp) / 1000 / 60 / 60 + ' часов' : 'никогда не скрывалось' 
    });
    
    if (profileStatus.isIncomplete && showAgain) {
      setShowNotification(true);
    } else {
      setShowNotification(false);
    }
  }, [user]);

  const dismissNotification = () => {
    setShowNotification(false);
    setNotificationDismissed(true);
    localStorage.setItem('profile_notification_dismissed', Date.now().toString());
    console.log('[ProfileCompleteness] Уведомление скрыто пользователем');
  };

  return {
    showNotification,
    dismissNotification,
    missingFields,
    isProfileIncomplete: checkProfileStatus().isIncomplete
  };
}; 