'use client';

import { useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

/**
 * Компонент для сброса скролла страницы при навигации в Next.js
 * Устанавливается в корневом layout и отслеживает изменения URL
 */
function ScrollToTopContent() {
  const pathname = usePathname();
  const searchParams = useSearchParamsWrapper();

  useEffect(() => {
    // При изменении маршрута (URL) сбрасываем скролл в начало страницы
    window.scrollTo(0, 0);
  }, [pathname, searchParams]);

  // Компонент не рендерит никакого интерфейса - только выполняет логику
  return null;
}

export default function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopContent />
    </Suspense>
  );
} 