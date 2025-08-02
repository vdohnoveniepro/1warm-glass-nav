'use client';

import { useState, useEffect, useRef } from 'react';
import Image, { ImageProps } from 'next/image';

interface LazyImageProps extends Omit<ImageProps, 'onLoad'> {
  placeholderColor?: string;
  threshold?: number;
  rootMargin?: string;
  onLoadCallback?: () => void;
}

/**
 * LazyImage - компонент для ленивой загрузки изображений
 * 
 * Загружает изображение только когда оно попадает в область видимости,
 * используя IntersectionObserver API.
 */
export default function LazyImage({
  src,
  alt,
  width,
  height,
  placeholderColor = '#e2e8f0', // Светло-серый по умолчанию
  threshold = 0.1,
  rootMargin = '200px 0px',
  onLoadCallback,
  className,
  style,
  ...props
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Настраиваем IntersectionObserver для отслеживания видимости
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold, 
        rootMargin 
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    // Очищаем observer при размонтировании
    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [threshold, rootMargin]);

  // Обработчик загрузки изображения
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoadCallback) {
      onLoadCallback();
    }
  };

  // Создаем стиль для плейсхолдера
  const placeholderStyle = {
    backgroundColor: placeholderColor,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out',
  } as const;

  // Стиль для контейнера
  const containerStyle = {
    position: 'relative',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style
  } as const;

  return (
    <div 
      ref={imgRef}
      className={className}
      style={containerStyle}
    >
      {/* Плейсхолдер */}
      <div style={placeholderStyle} />

      {/* Показываем изображение, только когда элемент в поле зрения */}
      {isVisible && (
        <Image
          src={src}
          alt={alt}
          width={typeof width === 'number' ? width : undefined}
          height={typeof height === 'number' ? height : undefined}
          fill={typeof width !== 'number' || typeof height !== 'number'}
          onLoad={handleLoad}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            objectFit: 'cover',
          }}
          {...props}
        />
      )}
    </div>
  );
} 