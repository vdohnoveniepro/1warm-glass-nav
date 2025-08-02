'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ServiceCard from '@/components/ServiceCard';
import Image from 'next/image';
import { FaRubleSign, FaClock, FaThList, FaTh, FaFilter, FaTimes } from 'react-icons/fa';
import ServiceListItem from '@/components/ServiceListItem';

// Типы данных
type Specialist = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
};

type Service = {
  id: string;
  name: string;
  description?: string | null;
  shortDescription?: string;
  image: string;
  price: number;
  duration: number;
  color: string;
  specialists: Specialist[];
  order: number;
  isArchived?: boolean;
};

// Метаданные страницы перемещены в отдельный файл metadata.ts

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const router = useRouter();

  // Состояние для хранения URL изображений
  const [specialistImages, setSpecialistImages] = useState<{[key: string]: string}>({});
  
  // Устанавливаем пути к изображениям при загрузке компонента
  useEffect(() => {
    const imageUrls: {[key: string]: string} = {};
    
    specialists.forEach(specialist => {
      if (specialist.photo) {
        const timestamp = new Date().getTime();
        const photoPath = specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo;
        imageUrls[specialist.id] = `/api/images?path=${encodeURIComponent(photoPath)}&t=${timestamp}`;
      } else {
        imageUrls[specialist.id] = '/images/photoPreview.jpg';
      }
    });
    
    setSpecialistImages(imageUrls);
  }, [specialists]);

  // Загружаем услуги и специалистов
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загрузка услуг
        const servicesResponse = await fetch('/api/services');
        const servicesData = await servicesResponse.json();
        
        // Загрузка специалистов
        const specialistsResponse = await fetch('/api/specialists');
        const specialistsData = await specialistsResponse.json();
        
        // Проверяем формат данных и устанавливаем их
        // API теперь возвращает массивы напрямую
        const servicesArray = Array.isArray(servicesData) ? servicesData : [];
        const specialistsArray = Array.isArray(specialistsData) ? specialistsData : [];
        
        // Фильтруем только активные услуги
        const activeServices = servicesArray.filter((service: Service) => !service.isArchived);
        
        setServices(activeServices);
        setFilteredServices(activeServices);
        setSpecialists(specialistsArray);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Загружаем FAQ
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setFaqsLoading(true);
        const response = await fetch('/api/faq');
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить FAQ');
        }
        
        const data = await response.json();
        
        // API теперь возвращает массив напрямую
        if (Array.isArray(data)) {
          // Фильтруем только активные FAQ
          setFaqs(data.filter((faq: any) => faq.isActive === 1 || faq.isActive === true));
        } else {
          throw new Error('Неверный формат данных FAQ');
        }
      } catch (error) {
        console.error('Ошибка при загрузке FAQ:', error);
      } finally {
        setFaqsLoading(false);
      }
    };
    
    fetchFAQs();
  }, []);

  // Функция для изменения фильтра по специалисту
  const handleSpecialistFilter = (specialistId: string) => {
    if (selectedSpecialist === specialistId) {
      // Если тот же специалист выбран повторно, убираем фильтр
      setSelectedSpecialist(null);
      setFilteredServices(services);
    } else {
      // Применяем фильтр
      setSelectedSpecialist(specialistId);
      const filtered = services.filter(service => 
        service.specialists.some(specialist => specialist.id === specialistId)
      );
      setFilteredServices(filtered);
    }
  };

  // Очистка всех фильтров
  const clearFilters = () => {
    setSelectedSpecialist(null);
    setFilteredServices(services);
  };

  // Функция форматирования цены
  const formatPrice = (price: number) => {
    if (!price || price === 0) {
      return 'Бесплатно';
    }
    return `${price.toLocaleString('ru-RU')} ₽`;
  };

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

  // Функция для форматирования длительности
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} ч${mins > 0 ? ` ${mins} мин` : ''}`;
    }
    return `${minutes} мин`;
  };

  // Функция для создания короткого описания
  const getShortDescription = (description: string | null | undefined) => {
    // Проверка на null или undefined
    if (!description) return '';
    
    // Удаление HTML-тегов
    const plainText = description.replace(/<[^>]*>/g, '');
    // Ограничение длины для списка
    if (plainText.length <= 200) return plainText;
    return plainText.substring(0, 200) + '...';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 pt-0">
      {/* Фильтры и переключатель вида */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <button 
            className="flex items-center gap-2 py-2 px-4 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <FaFilter size={14} />
            <span>Фильтр</span>
            {selectedSpecialist && <span className="inline-flex items-center justify-center bg-white text-[#48a9a6] rounded-full w-5 h-5 text-xs">1</span>}
          </button>
          
          {selectedSpecialist && (
            <button 
              className="flex items-center gap-1 py-2 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              onClick={clearFilters}
            >
              <FaTimes size={12} />
              <span>Сбросить</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 hidden sm:inline">Вид:</span>
          <button 
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setViewMode('grid')}
            title="Сетка"
          >
            <FaTh size={16} />
          </button>
          <button 
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setViewMode('list')}
            title="Список"
          >
            <FaThList size={16} />
          </button>
        </div>
      </div>
      
      {/* Информация об активных фильтрах */}
      {selectedSpecialist && !filterOpen && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-blue-700 font-medium">Применены фильтры:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedSpecialist && (
                <span className="bg-white px-2 py-1 rounded text-sm text-gray-700 border border-gray-200">
                  <span className="font-medium">Специалист:</span> {
                    specialists.find(s => s.id === selectedSpecialist)
                      ? `${specialists.find(s => s.id === selectedSpecialist)?.firstName} ${specialists.find(s => s.id === selectedSpecialist)?.lastName}`
                      : 'Выбранный специалист'
                  }
                </span>
              )}
            </div>
          </div>
          <button 
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            onClick={clearFilters}
          >
            Сбросить все
          </button>
        </div>
      )}
      
      {/* Фильтр по специалистам */}
      {filterOpen && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3 text-[#4B4B4B]">Специалисты:</h3>
          <div className="flex flex-wrap gap-2">
            {specialists.map(specialist => (
              <button
                key={specialist.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  selectedSpecialist === specialist.id 
                    ? 'bg-[#48a9a6] text-white' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleSpecialistFilter(specialist.id)}
              >
                <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[#48a9a6]/20">
                  {specialistImages[specialist.id] ? (
                    <Image 
                      src={specialistImages[specialist.id]}
                      alt={`${specialist.firstName} ${specialist.lastName}`}
                      width={24}
                      height={24}
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
                <span>{specialist.firstName} {specialist.lastName}</span>
              </button>
            ))}
            
            {specialists.length === 0 && (
              <p className="text-gray-500 text-sm">Специалисты не найдены</p>
            )}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center my-8 bg-gray-50 p-8 rounded-xl">
          <p className="text-xl text-gray-600 mb-2">
            Услуги не найдены
          </p>
          {selectedSpecialist && (
            <button 
              className="text-[#48a9a6] hover:underline"
              onClick={clearFilters}
            >
              Сбросить фильтр
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // Отображение в виде сетки карточек
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div 
              key={service.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/services/${service.id}`)}
            >
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
      ) : (
        // Режим списка
        <div className="mt-6 space-y-3">
          {filteredServices.map((service) => (
            <ServiceListItem key={service.id} service={service} />
          ))}
        </div>
      )}
      
      {/* Блок вопрос-ответ */}
      {!loading && (
        <div className="bg-gray-50 rounded-xl p-6 mt-12 shadow-sm">
          <h2 className="text-xl font-semibold text-[#48a9a6] mb-6 text-center">Часто задаваемые вопросы</h2>
          
          <div className="space-y-4">
            {faqsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#48a9a6] border-r-2"></div>
              </div>
            ) : faqs.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Список вопросов пуст
              </div>
            ) : (
              faqs.map(faq => (
                <details key={faq.id} className="group bg-white rounded-lg overflow-hidden shadow-sm">
                  <summary className="list-none flex items-center justify-between p-4 cursor-pointer font-medium text-[#4B4B4B] hover:bg-gray-50">
                    <span>{faq.question}</span>
                    <div className="border rounded-full p-1 group-open:rotate-180 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                      </svg>
                    </div>
                  </summary>
                  <div className="px-4 pb-4 text-gray-600">
                    <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  </div>
                </details>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 