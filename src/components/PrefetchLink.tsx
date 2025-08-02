'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

interface PrefetchLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  prefetchOnVisible?: boolean;
  prefetchOnHover?: boolean;
  prefetchDistance?: number;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Расширенный компонент Link с предзагрузкой и дополнительными возможностями
 * 
 * Особенности:
 * 1. Автоматическая предзагрузка страницы при попадании ссылки в область видимости
 * 2. Предзагрузка при наведении мыши
 * 3. Добавление класса для активной ссылки
 * 4. Событие клика с возможностью отмены навигации
 */
export default function PrefetchLink({
  children,
  href,
  className = '',
  activeClassName = 'active',
  prefetchOnVisible = true,
  prefetchOnHover = true,
  prefetchDistance = 200, // px
  onClick,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [isPrefetched, setIsPrefetched] = useState(false);
  
  // Проверяем, активна ли ссылка
  const isActive = 
    pathname === href.toString() || 
    pathname === props.as || 
    pathname?.startsWith(href.toString() + '/');
  
  // Добавляем класс активной ссылки если нужно
  const linkClass = `${className} ${isActive ? activeClassName : ''}`.trim();
  
  // Предзагрузка страницы
  const prefetchPage = () => {
    if (!isPrefetched) {
      const hrefStr = href.toString();
      
      // Не предзагружаем внешние ссылки или якоря
      if (hrefStr.startsWith('/') && !hrefStr.startsWith('/#') && !hrefStr.startsWith('#')) {
        router.prefetch(hrefStr);
        setIsPrefetched(true);
      }
    }
  };
  
  // Обработчик наведения
  const handleMouseEnter = () => {
    if (prefetchOnHover) {
      prefetchPage();
    }
  };
  
  // Обработчик клика
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
      
      // Если предотвращено действие по умолчанию, не переходим по ссылке
      if (e.defaultPrevented) {
        e.preventDefault();
      }
    }
  };
  
  // Настраиваем IntersectionObserver для отслеживания видимости
  useEffect(() => {
    if (!prefetchOnVisible || !linkRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Если ссылка видна, предзагружаем целевую страницу
        if (entries[0].isIntersecting && !isPrefetched) {
          prefetchPage();
          observer.disconnect();
        }
      },
      { 
        rootMargin: `${prefetchDistance}px`,
        threshold: 0.1
      }
    );
    
    observer.observe(linkRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [prefetchOnVisible, href, isPrefetched]);
  
  return (
    <Link
      ref={linkRef}
      href={href}
      className={linkClass}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
} 