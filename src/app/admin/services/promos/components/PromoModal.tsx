import React, { useState, useEffect } from 'react';
import { Promo, PromoFormData } from '@/types/promo';
import { Service } from '@/types/service';
import { FaSpinner, FaTimes } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

interface PromoModalProps {
  isOpen: boolean;
  promo: Promo | null;
  onClose: () => void;
  onSave: (promoData: PromoFormData) => void;
}

const PromoModal: React.FC<PromoModalProps> = ({ isOpen, promo, onClose, onSave }) => {
  const [formData, setFormData] = useState<PromoFormData>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    maxUses: 0,
    isActive: true,
    services: []
  });
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  
  // Загрузка списка услуг
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const response = await fetch('/api/admin/services');
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить услуги');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Фильтруем только активные услуги
          const activeServices = data.data.filter((service: Service) => !service.isArchived);
          setServices(activeServices);
        } else {
          throw new Error(data.message || 'Ошибка загрузки услуг');
        }
      } catch (error) {
        console.error('Ошибка при загрузке услуг:', error);
        toast.error('Не удалось загрузить список услуг');
      } finally {
        setLoadingServices(false);
      }
    };
    
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);
  
  // Заполнение формы данными промокода при редактировании
  useEffect(() => {
    if (promo) {
      console.log('Данные промокода для редактирования:', promo);
      console.log('is_active:', promo.is_active, 'тип:', typeof promo.is_active);
      
      // Явно преобразуем is_active в булево значение
      const isActiveValue = promo.is_active === 0 ? false : true;
      console.log('Преобразованное значение isActive:', isActiveValue);
      
      setFormData({
        code: promo.code,
        description: promo.description,
        discountType: promo.discount_type as 'percentage' | 'fixed',
        discountValue: promo.discount_value,
        startDate: new Date(promo.start_date).toISOString().split('T')[0],
        endDate: promo.end_date ? new Date(promo.end_date).toISOString().split('T')[0] : '',
        maxUses: promo.max_uses || 0,
        isActive: isActiveValue,
        services: Array.isArray(promo.services) 
          ? promo.services.map((s: any) => typeof s === 'string' ? s : s.id)
          : []
      });
    }
  }, [promo]);
  
  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Обработчик изменения выбранных услуг
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setFormData(prev => {
      if (checked) {
        return { ...prev, services: [...prev.services, value] };
      } else {
        return { ...prev, services: prev.services.filter(id => id !== value) };
      }
    });
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Данные формы перед отправкой:', formData);
    console.log('isActive:', formData.isActive, 'тип:', typeof formData.isActive);
    
    // Валидация формы
    if (!formData.code) {
      toast.error('Укажите код промокода');
      return;
    }
    
    if (!formData.discountValue || formData.discountValue <= 0) {
      toast.error('Укажите корректное значение скидки');
      return;
    }
    
    try {
      setLoading(true);
      await onSave(formData);
    } catch (error) {
      console.error('Ошибка при сохранении промокода:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            {promo ? 'Редактирование промокода' : 'Создание промокода'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Код промокода */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Код промокода*
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: SUMMER2023"
                required
              />
            </div>
            
            {/* Тип скидки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип скидки*
              </label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="percentage">Процент (%)</option>
                <option value="fixed">Фиксированная сумма (₽)</option>
              </select>
            </div>
            
            {/* Значение скидки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Значение скидки*
              </label>
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: 10"
                min="0"
                required
              />
            </div>
            
            {/* Максимальное количество использований */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макс. использований (0 = без ограничений)
              </label>
              <input
                type="number"
                name="maxUses"
                value={formData.maxUses}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: 100"
                min="0"
              />
            </div>
            
            {/* Дата начала */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата начала*
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {/* Дата окончания */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата окончания (оставьте пустым для бессрочного)
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Активность */}
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Промокод активен
              </label>
            </div>
          </div>
          
          {/* Описание */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Описание промокода"
              rows={3}
            />
          </div>
          
          {/* Выбор услуг */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Применяется к услугам
            </label>
            
            {loadingServices ? (
              <div className="flex items-center justify-center p-4">
                <FaSpinner className="animate-spin text-blue-600 mr-2" />
                <span>Загрузка услуг...</span>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                {services.length === 0 ? (
                  <p className="text-gray-500 text-center py-2">Нет доступных услуг</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {services.map(service => (
                      <div key={service.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`service-${service.id}`}
                          value={service.id}
                          checked={formData.services.includes(service.id)}
                          onChange={handleServiceChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`service-${service.id}`} className="ml-2 text-sm text-gray-700 truncate">
                          {service.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Если не выбрано ни одной услуги, промокод будет применяться ко всем услугам
            </p>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
            >
              {loading && <FaSpinner className="animate-spin mr-2" />}
              {promo ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromoModal; 