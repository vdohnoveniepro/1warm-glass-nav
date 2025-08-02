'use client';

import { Suspense, lazy, ComponentType, ReactNode } from 'react';
import Loading from '@/components/ui/Loading';

interface LazyComponentProps {
  importFunc: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  props?: Record<string, any>;
}

/**
 * Компонент для ленивой загрузки других компонентов
 * 
 * Использование:
 * <LazyComponent 
 *   importFunc={() => import('@/components/HeavyComponent')}
 *   props={{ someProps: value }}
 * />
 */
export default function LazyComponent({
  importFunc,
  fallback = <Loading size="small" />,
  props = {}
}: LazyComponentProps) {
  // Динамически импортируем компонент
  const DynamicComponent = lazy(importFunc);

  return (
    <Suspense fallback={fallback}>
      <DynamicComponent {...props} />
    </Suspense>
  );
}

/**
 * Создает предзагруженный ленивый компонент
 * 
 * @param importFunc Функция импорта компонента
 * @returns Компонент с ленивой загрузкой
 */
export function createLazyComponent<T = {}>(
  importFunc: () => Promise<{ default: ComponentType<T> }>
) {
  // Предзагрузка компонента
  const preloadComponent = () => {
    importFunc();
  };

  // Создаем компонент с ленивой загрузкой
  const LazyLoadedComponent = (props: T & { suspenseFallback?: ReactNode }) => {
    const { suspenseFallback = <Loading size="small" />, ...componentProps } = props as any;
    
    return (
      <LazyComponent
        importFunc={importFunc}
        fallback={suspenseFallback}
        props={componentProps}
      />
    );
  };

  // Добавляем метод предзагрузки к компоненту
  (LazyLoadedComponent as any).preload = preloadComponent;

  return LazyLoadedComponent;
}

/**
 * Примеры использования:
 * 
 * // 1. Прямое использование LazyComponent
 * <LazyComponent importFunc={() => import('@/components/HeavyComponent')} props={{ data: someData }} />
 * 
 * // 2. Создание переиспользуемого ленивого компонента
 * const LazyHeavyComponent = createLazyComponent(() => import('@/components/HeavyComponent'));
 * 
 * // Затем в компоненте:
 * <LazyHeavyComponent data={someData} />
 * 
 * // 3. Предзагрузка компонента при наведении на кнопку или другом событии
 * const handleHover = () => {
 *   LazyHeavyComponent.preload();
 * }
 * 
 * <button onMouseEnter={handleHover}>Показать компонент</button>
 */ 