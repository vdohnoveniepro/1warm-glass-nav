'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileAlert } from './ProfileAlertProvider';

interface ProfileAlertProps {
  phone?: string;
  email?: string;
}

export default function ProfileAlert({ phone, email }: ProfileAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { hideAlert } = useProfileAlert();
  const alertRef = useRef<HTMLDivElement>(null);

  // Проверяем, нужно ли показывать уведомление
  const shouldShowAlert =
    (!phone || phone === '' || (email && email.endsWith('@telegram.org'))) &&
    !dismissed;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(shouldShowAlert);
    }, 300);
    return () => clearTimeout(timer);
  }, [shouldShowAlert]);

  // После закрытия уведомления полностью убираем его из DOM
  if (!shouldShowAlert && !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setDismissed(true);
      hideAlert();
    }, 300);
  };

  // Определяем текст уведомления в зависимости от ситуации
  const getMessage = () => {
    const noPhone = !phone || phone === '';
    const autoEmail = email && email.endsWith('@telegram.org');
    if (noPhone && autoEmail) {
      return `Для бронирования услуг необходимо указать номер телефона и изменить автоматическую почту (${email}) на вашу реальную, чтобы получать уведомления о записях и новостях.`;
    } else if (noPhone) {
      return 'Для бронирования услуг необходимо указать номер телефона в вашем профиле.';
    } else if (autoEmail) {
      return `Вам присвоена автоматическая почта (${email}). Рекомендуем изменить её на вашу реальную, чтобы получать уведомления о записях и новостях.`;
    }
    return '';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={alertRef}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="backdrop-blur-md bg-blue-500/40 text-white p-3 md:p-4 rounded-b-lg md:rounded-b-xl shadow-lg border border-blue-400/30 relative"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            margin: '0 auto',
            zIndex: 9999,
            minWidth: '280px',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-white hover:text-blue-200 transition-colors"
            aria-label="Закрыть уведомление"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-2">
              <svg className="h-5 w-5 text-blue-100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-medium mb-0.5">Заполните профиль</h3>
              <p className="text-xs md:text-sm text-blue-100">
                {getMessage()}
              </p>
              <div className="mt-1.5 md:mt-2">
                <Link
                  href="/cabinet/settings"
                  className="inline-flex items-center px-3 py-1 md:px-3 md:py-1.5 bg-white text-blue-600 rounded-lg font-medium text-xs hover:bg-blue-50 transition-colors"
                >
                  Перейти в настройки
                  <svg className="ml-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 