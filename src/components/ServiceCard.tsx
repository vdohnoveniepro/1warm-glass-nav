import Image from 'next/image';
import Link from 'next/link';
import { FaRubleSign, FaClock, FaCalendarCheck } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import BookingModal from '@/components/BookingModal';

interface Service {
  id: string;
  name: string;
  description?: string | null;
  shortDescription?: string;
  image: string;
  price: number;
  duration: number;
  color: string;
  specialists: {
    id: string;
    firstName: string;
    lastName: string;
    photo: string;
  }[];
  order: number;
}

interface ServiceCardProps {
  service: Service;
}

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

// Форматирование длительности
const formatDuration = (minutes: number) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч${mins > 0 ? ` ${mins} мин` : ''}`;
  }
  return `${minutes} мин`;
};

const ServiceCard = ({ service }: ServiceCardProps) => {
  const router = useRouter();
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Состояние для хранения URL изображений специалистов
  const [specialistImages, setSpecialistImages] = useState<{[key: string]: string}>({});
  
  // Устанавливаем пути к изображениям при загрузке компонента
  useEffect(() => {
    const imageUrls: {[key: string]: string} = {};
    
    service.specialists.forEach(specialist => {
      if (specialist.photo) {
        const timestamp = new Date().getTime();
        const photoPath = specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo;
        imageUrls[specialist.id] = `/api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`;
      } else {
        imageUrls[specialist.id] = '/images/photoPreview.jpg';
      }
    });
    
    setSpecialistImages(imageUrls);
  }, [service.specialists]);
  
  // Используем краткое описание, если оно есть, иначе создаем его из полного описания
  const shortDesc = service.shortDescription || (service.description ? getShortDescription(service.description) : '');
  
  // Обработчик клика на карточку
  const handleCardClick = () => {
    router.push(`/services/${service.id}`);
  };
  
  // Обработчик клика на специалиста
  const handleSpecialistClick = (e: React.MouseEvent, specialistId: string) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    router.push(`/specialists/${specialistId}`);
  };
  
  // Открытие модального окна бронирования
  const openBookingModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    setShowBookingModal(true);
  };
  
  // Закрытие модального окна бронирования
  const closeBookingModal = () => {
    setShowBookingModal(false);
  };
  
  return (
    <>
      <div 
        className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300"
        onClick={handleCardClick}
      >
        {/* Изображение с закругленными краями сверху */}
        <div className="relative w-full h-64 sm:h-56 md:h-60">
          <Image
            src={getImageUrl(service.image)}
            alt={service.name}
            fill
            className="object-cover rounded-t-xl"
            unoptimized={true}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/photoPreview.jpg';
            }}
          />
        </div>
        
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-xl font-bold mb-2 text-[#4B4B4B]">{service.name}</h3>
          
          <div className="mb-3 flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <FaRubleSign size={12} className="mr-1" />
              <span>{formatPrice(service.price)}</span>
            </div>
            <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <FaClock size={12} className="mr-1" />
              <span>{formatDuration(service.duration)}</span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4 text-sm flex-grow">
            {shortDesc}
          </p>
          
          {service.specialists.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-sm text-[#4B4B4B]">Специалисты:</h4>
              <div className="flex flex-wrap gap-2">
                {service.specialists.slice(0, 3).map(specialist => (
                  <div 
                    key={specialist.id} 
                    className="flex items-center gap-1 bg-gray-50 rounded-full px-2 py-1 hover:bg-gray-100"
                    onClick={(e) => handleSpecialistClick(e, specialist.id)}
                  >
                    <div className="relative w-5 h-5 rounded-full overflow-hidden bg-[#48a9a6]/20">
                      {specialistImages[specialist.id] ? (
                        <Image 
                          src={specialistImages[specialist.id]}
                          alt={`${specialist.firstName} ${specialist.lastName}`}
                          width={20}
                          height={20}
                          className="object-cover"
                          unoptimized={true}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/photoPreview.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#48a9a6] text-xs">
                          {specialist.firstName ? specialist.firstName.charAt(0) : '?'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs">{specialist.firstName} {specialist.lastName}</span>
                  </div>
                ))}
                {service.specialists.length > 3 && (
                  <span className="text-xs text-gray-500">+{service.specialists.length - 3} ещё</span>
                )}
              </div>
            </div>
          )}
          
          {/* Кнопки действий */}
          <div className="mt-auto flex gap-2">
            <button 
              className="text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1 font-medium flex items-center justify-center"
              onClick={openBookingModal}
            >
              <FaCalendarCheck className="mr-1.5" />
              Записаться
            </button>
            <button 
              className="text-center py-2 px-4 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors flex-1 font-medium"
              onClick={(e) => {
                e.stopPropagation(); // Предотвращаем конфликт с кликом по всей карточке
                router.push(`/services/${service.id}`);
              }}
            >
              Подробнее
            </button>
          </div>
        </div>
      </div>
      
      {/* Модальное окно бронирования */}
      {showBookingModal && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={closeBookingModal} 
          service={service} 
        />
      )}
    </>
  );
};

export default ServiceCard; 