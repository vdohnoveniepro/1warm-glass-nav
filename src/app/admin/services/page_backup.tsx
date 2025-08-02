'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaEye, FaArrowUp, FaArrowDown, FaClock, FaRubleSign, FaTrashAlt, FaArchive, FaUndo, FaSearch } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from '@/components/ui/Toast';
import { MdOutlineUnarchive } from 'react-icons/md';
import Button from '@/components/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Service } from '@/types/service';
import { formatPrice } from '@/lib/utils';
import { deleteService } from '@/lib/api/servicesActions';

// Типы данных для услуг и специалистов
type Specialist = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
};

type Service = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  duration: number; // в минутах
  color: string;
  specialists: Specialist[];
  order: number;
  isArchived: boolean;
};

// Компонент для отображения стоимости услуги
const PriceTag = ({ price }: { price: number }) => {
  if (!price || price === 0) {
    return (
      <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
        <FaRubleSign size={12} className="mr-1" />
        <span>Бесплатно</span>
      </div>
    );
  }
  
  // Форматирование цены с разделителями разрядов
  const formattedPrice = new Intl.NumberFormat('ru-RU').format(price);
  
  return (
    <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
      <FaRubleSign size={12} className="mr-1" />
      <span>{formattedPrice} ₽</span>
    </div>
  );
};

// Компонент для отображения длительности услуги
const DurationTag = ({ minutes }: { minutes: number }) => {
  // Форматирование времени в часы и минуты
  let timeText = '';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    timeText = `${hours} ч${mins > 0 ? ` ${mins} мин` : ''}`;
  } else {
    timeText = `${minutes} мин`;
  }
  
  return (
    <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
      <FaClock size={12} className="mr-1" />
      <span>{timeText}</span>
    </div>
  );
};

// Компонент тега с названием услуги
const ServiceTag = ({ service }: { service: Service }) => {
  // Если цвет в формате HEX или RGB, используем его напрямую
  if (service.color && (service.color.startsWith('#') || service.color.startsWith('rgb'))) {
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
        style={{ 
          backgroundColor: `${service.color}20`,
          color: service.color
        }}
      >
        {service.name}
      </span>
    );
  }
  
  // Предопределенные цвета для случаев, когда цвет задан именем
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
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorMap[service.color] || 'bg-gray-100 text-gray-800'}`}>
      {service.name}
    </span>
  );
};

// Определение типов для табов
type TabType = 'all' | 'archived';

export default function ServicesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/services", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        
        if (data.success && data.data) {
          setServices(data.data);
        } else {
          console.error("Ошибка загрузки услуг:", data.error);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchData();
  }, []);

  // Фильтрация услуг в зависимости от активной вкладки и поискового запроса
  const filteredServices = useMemo(() => {
    let result = services;

    // Фильтрация по вкладке (активные/архивные)
    if (activeTab === 'archived') {
      result = result.filter(service => service.isArchived);
    } else {
      result = result.filter(service => !service.isArchived);
    }

    // Фильтрация по поисковому запросу
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(service => 
        service.name.toLowerCase().includes(query) || 
        service.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [services, activeTab, searchQuery]);

  // Сохраняем изменения через API при обновлении порядка услуг
  const saveServicesOrder = async (updatedServices: Service[]) => {
    try {
      console.log(`Сохранение порядка ${updatedServices.length} услуг...`);
      
      // Формируем массив данных только с id и order для отправки
      const orderData = updatedServices.map(service => ({
        id: service.id,
        order: service.order
      }));
      
      // Получаем токен авторизации
      const token = user ? `user_id=${user.id}` : '';
      console.log('Используем ID пользователя для авторизации:', token);
      
      console.log('Отправка запроса на обновление порядка услуг...');
      
      // Отправляем данные на сервер одним запросом с токеном в заголовке
      const response = await fetch('/api/services/bulk-update-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Сохраняем этот параметр для совместимости
        body: JSON.stringify(orderData),
      });
      
      // Получаем текст ответа для более подробной диагностики
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`Ошибка при сохранении порядка услуг: ${response.status} ${response.statusText}`);
        console.error(`Ответ сервера: ${responseText}`);
        throw new Error(`Ошибка при сохранении порядка услуг: ${response.status} ${response.statusText}`);
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
        console.log(`Успешно получены обновленные данные: ${result.data.length} услуг`);
        setServices(result.data);
      } else {
        console.warn('Ответ сервера не содержит успешных данных:', result);
      }
    } catch (error) {
      console.error('Ошибка при сохранении порядка услуг:', error);
      // Оповещаем пользователя об ошибке
      alert('Не удалось сохранить порядок услуг. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Защита маршрута: только для админов
  useEffect(() => {
    if (!isLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Функция для перемещения услуги выше в списке (стрелка вверх)
  const moveUp = (id: string) => {
    // Проверяем, не последняя ли это услуга
    const currentIndex = services.findIndex(s => s.id === id);
    if (currentIndex === -1 || currentIndex >= services.length - 1) {
      console.log('Нельзя переместить выше: это последняя услуга или услуга не найдена');
      return;
    }
    
    console.log(`Перемещаем услугу ${id} вверх (с индекса ${currentIndex} на ${currentIndex + 1})`);
    
    setServices(prev => {
      const index = prev.findIndex(s => s.id === id);
      // Проверяем, что не последний элемент (последний нельзя переместить ниже, т.е. обменять с тем, что дальше)
      if (index === -1 || index === prev.length - 1) return prev;
      
      const result = [...prev];
      // Меняем местами текущую услугу со следующей (ниже)
      const temp = { ...result[index], order: result[index + 1].order };
      result[index] = { ...result[index + 1], order: temp.order - 1 };
      result[index + 1] = temp;
      
      // Сортируем по полю order
      const sortedResult = result.sort((a, b) => a.order - b.order);
      
      // Сохраняем изменения через API
      saveServicesOrder(sortedResult);
      
      return sortedResult;
    });
  };

  // Функция для перемещения услуги ниже в списке (стрелка вниз)
  const moveDown = (id: string) => {
    // Проверяем, не первая ли это услуга
    const currentIndex = services.findIndex(s => s.id === id);
    if (currentIndex <= 0) {
      console.log('Нельзя переместить ниже: это первая услуга или услуга не найдена');
      return;
    }
    
    console.log(`Перемещаем услугу ${id} вниз (с индекса ${currentIndex} на ${currentIndex - 1})`);
    
    setServices(prev => {
      const index = prev.findIndex(s => s.id === id);
      // Проверяем, что не первый элемент (первый нельзя переместить выше, т.е. обменять с предыдущим)
      if (index <= 0) return prev;
      
      const result = [...prev];
      // Меняем местами текущую услугу с предыдущей (выше)
      const temp = { ...result[index], order: result[index - 1].order };
      result[index] = { ...result[index - 1], order: temp.order + 1 };
      result[index - 1] = temp;
      
      // Сортируем по полю order
      const sortedResult = result.sort((a, b) => a.order - b.order);
      
      // Сохраняем изменения через API
      saveServicesOrder(sortedResult);
      
      return sortedResult;
    });
  };

  // Обработчики для drag-and-drop
  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    // Переупорядочиваем список
    setServices(prev => {
      const sourceIndex = prev.findIndex(s => s.id === draggingId);
      const targetIndex = prev.findIndex(s => s.id === targetId);
      
      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }
      
      const result = [...prev];
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(targetIndex, 0, removed);
      
      // Обновляем порядок всех элементов
      const updatedResult = result.map((item, index) => ({
        ...item,
        order: index + 1
      }));
      
      // Сохраняем изменения через API
      saveServicesOrder(updatedResult);
      
      return updatedResult;
    });
    
    setDraggingId(null);
  };

  // Функция для удаления услуги через API
  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту услугу? Это действие нельзя отменить.')) {
      try {
        const result = await deleteService(id);
        
        if (result.success) {
          // Обновляем список услуг после удаления
          setServices(prevServices => prevServices.filter(service => service.id !== id));
          toast.success('Услуга успешно удалена');
        } else {
          toast.error(result.message || 'Не удалось удалить услугу');
        }
      } catch (error) {
        console.error('Ошибка при удалении услуги:', error);
        toast.error('Произошла ошибка при удалении услуги');
      }
    }
  };

  // Функция для архивации/разархивации услуги
  const handleStatusChange = async (id: string, isArchived: boolean) => {
    try {
      // Получаем токен авторизации
      const token = user ? `user_id=${user.id}` : '';
      
      const response = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isArchived })
      });
      
      if (response.ok) {
        // Обновляем список услуг после успешной архивации/разархивации
        const updatedService = await response.json();
        setServices(services.map(s => s.id === id ? updatedService : s));
        
        toast.success(`Услуга успешно ${isArchived ? 'архивирована' : 'возвращена из архива'}`);
      } else {
        const errorData = await response.json();
        toast.error(`Ошибка при изменении статуса: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка при изменении статуса услуги:', error);
      toast.error('Ошибка при изменении статуса услуги');
    }
  };

  // Если загрузка данных еще идет, показываем сообщение о загрузке
  if (!isLoaded || isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <h2 className="text-xl text-gray-500 mb-4">Загрузка услуг...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Если пользователь не админ, не показываем содержимое
  if (!user || user.role.toUpperCase() !== 'ADMIN') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление услугами</h1>
        
        <Button onClick={() => router.push('/admin/services/new')} className="flex items-center">
          <FaPlus className="mr-2" /> Добавить услугу
        </Button>
      </div>
      
      {/* Табы для переключения между всеми и архивными услугами */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-2 px-4 font-medium ${
            activeTab === 'all'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Все услуги
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`py-2 px-4 font-medium flex items-center ${
            activeTab === 'archived'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaArchive className="mr-2 text-base" /> Архивные
        </button>
      </div>
      
      {/* Поиск услуг */}
      <div className="mb-6 relative">
        <div className="flex items-center w-full max-w-md border rounded-md overflow-hidden">
          <div className="px-3 text-gray-400">
            <FaSearch />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск услуг..."
            className="py-2 px-2 w-full outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {filteredServices.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {activeTab === 'all' 
            ? 'Нет активных услуг. Добавьте новую услугу или восстановите из архива.' 
            : 'В архиве нет услуг.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={service.id} className="relative overflow-hidden">
              {/* Статус */}
              {service.isArchived && (
                <Badge color="gray" className="absolute top-2 right-2 flex items-center">
                  <FaArchive className="mr-1" /> В архиве
                </Badge>
              )}
              
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                
                <div className="text-sm text-gray-600 mb-2">
                  {service.description}
                </div>
                
                <div className="text-lg font-bold mb-4">
                  {formatPrice(service.price)} ₽
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/admin/services/edit/${service.id}`)}
                    >
                      <FaEdit className="mr-1" /> Изменить
                    </Button>
                    
                    {service.isArchived ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleStatusChange(service.id, false)}
                        >
                          <MdOutlineUnarchive className="mr-1" /> Восстановить
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                        >
                          <FaTrash className="mr-1" /> Удалить
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(service.id, true)}
                      >
                        <FaArchive className="mr-1" /> В архив
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 