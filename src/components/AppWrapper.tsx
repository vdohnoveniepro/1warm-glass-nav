'use client';

import { Suspense } from 'react';

interface AppWrapperProps {
  children: React.ReactNode;
}

/**
 * Компонент-обертка для всего приложения
 * Оборачивает содержимое в Suspense для корректной работы useSearchParams в Next.js 15
 */
export default function AppWrapper({ children }: AppWrapperProps) {
  return (
    <Suspense fallback={null}>
      {children}
    </Suspense>
  );
} 
