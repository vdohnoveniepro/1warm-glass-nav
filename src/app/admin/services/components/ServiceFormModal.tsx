import React, { useEffect, useState, useRef } from 'react';
import { Service, ServiceFormData } from '@/types/service';
import { FaTimes, FaImage, FaPlus, FaMinus } from 'react-icons/fa';
import ColorPicker from '@/components/ColorPicker';
import Image from 'next/image';
import RichTextEditor from '@/components/RichTextEditor';

// Определение интерфейса специалиста для использования в компоненте
interface SpecialistForService {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  isArchived?: boolean;
}

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Service) => void;
  service: Service | null;
}

const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  service
}) => {
  const [availableSpecialists, setAvailableSpecialists] = useState<SpecialistForService[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    description: string;
    shortDescription: string;
    price: string;
    duration: string;
    color: string;
    image: File | null;
    imagePreview: string;
    selectedSpecialists: SpecialistForService[];
    isArchived?: boolean;
  }>({
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    duration: '',
    color: '#48a9a6',
    image: null,
    imagePreview: '',
    selectedSpecialists: [],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Загрузка данных специалистов
  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        const response = await fetch('/api/admin/specialists');
        if (!response.ok) {
          throw new Error('Не удалось загрузить специалистов');
        }
        
        const data = await response.json();
        if (data.success) {
          setAvailableSpecialists(data.data.filter((s: SpecialistForService) => !s.isArchived));
        }
      } catch (error) {
        console.error('Ошибка при загрузке специалистов:', error);
      }
    };
    
    fetchSpecialists();
  }, []);
  
  // Заполнение формы данными услуги при редактировании
  useEffect(() => {
    if (service) {
      console.log('Инициализация формы с данными услуги:', service.description);
      setFormData({
        id: service.id,
        name: service.name || '',
        description: service.description || '',
        shortDescription: service.shortDescription || '',
        price: service.price?.toString() || '',
        duration: service.duration?.toString() || '',
        color: service.color || '#48a9a6',
        image: null,
        imagePreview: service.image || '',
        selectedSpecialists: service.specialists || [],
        isArchived: service.isArchived,
      });
    } else {
      // Сброс формы при создании новой услуги
      setFormData({
        name: '',
        description: '',
        shortDescription: '',
        price: '',
        duration: '',
        color: '#48a9a6',
        image: null,
        imagePreview: '',
        selectedSpecialists: [],
      });
    }
    
    setErrors({});
    setIsSubmitting(false);
  }, [service, isOpen]);
  
  // Обработчик изменения обычных полей
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Очищаем ошибку при редактировании поля
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Обработчик выбора цвета
  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };
  
  // Обработчик выбора изображения
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Проверка типа файла
      if (!file.type.includes('image/')) {
        setErrors(prev => ({
          ...prev,
          image: 'Выбранный файл не является изображением'
        }));
        return;
      }
      
      // Проверка размера файла (до 5 МБ)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Размер изображения не должен превышать 5 МБ'
        }));
        return;
      }
      
      // Создаем URL для предпросмотра
      const imageUrl = URL.createObjectURL(file);
      
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: imageUrl
      }));
      
      // Очищаем ошибку изображения при успешном выборе
      if (errors.image) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };
  
  // Обработчик удаления изображения
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: ''
    }));
  };
  
  // Обработчик выбора специалиста
  const handleToggleSpecialist = (specialist: SpecialistForService) => {
    setFormData(prev => {
      const isSelected = prev.selectedSpecialists.some(s => s.id === specialist.id);
      
      if (isSelected) {
        // Удаляем специалиста из выбранных
        return {
          ...prev,
          selectedSpecialists: prev.selectedSpecialists.filter(s => s.id !== specialist.id)
        };
      } else {
        // Добавляем специалиста к выбранным
        return {
          ...prev,
          selectedSpecialists: [...prev.selectedSpecialists, specialist]
        };
      }
    });
    
    // Очищаем ошибку специалистов при выборе
    if (errors.selectedSpecialists) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.selectedSpecialists;
        return newErrors;
      });
    }
  };
  
  // Обновляем обработчик полного описания с использованием RichTextEditor
  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    
    // Очищаем ошибку при редактировании поля
    if (errors.description) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.description;
        return newErrors;
      });
    }
  };
  
  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Введите название услуги';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Введите описание услуги';
    }
    
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = 'Введите краткое описание услуги';
    } else if (formData.shortDescription.length > 150) {
      newErrors.shortDescription = 'Краткое описание должно быть не более 150 символов';
    }
    
    if (formData.price.trim() === '') {
      newErrors.price = 'Введите стоимость услуги';
    }
    
    if (!formData.duration.trim()) {
      newErrors.duration = 'Введите длительность услуги';
    } else if (parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Длительность должна быть больше нуля';
    }
    
    if (!formData.color) {
      newErrors.color = 'Выберите цвет услуги';
    }
    
    if (formData.selectedSpecialists.length === 0) {
      newErrors.selectedSpecialists = 'Выберите хотя бы одного специалиста';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Создаем объект услуги для сохранения
      const serviceData: ServiceFormData = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        price: parseFloat(formData.price) || 0,
        duration: parseInt(formData.duration) || 60,
        color: formData.color,
        specialists: formData.selectedSpecialists.map(s => ({ id: s.id })),
        isArchived: formData.isArchived || false,
      };
      
      // Если это редактирование, сохраняем ID
      if (formData.id) {
        serviceData.id = formData.id;
      }
      
      // Если изображение было изменено, загружаем его
      if (formData.image) {
        const formDataObj = new FormData();
        formDataObj.append('file', formData.image);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataObj,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Не удалось загрузить изображение');
        }
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
          serviceData.image = uploadData.url;
        } else {
          throw new Error(uploadData.message || 'Ошибка загрузки изображения');
        }
      } else if (formData.imagePreview) {
        // Если изображение уже было и не изменилось
        serviceData.image = formData.imagePreview;
      }
      
      // Вызываем функцию сохранения услуги
      onSave(serviceData as Service);
      
    } catch (error) {
      console.error('Ошибка при сохранении услуги:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Не удалось сохранить услугу'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Не рендерим ничего, если модальное окно закрыто
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-screen overflow-y-auto z-10 mx-3">
        <div className="p-5 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {service ? 'Редактирование услуги' : 'Создание новой услуги'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <FaTimes className="text-gray-500" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          {/* Основная информация */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Название услуги*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Введите название услуги"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Краткое описание* (до 150 символов)
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.shortDescription ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Краткое описание для списка услуг"
                rows={2}
              />
              <div className="flex justify-between mt-1">
                <p className={`text-sm ${formData.shortDescription.length > 150 ? 'text-red-500' : 'text-gray-500'}`}>
                  {formData.shortDescription.length}/150 символов
                </p>
                {errors.shortDescription && (
                  <p className="text-red-500 text-sm">{errors.shortDescription}</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Полное описание*
              </label>
              <RichTextEditor
                key={`editor-${isOpen}-${service?.id || 'new'}`}
                value={formData.description}
                onChange={handleDescriptionChange}
                error={errors.description}
                placeholder="Подробное описание услуги"
                rows={4}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Стоимость (руб.)*
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Введите стоимость"
                  min="0"
                  step="10"
                />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Длительность (мин.)*
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.duration ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Введите длительность"
                  min="5"
                  step="5"
                />
                {errors.duration && (
                  <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цвет услуги*
              </label>
              <ColorPicker 
                color={formData.color} 
                onChange={handleColorChange} 
              />
              {errors.color && (
                <p className="text-red-500 text-sm mt-1">{errors.color}</p>
              )}
            </div>
          </div>
          
          {/* Блок изображения */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Изображение услуги
            </label>
            
            {formData.imagePreview ? (
              <div className="relative border rounded-md p-2 w-full max-w-xs">
                <div className="relative h-40 w-full overflow-hidden rounded">
                  <Image
                    src={formData.imagePreview}
                    alt="Превью изображения"
                    className="object-cover"
                    fill
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 bg-red-500 text-white p-1 rounded-full"
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center cursor-pointer hover:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <FaImage className="mx-auto h-12 w-12 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-700">
                  Нажмите для выбора изображения
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  PNG, JPG до 5 МБ
                </span>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
            
            {errors.image && (
              <p className="text-red-500 text-sm mt-1">{errors.image}</p>
            )}
          </div>
          
          {/* Блок выбора специалистов */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Специалисты, выполняющие услугу*
            </label>
            
            {availableSpecialists.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Нет доступных специалистов. Добавьте специалистов в разделе "Специалисты".
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableSpecialists.map(specialist => {
                  const isSelected = formData.selectedSpecialists.some(s => s.id === specialist.id);
                  
                  return (
                    <div 
                      key={specialist.id}
                      className={`border rounded-md p-3 cursor-pointer flex items-center gap-3 ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleSpecialist(specialist)}
                    >
                      <div className="h-10 w-10 relative bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        {specialist.photo ? (
                          <Image 
                            src={specialist.photo} 
                            alt={`${specialist.firstName} ${specialist.lastName}`}
                            className="object-cover"
                            fill
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <span className="text-sm">Фото</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-grow overflow-hidden">
                        <p className="font-medium truncate">
                          {specialist.firstName} {specialist.lastName}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <FaMinus className="text-blue-500" />
                        ) : (
                          <FaPlus className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {errors.selectedSpecialists && (
              <p className="text-red-500 text-sm mt-1">{errors.selectedSpecialists}</p>
            )}
          </div>
          
          {/* Глобальная ошибка формы */}
          {errors.submit && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
              {errors.submit}
            </div>
          )}
          
          {/* Кнопки действий */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceFormModal; 