import { Service } from '@/models/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaRubleSign, FaClock, FaCalendarCheck, FaInfoCircle } from 'react-icons/fa';
import { useState } from 'react';
import BookingModal from '@/components/BookingModal';

// Функция для генерации URL изображения через API
const getImageUrl = (path: string) => {
  if (!path) return '/images/photoPreview.jpg';
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  
  // Если путь начинается с /uploads/, извлекаем только последнюю часть
  const imagePath = path.startsWith('/uploads/') 
    ? path.split('/').slice(-2).join('/') // Получаем "services/filename.jpg" или "specialists/filename.jpg"
    : path;
  
  // Добавляем timestamp для предотвращения кэширования
  const timestamp = new Date().getTime();
  return `/api/images?path=${encodeURIComponent(imagePath)}&t=${timestamp}`;
};

// Форматирование цены
const formatPrice = (price: number) => {
  if (!price || price === 0) {
    return 'Бесплатно';
  }
  return `${price.toLocaleString('ru-RU')} ₽`;
};

// Форматирование длительности
const formatDuration = (minutes: number) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч${mins > 0 ? ` ${mins} мин` : ''}`;
  }
  return `${minutes} мин`;
};

interface ServiceListItemProps {
  service: Service;
}

const ServiceListItem = ({ service }: ServiceListItemProps) => {
  const router = useRouter();
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Проверка наличия специалистов
  const hasSpecialists = service.specialists && service.specialists.length > 0;

  // Открытие модального окна бронирования
  const openBookingModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    if (hasSpecialists) {
      setShowBookingModal(true);
    } else {
      // Если нет специалистов, направляем на страницу услуги
      router.push(`/services/${service.id}`);
    }
  };
  
  // Закрытие модального окна бронирования
  const closeBookingModal = () => {
    setShowBookingModal(false);
  };

  return (
    <>
      <div 
        className="flex flex-wrap items-center bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-300 p-2 sm:p-3"
        onClick={() => router.push(`/services/${service.id}`)}
      >
        {/* Изображение услуги */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={getImageUrl(service.image)}
            alt={service.name}
            fill
            className="object-cover"
            unoptimized={true}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/photoPreview.jpg';
            }}
          />
        </div>
        
        {/* Название услуги */}
        <div className="ml-3 flex-grow min-w-0">
          <h3 className="text-base font-medium text-[#4B4B4B] line-clamp-1">{service.name}</h3>
          
          {/* Цена и длительность (показываем на мобильных как стеки) */}
          <div className="mt-1 flex items-center gap-2 flex-wrap sm:hidden">
            <div className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              <FaRubleSign size={10} className="mr-1" />
              <span>{formatPrice(service.price)}</span>
            </div>
            <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <FaClock size={10} className="mr-1" />
              <span>{formatDuration(service.duration)}</span>
            </div>
          </div>
        </div>
        
        {/* Цена и длительность (на десктопах показываем справа) */}
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <FaRubleSign size={10} className="mr-1" />
            <span>{formatPrice(service.price)}</span>
          </div>
          <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            <FaClock size={10} className="mr-1" />
            <span>{formatDuration(service.duration)}</span>
          </div>
        </div>
        
        {/* Кнопка записи */}
        <button
          className={`mt-2 sm:mt-0 ml-auto sm:ml-2 px-2.5 py-1.5 ${hasSpecialists ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-lg transition-colors text-xs font-medium flex items-center`}
          onClick={openBookingModal}
        >
          {hasSpecialists ? (
            <>
              <FaCalendarCheck className="mr-1" />
              Записаться
            </>
          ) : (
            <>
              <FaInfoCircle className="mr-1" />
              Подробнее
            </>
          )}
        </button>
      </div>
      
      {/* Модальное окно бронирования */}
      {showBookingModal && hasSpecialists && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={closeBookingModal} 
          service={service} 
        />
      )}
    </>
  );
};

export default ServiceListItem; 