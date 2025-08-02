'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageVisit } from '@/lib/track-visit';

/**
 * Компонент для отслеживания посещений страниц
 * Добавляется в layout.tsx для автоматического отслеживания всех страниц
 */
export default function PageVisitTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Если путь изменился, отправляем информацию о посещении
    if (pathname !== prevPathRef.current) {
      trackPageVisit(pathname);
      prevPathRef.current = pathname;
    }
  }, [pathname]);
  
  // Компонент не имеет визуального представления
  return null;
} 