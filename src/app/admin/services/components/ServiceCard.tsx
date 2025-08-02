import React, { useState, useEffect } from 'react';
import { Service } from '@/types/service';
import { FaEdit, FaArchive, FaTrash, FaUndoAlt, FaClock, FaUser } from 'react-icons/fa';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

type ServiceCardProps = {
  service: Service;
  onEdit: (service: Service) => void;
  onUpdateStatus: (service: Service, isArchived: boolean) => void;
  onDelete?: (service: Service) => void;
};

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit, onUpdateStatus, onDelete }) => {
  // Функция для архивации/восстановления услуги
  const handleUpdateStatus = async () => {
    try {
      // Вызываем функцию обновления статуса
      await onUpdateStatus(service, !service.isArchived);
    } catch (error: any) {
      console.error('Ошибка при изменении статуса услуги:', error);
      toast.error(error?.message || 'Не удалось изменить статус услуги');
    }
  };

  // Функция для удаления услуги
  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (window.confirm('Вы уверены, что хотите удалить эту услугу? Это действие нельзя отменить.')) {
      try {
        await onDelete(service);
      } catch (error) {
        console.error('Ошибка при удалении услуги:', error);
        toast.error('Не удалось удалить услугу');
      }
    }
  };

  // Функция для генерации URL изображения через API
  const getImageUrl = (path: string) => {
    if (!path) return '/images/photoPreview.jpg';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    
    // Если путь начинается с /uploads/, извлекаем только последнюю часть
    const imagePath = path.startsWith('/uploads/') 
      ? path.split('/').slice(-2).join('/') // Получаем "services/filename.jpg"
      : path;
    
    // Добавляем timestamp для предотвращения кэширования
    const timestamp = new Date().getTime();
    return `/api/images?path=${encodeURIComponent(imagePath)}&t=${timestamp}`;
  };

  // Форматирование длительности
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} мин`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
  };

  // Получаем очищенный от HTML-тегов текст описания
  const getCleanDescription = () => {
    const text = service.shortDescription || service.description || '';
    
    try {
      // Создаем временный div для удаления HTML-тегов
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Ограничиваем длину текста
      return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;
    } catch (e) {
      // Если DOM недоступен (серверный рендеринг), используем регулярное выражение
      const cleanText = text.replace(/<[^>]*>/g, '');
      return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;
    }
  };

  // Состояние для хранения URL изображений специалистов
  const [specialistImages, setSpecialistImages] = useState<{[key: string]: string}>({});
  
  // Устанавливаем пути к изображениям при загрузке компонента
  useEffect(() => {
    const imageUrls: {[key: string]: string} = {};
    
    if (service.specialists) {
      service.specialists.forEach(specialist => {
        if (specialist.photo) {
          const timestamp = new Date().getTime();
          const photoPath = specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo;
          imageUrls[specialist.id] = `/api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`;
        } else {
          imageUrls[specialist.id] = '/images/photoPreview.jpg';
        }
      });
    }
    
    setSpecialistImages(imageUrls);
  }, [service.specialists]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl border border-gray-100">
      {/* Статус архивации */}
      {service.isArchived && (
        <div className="absolute top-3 right-3 z-10 bg-gray-800 text-white text-xs py-1 px-3 rounded-full flex items-center">
          <FaArchive className="mr-1" /> 
          <span>В архиве</span>
        </div>
      )}

      {/* Изображение услуги */}
      <div className="relative h-40 sm:h-52 w-full">
        {service.image ? (
          <Image
            src={getImageUrl(service.image)}
            alt={service.name}
            fill
            className="object-cover"
            unoptimized={true}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">Нет изображения</span>
          </div>
        )}
        
        {/* Цветная полоса */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: service.color || '#e0e0e0' }}
        />
      </div>
      
      {/* Информация об услуге */}
      <div className="p-3 flex-1 flex flex-col">
          <h3 className="text-lg sm:text-xl font-semibold">{service.name}</h3>
        <div className="flex items-center mt-1 gap-2">
            <span className="font-bold text-md sm:text-lg text-blue-600">
              {formatCurrency(service.price)}
            </span>
            <span className="flex items-center text-xs sm:text-sm text-gray-500">
              <FaClock className="mr-1" /> {formatDuration(service.duration)}
            </span>
        </div>
        
        {/* Специалисты */}
        {service.specialists && service.specialists.length > 0 && (
          <div className="mt-2">
            <h4 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 flex items-center">
              <FaUser className="mr-1" /> Специалисты:
            </h4>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {service.specialists.map(specialist => (
                <div 
                  key={specialist.id} 
                  className="flex items-center bg-gray-100 rounded-full px-2 sm:px-3 py-0.5 text-xs sm:text-sm"
                >
                  {specialist.photo && (
                    <div className="relative w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden mr-1">
                      <Image 
                        src={specialistImages[specialist.id]} 
                        alt={`${specialist.firstName} ${specialist.lastName}`}
                        fill
                        className="object-cover"
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/photoPreview.jpg';
                        }}
                      />
                    </div>
                  )}
                  <span>{specialist.firstName} {specialist.lastName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Описание */}
        <p className="text-gray-600 text-xs sm:text-sm mt-2 flex-1">
          {getCleanDescription()}
        </p>
        
        {/* Кнопки действий */}
        <div className="flex flex-wrap justify-end gap-1 sm:gap-2 mt-2">
          {/* Кнопка редактирования */}
          <button
            onClick={() => onEdit(service)}
            className="px-2 sm:px-3 py-1 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center text-xs sm:text-sm"
            title="Редактировать"
          >
            <FaEdit className="mr-1" /> 
            <span className="hidden xs:inline">Редактировать</span>
            <span className="inline xs:hidden">Ред.</span>
          </button>
          
          {/* Кнопка архивации/восстановления */}
          <button
            onClick={handleUpdateStatus}
            className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-colors flex items-center text-xs sm:text-sm ${
              service.isArchived 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            }`}
            title={service.isArchived ? 'Восстановить из архива' : 'Отправить в архив'}
          >
            {service.isArchived ? <FaUndoAlt className="mr-1" /> : <FaArchive className="mr-1" />}
            {service.isArchived ? (
              <>
                <span className="hidden xs:inline">Восстановить</span>
                <span className="inline xs:hidden">Восст.</span>
              </>
            ) : (
              <>
                <span className="hidden xs:inline">В архив</span>
                <span className="inline xs:hidden">Архив</span>
              </>
            )}
          </button>
          
          {/* Кнопка удаления (только для архивных услуг) */}
          {service.isArchived && onDelete && (
            <button
              onClick={handleDelete}
              className="px-2 sm:px-3 py-1 sm:py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center text-xs sm:text-sm"
              title="Удалить услугу"
            >
              <FaTrash className="mr-1" />
              <span className="hidden xs:inline">Удалить</span>
              <span className="inline xs:hidden">Удал.</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard; 