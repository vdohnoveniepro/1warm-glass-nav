'use client';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  message?: string;
}

/**
 * Компонент для отображения индикатора загрузки
 */
export default function Loading({ 
  size = 'medium', 
  fullScreen = false,
  message = 'Загрузка...'
}: LoadingProps) {
  // Определяем размеры спиннера в зависимости от параметра size
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12', 
    large: 'w-20 h-20'
  };

  // Определяем классы для контейнера
  const containerClasses = `flex flex-col items-center justify-center ${
    fullScreen ? 'fixed inset-0 z-50 bg-base-100/80' : 'p-8'
  }`;

  return (
    <div className={containerClasses}>
      <div className={`animate-spin rounded-full border-4 border-base-200 border-t-primary ${sizeClasses[size]}`}></div>
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );
} 