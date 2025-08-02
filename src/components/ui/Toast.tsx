'use client';

import { createContext, useState, useCallback, ReactNode, useContext, useEffect } from 'react';

// Типы для сообщений
type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

// Контекст для тостов
interface ToastContextType {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Провайдер для тостов
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Добавление тоста
  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    // Автоматическое удаление
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  // Удаление тоста
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Компонент для отображения всех тостов
export function ToastContainer({ toasts = [], removeToast }: { toasts?: ToastMessage[]; removeToast?: (id: string) => void }) {
  const position = 'top-right';
  
  // Определяем классы для позиционирования
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 max-w-xs w-full`}>
      {Array.isArray(toasts) && toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} shadow-lg rounded-lg p-4 animate-slideIn ${getToastColorClass(toast.type)}`}
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center">
              {getToastIcon(toast.type)}
              <span className="ml-2">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast && removeToast(toast.id)}
              className="ml-4 text-current opacity-70 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Хук для использования тостов в компонентах
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast должен использоваться внутри ToastProvider');
  }
  return context;
}

// Вспомогательные функции
function getToastColorClass(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-green-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'warning':
      return 'bg-yellow-500 text-white';
    case 'info':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-gray-700 text-white';
  }
}

function getToastIcon(type: ToastType): ReactNode {
  switch (type) {
    case 'success':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'info':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

// Глобальные обработчики для использования вне React компонентов
interface ToastHandlers {
  addToast?: (type: ToastType, message: string, duration?: number) => void;
}

// Создаем глобальный объект для хранения ссылок на функции
export const globalToastHandlers: ToastHandlers = {};

// Создаем безопасный toastService, который НЕ использует React hooks
export const toastService = {
  success: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      if (globalToastHandlers.addToast) {
        globalToastHandlers.addToast('success', message, duration);
      } else {
        console.log('Toast service: success - ', message);
      }
    }
  },
  error: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      if (globalToastHandlers.addToast) {
        globalToastHandlers.addToast('error', message, duration);
      } else {
        console.log('Toast service: error - ', message);
      }
    }
  },
  warning: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      if (globalToastHandlers.addToast) {
        globalToastHandlers.addToast('warning', message, duration);
      } else {
        console.log('Toast service: warning - ', message);
      }
    }
  },
  info: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      if (globalToastHandlers.addToast) {
        globalToastHandlers.addToast('info', message, duration);
      } else {
        console.log('Toast service: info - ', message);
      }
    }
  }
};

// Экспортируем toast как toastService для обратной совместимости
export const toast = toastService;

// Существующий экспорт для toastService переименуем для избежания конфликтов
export { ToastContext };
export default toastService;

// Компонент для регистрации глобальных обработчиков
export function ToastRegistrar() {
  const { addToast, removeToast } = useToast();
  
  // Эффект для регистрации обработчиков при монтировании компонента
  useEffect(() => {
    // Безопасно регистрируем функции обработчиков
    if (typeof window !== 'undefined') {
      globalToastHandlers.addToast = (type, message, duration) => {
        // Вызываем внутренний addToast только если функция существует
        if (addToast) {
          addToast(type, message, duration);
        }
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        globalToastHandlers.addToast = undefined;
      }
    };
  }, [addToast, removeToast]);
  
  return null;
} 