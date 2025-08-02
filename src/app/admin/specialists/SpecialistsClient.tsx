'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaEye, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from '../../../components/ui/Toast';
import { useSearchParamsWrapper } from '../../../lib/hooks/useSearchParamsWrapper';

// Типы данных для специалистов и услуг
type Service = {
  id: string;
  name: string;
  color: string; // цвет для тега
  isArchived?: boolean; // флаг архивации услуги
};

type Specialist = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  description: string;
  services: Service[];
  order: number;
};

// Компонент тега услуги с разными цветами
const ServiceTag = ({ service }: { service: Service }) => {
  console.log('ServiceTag получил service:', service);
  
  // Если цвет в формате HEX, используем его напрямую, иначе применяем предопределенный класс
  if (service.color && (service.color.startsWith('#') || service.color.startsWith('rgb'))) {
    return (
      <span 
        className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
        style={{ 
          backgroundColor: `${service.color}20`,
          color: service.color
        }}
      >
        {service.name}
      </span>
    );
  }

  // Предопределенные цвета для тегов
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
    amber: 'bg-amber-100 text-amber-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    teal: 'bg-teal-100 text-teal-800',
    cyan: 'bg-cyan-100 text-cyan-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    lime: 'bg-lime-100 text-lime-800',
    sky: 'bg-sky-100 text-sky-800',
    violet: 'bg-violet-100 text-violet-800',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-800',
    rose: 'bg-rose-100 text-rose-800',
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[service.color] || 'bg-gray-100 text-gray-800'}`}>
      {service.name}
    </span>
  );
};

export default function SpecialistsClient() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [loading, setLoading] = useState(false);

  // Имитация загрузки данных с сервера
  useEffect(() => {
    // В реальном приложении здесь будет запрос к API
    const fetchSpecialists = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/specialists');
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке специалистов');
        }
        
        const result = await response.json();
        
        // Проверяем новый формат API (success и data) или старый (просто массив)
        if (result.success && Array.isArray(result.data)) {
          // Новый формат API
          console.log('Загружено специалистов:', result.data.length);
          setSpecialists(result.data);
        } else if (Array.isArray(result)) {
          // Старый формат API (совместимость)
          console.log('Загружено специалистов (старый формат):', result.length);
          setSpecialists(result);
        } else {
          // Если данные не соответствуют ожидаемому формату
          console.error('Неожиданный формат данных:', result);
          setSpecialists([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке специалистов:', error);
        // Устанавливаем пустой массив в случае ошибки
        setSpecialists([]);
      } finally {
        setIsLoaded(true);
        setLoading(false);
      }
    };
    
    // Загружаем все услуги для получения полной информации
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке услуг');
        }
        
        const data = await response.json();
        console.log('Загруженные услуги:', data);
        setAllServices(data);
      } catch (error) {
        console.error('Ошибка при загрузке услуг:', error);
        setAllServices([]);
      }
    };
    
    // Загружаем данные из API
    fetchSpecialists();
    fetchServices();
  }, []);

  // Функция для обновления услуг специалистов, убирая удаленные услуги
  const updateSpecialistsServices = () => {
    if (!specialists.length || !allServices.length) return;
    
    // Формируем массив ID существующих активных услуг
    const activeServiceIds = allServices
      .filter(service => !service.isArchived)
      .map(service => service.id);
      
    console.log('Активные услуги:', activeServiceIds);
    
    // Фильтруем услуги специалистов, оставляя только существующие активные
    const updatedSpecialists = specialists.map(specialist => {
      const validServices = specialist.services.filter(service => 
        activeServiceIds.includes(service.id)
      );
      
      return {
        ...specialist,
        services: validServices
      };
    });
    
    // Обновляем состояние, если есть изменения
    if (JSON.stringify(updatedSpecialists) !== JSON.stringify(specialists)) {
      console.log('Обновляем отображение услуг у специалистов, удаляя неактуальные услуги');
      setSpecialists(updatedSpecialists);
    }
  };
  
  // Вызываем функцию обновления услуг при изменении данных
  useEffect(() => {
    updateSpecialistsServices();
  }, [specialists, allServices]);

  // Функция для сохранения порядка специалистов
  const saveSpecialistsOrder = async (updatedSpecialists = specialists) => {
    try {
      setSavingOrder(true);
      console.log(`Сохранение порядка ${updatedSpecialists.length} специалистов...`);
      
      // Получаем токен авторизации
      const token = user ? `user_id=${user.id}` : '';
      console.log('Используем ID пользователя для авторизации:', token);
      
      // Формируем массив с данными о порядке
      const orderedIds = updatedSpecialists.map((specialist, index) => ({
        id: specialist.id,
        order: index + 1
      }));
      
      console.log('Отправка запроса на обновление порядка специалистов...');
      console.log('Данные для обновления:', JSON.stringify(orderedIds));

      const response = await fetch('/api/specialists/bulk-update-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderedIds),
        credentials: 'include',
      });
      
      // Получаем текст ответа для более подробной диагностики
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`Ошибка при сохранении порядка специалистов: ${response.status} ${response.statusText}`);
        console.error(`Ответ сервера: ${responseText}`);
        throw new Error(`Ошибка при сохранении порядка специалистов`);
      }
      
      console.log('Ответ получен, анализируем данные...');
      
      // Преобразуем текст в JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Ошибка при разборе JSON ответа:', parseError);
        console.error('Текст ответа:', responseText);
        throw new Error('Ошибка при разборе ответа сервера');
      }
      
      // Обновляем состояние компонента с новыми данными
      if (result.success && result.data) {
        console.log(`Успешно получены обновленные данные: ${result.data.length} специалистов`);
        setSpecialists(result.data);
      } else {
        console.warn('Ответ сервера не содержит успешных данных:', result);
      }

      toast.success('Порядок специалистов успешно сохранен');
      setHasOrderChanged(false);
    } catch (error) {
      console.error('Ошибка при сохранении порядка специалистов:', error);
      toast.error('Ошибка при сохранении порядка специалистов. Пожалуйста, попробуйте еще раз.');
    } finally {
      setSavingOrder(false);
    }
  };

  // Защита маршрута: только для админов
  useEffect(() => {
    if (!isLoading && user) {
      // Проверка роли администратора с учетом разных форматов
      const isAdmin = (() => {
        // Если роль - это строка
        if (typeof user.role === 'string') {
          return user.role.toLowerCase() === 'admin';
        }
        
        // Если есть массив ролей в пользовательских данных
        const userRoles = (user as any).roles;
        if (Array.isArray(userRoles)) {
          return userRoles.some(role => 
            typeof role === 'string' && role.toLowerCase() === 'admin'
          );
        }
        
        return false;
      })();
      
      if (!isAdmin) {
        toast.error('У вас нет доступа к этой странице');
        router.push('/');
      }
    } else if (!isLoading && !user) {
      // Если пользователь не авторизован, перенаправляем на страницу входа
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Функция для перемещения специалиста вверх по списку
  const moveUp = (id: string) => {
    const index = specialists.findIndex(spec => spec.id === id);
    if (index <= 0) return; // Нельзя переместить первый элемент вверх
    
    const newSpecialists = [...specialists];
    // Меняем местами текущий элемент с предыдущим
    [newSpecialists[index - 1], newSpecialists[index]] = [newSpecialists[index], newSpecialists[index - 1]];
    
    // Обновляем порядок
    const updatedSpecialists = newSpecialists.map((spec, i) => ({
      ...spec,
      order: i + 1
    }));
    
    setSpecialists(updatedSpecialists);
    setHasOrderChanged(true);
  };
  
  // Функция для перемещения специалиста вниз по списку
  const moveDown = (id: string) => {
    const index = specialists.findIndex(spec => spec.id === id);
    if (index === -1 || index >= specialists.length - 1) return; // Нельзя переместить последний элемент вниз
    
    const newSpecialists = [...specialists];
    // Меняем местами текущий элемент со следующим
    [newSpecialists[index], newSpecialists[index + 1]] = [newSpecialists[index + 1], newSpecialists[index]];
    
    // Обновляем порядок
    const updatedSpecialists = newSpecialists.map((spec, i) => ({
      ...spec,
      order: i + 1
    }));
    
    setSpecialists(updatedSpecialists);
    setHasOrderChanged(true);
  };

  // Функции для поддержки drag-and-drop
  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Необходимо для разрешения drop
  };
  
  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    
    const dragIndex = specialists.findIndex(spec => spec.id === draggingId);
    const dropIndex = specialists.findIndex(spec => spec.id === targetId);
    
    if (dragIndex === -1 || dropIndex === -1) return;
    
    // Создаем копию массива
    const newSpecialists = [...specialists];
    
    // Удаляем перетаскиваемый элемент
    const [draggedItem] = newSpecialists.splice(dragIndex, 1);
    
    // Вставляем его на новую позицию
    newSpecialists.splice(dropIndex, 0, draggedItem);
    
    // Обновляем порядок
    const updatedSpecialists = newSpecialists.map((spec, i) => ({
      ...spec,
      order: i + 1
    }));
    
    setSpecialists(updatedSpecialists);
    setHasOrderChanged(true);
    setDraggingId(null);
  };

  // Функция для удаления специалиста
  const deleteSpecialist = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого специалиста?')) {
      return;
    }
    
    try {
      console.log(`Отправка запроса на удаление специалиста с ID: ${id}`);
      
      const response = await fetch(`/api/specialists/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user ? `user_id=${user.id}` : ''}`
        },
        credentials: 'include',
      });
      
      // Получаем текст ответа для более подробной диагностики
      const responseText = await response.text();
      console.log(`Получен ответ от сервера: ${response.status} ${response.statusText}`);
      console.log(`Текст ответа: ${responseText}`);
      
      // Преобразуем текст в JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Ошибка при разборе JSON ответа:', parseError);
        throw new Error(`Не удалось разобрать ответ сервера: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error(`Ошибка при удалении специалиста: ${response.status} ${response.statusText}`);
        console.error(`Ответ сервера: ${JSON.stringify(result)}`);
        throw new Error(result?.error || 'Ошибка при удалении специалиста');
      }
      
      // Удаляем специалиста из списка
      setSpecialists(specialists.filter(spec => spec.id !== id));
      toast.success('Специалист успешно удален');
      
      // Обновляем порядок оставшихся специалистов
      const remainingSpecialists = specialists.filter(spec => spec.id !== id);
      const updatedSpecialists = remainingSpecialists.map((spec, i) => ({
        ...spec,
        order: i + 1
      }));
      
      setSpecialists(updatedSpecialists);
      setHasOrderChanged(true);
    } catch (error) {
      console.error('Ошибка при удалении специалиста:', error);
      toast.error(`Ошибка при удалении специалиста: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Если идет загрузка авторизации, показываем индикатор загрузки
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление специалистами</h1>
        <Link 
          href="/admin/specialists/add" 
          className="bg-[#48a9a6] hover:bg-[#357d7a] text-white py-2 px-4 rounded flex items-center"
        >
          <FaPlus className="mr-2" /> Добавить специалиста
        </Link>
      </div>
      
      <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        ← Вернуться в панель управления
      </Link>
      
      {/* Кнопка сохранения порядка */}
      {hasOrderChanged && (
        <div className="bg-blue-50 p-4 rounded-md mb-6 flex justify-between items-center">
          <p className="text-blue-700">Порядок специалистов был изменен. Не забудьте сохранить изменения.</p>
          <button
            onClick={() => saveSpecialistsOrder()}
            disabled={savingOrder}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center disabled:opacity-50"
          >
            {savingOrder ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              'Сохранить порядок'
            )}
          </button>
        </div>
      )}
      
      {/* Список специалистов */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
        </div>
      ) : specialists.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 sm:w-auto">
                  №
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Специалист
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Услуги
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 sm:w-auto">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {specialists.map((specialist, index) => (
                <tr 
                  key={specialist.id}
                  draggable
                  onDragStart={() => handleDragStart(specialist.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(specialist.id)}
                  className={`hover:bg-gray-50 ${draggingId === specialist.id ? 'opacity-50' : ''}`}
                >
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="font-medium">{index + 1}</span>
                      <div className="flex flex-col">
                        <button 
                          onClick={() => moveUp(specialist.id)}
                          disabled={index === 0}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <FaArrowUp size={12} className="sm:text-base" />
                        </button>
                        <button 
                          onClick={() => moveDown(specialist.id)}
                          disabled={index === specialists.length - 1}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <FaArrowDown size={12} className="sm:text-base" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                        {specialist.photo ? (
                          <img 
                            src={`/api/images?path=${encodeURIComponent(specialist.photo.startsWith('/') ? specialist.photo.substring(1) : specialist.photo)}&t=${new Date().getTime()}`}
                            alt={`${specialist.firstName} ${specialist.lastName}`} 
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.error(`Ошибка загрузки изображения в админке: ${target.src}`);
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
                          />
                        ) : (
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium text-xs sm:text-sm">
                              {specialist.firstName.charAt(0)}{specialist.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-2 sm:ml-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {specialist.firstName} {specialist.lastName}
                        </div>
                      </div>
                    </div>
                    {/* Услуги для мобильных устройств */}
                    <div className="mt-1 sm:hidden">
                      <div className="flex flex-wrap gap-1">
                        {specialist.services && specialist.services.length > 0 ? (
                          specialist.services.slice(0, 2).map((service) => (
                            <ServiceTag key={`mobile-${specialist.id}-${service.id}`} service={service} />
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs italic">Нет услуг</span>
                        )}
                        {specialist.services && specialist.services.length > 2 && (
                          <span className="text-xs text-gray-500">+{specialist.services.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-4 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {specialist.services && specialist.services.length > 0 ? (
                        specialist.services.map((service) => (
                          <ServiceTag key={`${specialist.id}-${service.id}`} service={service} />
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm italic">Нет услуг</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex justify-center space-x-3 sm:space-x-4">
                      <Link
                        href={`/specialists/${specialist.id}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-900"
                        title="Просмотр"
                      >
                        <FaEye size={16} />
                      </Link>
                      <Link
                        href={`/admin/specialists/edit/${specialist.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Редактировать"
                      >
                        <FaEdit size={16} />
                      </Link>
                      <button
                        onClick={() => deleteSpecialist(specialist.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Удалить"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : isLoaded ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">Специалисты не найдены. Добавьте первого специалиста.</p>
        </div>
      ) : null}

      {/* Адаптивная кнопка добавления для мобильных устройств */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <Link 
          href="/admin/specialists/add" 
          className="bg-[#48a9a6] hover:bg-[#357d7a] text-white p-3 rounded-full shadow-lg flex items-center justify-center"
        >
          <FaPlus size={20} />
        </Link>
      </div>
      
      {/* Ссылка для управления дубликатами */}
      <div className="mt-8">
        <Link 
          href="/admin/specialists/manage-duplicates" 
          className="text-[#48a9a6] hover:underline"
        >
          Управление дубликатами специалистов
        </Link>
      </div>
    </div>
  );
}
