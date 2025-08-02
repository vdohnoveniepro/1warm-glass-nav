import React, { useEffect, useState, useRef } from 'react';
import { Service } from '@/types/service';
import ServiceCard from './ServiceCard';
import { FaPlus, FaSpinner, FaArchive, FaArrowUp, FaArrowDown, FaQuestionCircle, FaCog, FaGift, FaTicketAlt, FaChevronDown } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';
import FAQEditor from '@/components/admin/FAQEditor';
// Заменяем импорт серверных функций
// import { getServices, updateServiceStatus, updateServicesOrder, deleteService } from '@/lib/api/servicesAPI';

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [showFAQEditor, setShowFAQEditor] = useState(false);
  const [showBonusMenu, setShowBonusMenu] = useState(false);
  const bonusMenuRef = useRef<HTMLDivElement>(null);

  // Загрузка услуг
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/services');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить услуги');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setServices(data.data);
      } else {
        throw new Error(data.message || 'Ошибка загрузки услуг');
      }
    } catch (error) {
      console.error('Ошибка при загрузке услуг:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      toast.error('Не удалось загрузить услуги');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменения статуса услуги (архивация/восстановление)
  const handleUpdateStatus = async (service: Service, isArchived: boolean) => {
    try {
      const response = await fetch(`/api/admin/services/${service.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка HTTP: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Обновляем локальный список услуг
        setServices(prevServices => 
          prevServices.map(s => 
            s.id === service.id ? { ...s, isArchived } : s
          )
        );
        
        toast.success(isArchived ? 'Услуга перемещена в архив' : 'Услуга восстановлена из архива');
      } else {
        throw new Error(data.message || 'Ошибка при изменении статуса услуги');
      }
    } catch (error: any) {
      console.error('Ошибка при изменении статуса услуги:', error);
      toast.error(error?.message || 'Не удалось изменить статус услуги');
      throw error;
    }
  };

  // Обработчик открытия модального окна для редактирования
  const handleEditService = (service: Service) => {
    window.location.href = `/admin/services/edit/${service.id}`;
  };

  // Обработчик открытия модального окна для создания
  const handleAddService = () => {
    window.location.href = '/admin/services/add';
  };

  // Обработчик сохранения услуги
  const handleSaveService = async (service: Service) => {
    // Этот метод больше не нужен, так как сохранение происходит на страницах создания и редактирования
  };

  // Функция для перемещения услуги выше в списке
  const moveUp = (id: string) => {
    const currentIndex = services.findIndex(s => s.id === id);
    if (currentIndex <= 0) return;

    const newServices = [...services];
    const temp = newServices[currentIndex];
    newServices[currentIndex] = newServices[currentIndex - 1];
    newServices[currentIndex - 1] = temp;

    // Обновляем порядок всех элементов
    const updatedServices = newServices.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setServices(updatedServices);
    
    // Автоматически сохраняем измененный порядок
    saveServicesOrder(updatedServices);
  };

  // Функция для перемещения услуги ниже в списке
  const moveDown = (id: string) => {
    const currentIndex = services.findIndex(s => s.id === id);
    if (currentIndex === -1 || currentIndex >= services.length - 1) return;

    const newServices = [...services];
    const temp = newServices[currentIndex];
    newServices[currentIndex] = newServices[currentIndex + 1];
    newServices[currentIndex + 1] = temp;

    // Обновляем порядок всех элементов
    const updatedServices = newServices.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setServices(updatedServices);
    
    // Автоматически сохраняем измененный порядок
    saveServicesOrder(updatedServices);
  };

  // Обработчики для функционала drag and drop
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

    const dragIndex = services.findIndex(s => s.id === draggingId);
    const targetIndex = services.findIndex(s => s.id === targetId);

    if (dragIndex === -1 || targetIndex === -1) {
      setDraggingId(null);
      return;
    }

    // Создаем копию массива и меняем порядок
    const newServices = [...services];
    const [removed] = newServices.splice(dragIndex, 1);
    newServices.splice(targetIndex, 0, removed);

    // Обновляем порядок всех элементов
    const updatedServices = newServices.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setServices(updatedServices);
    setDraggingId(null);
    
    // Автоматически сохраняем измененный порядок
    saveServicesOrder(updatedServices);
  };

  // Функция для сохранения порядка услуг
  const saveServicesOrder = async (updatedServices: Service[]) => {
    try {
      setSavingOrder(true);
      
      // Подготавливаем данные для API
      const orderUpdates = updatedServices
        .filter(s => !s.isArchived) // Только активные услуги
        .map((service, index) => ({
          id: service.id,
          order: index
        }));
      
      console.log(`Сохранение порядка ${orderUpdates.length} услуг...`);
      
      // Отправляем запрос на обновление порядка
      const response = await fetch('/api/admin/services/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderUpdates),
        credentials: 'include'
      });
      
      // Получаем текст ответа для более подробной диагностики
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`Ошибка при сохранении порядка услуг: ${response.status} ${response.statusText}`);
        console.error(`Ответ сервера: ${responseText}`);
        throw new Error(`Ошибка при сохранении порядка услуг`);
      }
      
      console.log('Ответ получен, анализируем данные...');
      
      // Преобразуем текст в JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Ошибка при разборе JSON ответа:', parseError);
        console.error('Текст ответа:', responseText);
        throw new Error('Ошибка при разборе ответа сервера');
      }
      
      if (data.success) {
        // Обновляем локальный список услуг
        console.log('Порядок услуг успешно обновлен');
        toast.success('Порядок услуг успешно обновлен');
        
        // Обновляем состояние компонента с новыми данными
        if (data.data) {
          console.log(`Успешно получены обновленные данные: ${data.data.length} услуг`);
          setServices(data.data);
        }
      } else {
        throw new Error(data.message || 'Ошибка при обновлении порядка услуг');
      }
      
      // setHasOrderChanged(false); // This line was removed as per the new_code
    } catch (error) {
      console.error('Ошибка при изменении порядка услуг:', error);
      toast.error('Не удалось обновить порядок услуг');
      
      // Перезагружаем услуги, чтобы восстановить правильный порядок
      fetchServices();
    } finally {
      setSavingOrder(false);
    }
  };

  // Изменение функции удаления услуги
  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Вы уверены, что хотите удалить услугу "${service.name}"? Это действие нельзя отменить.`)) {
      return;
    }
    
    setLoading(true);
    try {
      // Сначала удаляем из локального состояния для мгновенной обратной связи
      setServices(prevServices => prevServices.filter(s => s.id !== service.id));
      
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Ошибка при парсинге ответа:', e);
        throw new Error('Не удалось получить ответ от сервера');
      }
      
      if (!response.ok) {
        // Если ошибка, возвращаем услугу в список
        setServices(prevServices => [...prevServices, service].sort((a, b) => (a.order || 0) - (b.order || 0)));
        throw new Error(data.message || `Ошибка ${response.status}: ${response.statusText}`);
      }
      
      if (data.success) {
        toast.success(data.message || 'Услуга успешно удалена');
      } else {
        // Если ответ не успешный, но HTTP статус ОК, считаем что услуга удалена
        // но предупреждаем о возможной проблеме
        toast.warning('Услуга удалена, но возникли предупреждения: ' + (data.message || 'неизвестная ошибка'));
      }
      
      // Перезагрузим список услуг для синхронизации с сервером
      setTimeout(() => {
        fetchServices();
      }, 1000);
    } catch (error: any) {
      console.error('Ошибка при удалении услуги:', error);
      toast.error(error.message || 'Произошла ошибка при удалении услуги');
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация услуг в зависимости от активной вкладки
  const filteredServices = services.filter(service => 
    activeTab === 'all' ? !service.isArchived : service.isArchived
  );

  // Загрузка услуг при монтировании компонента
  useEffect(() => {
    fetchServices();
  }, []);

  // Обработчик клика вне выпадающего меню
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bonusMenuRef.current && !bonusMenuRef.current.contains(event.target as Node)) {
        setShowBonusMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 mb-16">
      {/* Заголовок и основные кнопки действий */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold">Управление услугами</h1>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative" ref={bonusMenuRef}>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              title="Бонусы и промокоды"
              onClick={() => setShowBonusMenu(!showBonusMenu)}
            >
              <FaGift />
              <span className="hidden sm:inline">Бонусы и Промокоды</span>
              <span className="inline sm:hidden">Бонусы</span>
              <FaChevronDown className="ml-1" />
            </button>
            {showBonusMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-10">
                <Link 
                  href="/admin/services/promos" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowBonusMenu(false)}
                >
                  <FaTicketAlt className="mr-2 text-purple-600" />
                  Промокоды
                </Link>
                <Link 
                  href="/admin/services/bonus" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowBonusMenu(false)}
                >
                  <FaGift className="mr-2 text-green-600" />
                  Бонусная система
                </Link>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowFAQEditor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8683] transition-colors"
            title="Редактировать FAQ"
          >
            <FaQuestionCircle />
            <span className="hidden sm:inline">Редактировать FAQ</span>
            <span className="inline sm:hidden">FAQ</span>
          </button>
          
          <Link
            href="/admin/services/add"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaPlus />
            <span className="hidden sm:inline">Добавить услугу</span>
            <span className="inline sm:hidden">Добавить</span>
          </Link>
        </div>
      </div>
      
      <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        ← Вернуться в панель управления
      </Link>
      
      {/* Вкладки */}
      <div className="mb-6 border-b">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-1 ${
              activeTab === 'all'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Активные услуги
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`pb-3 px-1 flex items-center ${
              activeTab === 'archived'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaArchive className="mr-1" />
            <span>Архив</span>
          </button>
        </div>
      </div>
      
      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="flex items-center justify-center space-x-2">
            <FaSpinner className="animate-spin text-blue-600 text-2xl" />
            <span className="text-gray-600">Загрузка услуг...</span>
          </div>
        </div>
      )}
      
      {/* Сообщение об ошибке */}
      {error && !loading && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
          <p><strong>Ошибка:</strong> {error}</p>
          <button
            onClick={fetchServices}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Попробовать снова
          </button>
        </div>
      )}
      
      {/* Пустое состояние */}
      {!loading && !error && filteredServices.length === 0 && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {activeTab === 'all' 
              ? 'Нет активных услуг' 
              : 'В архиве нет услуг'}
          </h3>
          <p className="text-gray-500 mb-4">
            {activeTab === 'all'
              ? 'Добавьте новую услугу, чтобы она отображалась здесь'
              : 'Заархивированные услуги будут отображаться здесь'}
          </p>
          {activeTab === 'all' && (
            <Link
              href="/admin/services/add"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FaPlus />
              <span>Добавить услугу</span>
            </Link>
          )}
        </div>
      )}
      
      {/* Список услуг */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredServices.map((service, index) => (
            <div 
              key={service.id}
              className={`relative ${
                draggingId === service.id ? 'opacity-50 border-2 border-blue-500' : ''
              }`}
              draggable={activeTab === 'all'}
              onDragStart={() => activeTab === 'all' && handleDragStart(service.id)}
              onDragOver={handleDragOver}
              onDrop={() => activeTab === 'all' && handleDrop(service.id)}
              onDragEnd={() => setDraggingId(null)}
            >
              {/* Кнопки управления порядком (только для активных услуг) */}
              {activeTab === 'all' && (
                <div className="absolute right-2 top-2 z-10 flex flex-col space-y-1">
                  <button 
                    onClick={() => moveUp(service.id)}
                    disabled={index === 0}
                    className="p-1.5 bg-white bg-opacity-80 text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded-full shadow-sm"
                    title="Переместить выше"
                  >
                    <FaArrowUp size={12} />
                  </button>
                  <button 
                    onClick={() => moveDown(service.id)}
                    disabled={index === filteredServices.length - 1}
                    className="p-1.5 bg-white bg-opacity-80 text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded-full shadow-sm"
                    title="Переместить ниже"
                  >
                    <FaArrowDown size={12} />
                  </button>
                </div>
              )}
              <ServiceCard
                service={service}
                onEdit={handleEditService}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteService}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* FAQ редактор */}
      <FAQEditor isOpen={showFAQEditor} onClose={() => setShowFAQEditor(false)} />
    </div>
  );
};

export default ServicesPage; 