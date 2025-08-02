import Image from 'next/image';
import Link from 'next/link';
import { FaCalendarAlt, FaUser, FaClock, FaStar } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import VibrateButton from '../components/ui/VibrateButton';
import { useRouter } from 'next/navigation';
import SpecialistBookingModal from './SpecialistBookingModal';

interface Service {
  id: string;
  name: string;
  color: string;
}

// Этот интерфейс соответствует данным, ожидаемым компонентом
interface SpecialistCardData {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  experience: number;
  description?: string | null;
  photo: string;
  services: Service[];
  rating?: number;
  reviewCount?: number;
}

interface SpecialistCardProps {
  specialist: SpecialistCardData;
  onBookClick?: (specialistId: string) => void;
  isCompact?: boolean;
}

// Функция для создания короткого описания
const getShortDescription = (description: string | null | undefined, maxLength: number = 150) => {
  // Проверка на null или undefined
  if (!description) return '';
  
  // Удаление HTML-тегов
  const plainText = description.replace(/<[^>]*>/g, '');
  // Ограничение длины текста
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + '...';
};

// Компонент для отображения тега услуги с цветом
const ServiceTag = ({ service }: { service: Service }) => {
  const router = useRouter();
  
  const handleServiceClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Останавливаем всплытие события, чтобы не сработал клик на карточке
    router.push(`/services/${service.id}`);
  };
  
  return (
    <span 
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:brightness-95 transition-all relative group"
      style={{ backgroundColor: `${service.color}20`, color: service.color }}
      onClick={handleServiceClick}
      title={`Перейти к услуге "${service.name}"`}
    >
      {service.name}
      <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 z-10 text-[10px] whitespace-nowrap px-2 py-1 rounded bg-gray-800 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Перейти к услуге
      </span>
    </span>
  );
};

const SpecialistCard = ({ specialist, onBookClick, isCompact = false }: SpecialistCardProps) => {
  const router = useRouter();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [imageSrc, setImageSrc] = useState('/images/photoPreview.jpg');
  
  // Устанавливаем путь к изображению один раз при загрузке компонента
  useEffect(() => {
    if (specialist.photo) {
      // Используем API-маршрут для динамической загрузки изображений
      const timestamp = new Date().getTime();
      const photoPath = specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo;
      setImageSrc(`/api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`);
      console.log(`Установлен путь к фото специалиста через API: /api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`);
    } else {
      setImageSrc('/images/photoPreview.jpg');
      console.log('Фото специалиста отсутствует, используется заглушка');
    }
  }, [specialist.photo]);
  
  // Обработчик кнопки записи
  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick(specialist.id);
    } else {
      // Открываем модальное окно вместо перехода на страницу
      setShowBookingModal(true);
    }
  };
  
  // Обработчик кнопки подробнее
  const handleDetailsClick = () => {
    router.push(`/specialists/${specialist.id}`);
  };
  
  // Обработчик для перехода к отзывам специалиста
  const handleReviewsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Переходим на страницу специалиста с хешем для прокрутки к отзывам
    router.push(`/specialists/${specialist.id}#reviews`);
    
    // Добавляем дополнительную проверку и прокрутку через JavaScript
    // для случаев, когда стандартная прокрутка по хешу не срабатывает
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        // Функция для проверки и прокрутки к элементу
        const scrollToReviews = () => {
          const reviewsSection = document.getElementById('reviews');
          if (reviewsSection) {
            reviewsSection.scrollIntoView({ behavior: 'smooth' });
            return true;
          }
          return false;
        };
        
        // Пробуем прокрутить сразу
        if (!scrollToReviews()) {
          // Если не удалось, пробуем несколько раз с увеличивающимся интервалом
          let attempts = 0;
          const maxAttempts = 10;
          
          const attemptScroll = () => {
            if (attempts < maxAttempts) {
              attempts++;
              if (!scrollToReviews()) {
                setTimeout(attemptScroll, 300 * attempts);
              }
            }
          };
          
          // Начинаем проверку через 500 мс
          setTimeout(attemptScroll, 500);
        }
      }
    }, 100);
  };
  
  // Закрытие модального окна
  const handleCloseModal = () => {
    setShowBookingModal(false);
  };
  
  return (
    <>
      <div 
        className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        onClick={(e) => {
          // Проверяем, произошел ли клик по кнопкам - если да, то ничего не делаем, чтобы не перекрывать их собственные обработчики
          const target = e.target as HTMLElement;
          const isClickOnButton = target.closest('button') || target.closest('a');
          if (!isClickOnButton) {
            handleDetailsClick();
          }
        }}
      >
        {/* Изображение с закругленными краями сверху */}
        <div className="relative w-full h-64 sm:h-80">
          <Image
            src={imageSrc}
            alt={`${specialist.firstName} ${specialist.lastName}`}
            fill
            className="object-cover rounded-t-xl"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.error(`Ошибка загрузки изображения: ${target.src}`);
              // Пробуем загрузить изображение еще раз с новым timestamp через API
              const newTimestamp = new Date().getTime();
              // Извлекаем path из URL
              const urlParams = new URLSearchParams(new URL(target.src).search);
              const photoPath = urlParams.get('path');
              
              if (photoPath) {
                target.src = `/api/images?path=${encodeURIComponent(photoPath)}&t=${newTimestamp}`;
              } else {
                // Если не удалось извлечь путь, используем оригинальный src
                const originalSrc = target.src.split('?')[0];
                target.src = `${originalSrc}?retry=${newTimestamp}`;
              }
              
              // Если повторная попытка не удалась, используем заглушку
              target.onerror = () => {
                console.error(`Повторная попытка загрузки изображения не удалась: ${target.src}`);
              target.src = '/images/photoPreview.jpg';
                target.onerror = null; // Предотвращаем бесконечный цикл
              };
            }}
            priority={true}
            unoptimized={true}
            loading="eager"
            onLoad={(e) => {
              console.log(`Изображение специалиста успешно загружено: ${specialist.firstName} ${specialist.lastName}`);
            }}
          />
        </div>
        
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-xl font-bold mb-1 text-[#4B4B4B]">
            {specialist.firstName} {specialist.lastName}
          </h3>
          
          <p className="text-[#48a9a6] font-medium mb-2">{specialist.position}</p>
          
          {/* Рейтинг и количество отзывов */}
          {(specialist.rating !== undefined || specialist.reviewCount !== undefined) && (
            <div 
              className="flex items-center mb-3 text-sm cursor-pointer hover:text-[#48a9a6] transition-colors"
              onClick={handleReviewsClick}
            >
              <div className="flex items-center mr-2">
                <FaStar className="text-yellow-400 mr-1" />
                <span>{specialist.rating?.toFixed(1) || '0.0'}</span>
              </div>
              <span className="text-gray-500 hover:underline">
                {specialist.reviewCount || 0} отзывов
              </span>
            </div>
          )}
          
          {!isCompact && specialist.description && (
            <p className="text-gray-600 mb-4 text-sm flex-grow">
              {getShortDescription(specialist.description)}
            </p>
          )}
          
          {specialist.services && specialist.services.length > 0 && specialist.services.some(service => service.name) && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-xs text-[#4B4B4B]">Услуги:</h4>
              <div className="flex flex-wrap gap-1">
                {specialist.services.filter(service => service.name).slice(0, isCompact ? 3 : 5).map(service => (
                  <ServiceTag key={service.id} service={service} />
                ))}
                {specialist.services.filter(service => service.name).length > (isCompact ? 3 : 5) && (
                  <span 
                    className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDetailsClick();
                    }}
                    title="Показать все услуги специалиста"
                  >
                    +{specialist.services.filter(service => service.name).length - (isCompact ? 3 : 5)} ещё
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Кнопки действий */}
          <div className="mt-auto flex gap-2">
            <VibrateButton 
              className="text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1 font-medium flex items-center justify-center"
              onClick={handleBookClick}
            >
              <FaCalendarAlt className="mr-1.5" />
              Записаться
            </VibrateButton>
            <VibrateButton 
              className="text-center py-2 px-4 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors flex-1 font-medium"
              onClick={handleDetailsClick}
            >
              Подробнее
            </VibrateButton>
          </div>
        </div>
      </div>
      
      {/* Модальное окно для записи к специалисту */}
      <SpecialistBookingModal
        isOpen={showBookingModal}
        onClose={handleCloseModal}
        specialistId={specialist.id}
      />
    </>
  );
};

export default SpecialistCard; 