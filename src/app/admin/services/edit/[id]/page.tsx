'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { FaSave, FaTimes, FaImage, FaPlus, FaTrash, FaRubleSign, FaClock } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import RichTextEditor from '@/components/RichTextEditor';

// Типы данных
type Service = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  duration: number;
  color: string;
  specialists: { id: string }[];
  order: number;
};

type Specialist = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
};

type FormData = {
  name: string;
  description: string;
  shortDescription: string;
  price: string;
  duration: string;
  color: string;
  image: File | null;
  imagePreview: string;
  selectedSpecialists: string[];
};

type FormErrors = {
  [key in keyof FormData]?: string;
};

export default function EditServicePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [service, setService] = useState<Service | null>(null);
  const [availableSpecialists, setAvailableSpecialists] = useState<Specialist[]>([]);
  const [formData, setFormData] = useState<FormData>({
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
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка данных услуги и специалистов
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем данные услуги
        const serviceResponse = await fetch(`/api/services/${params.id}`);
        if (!serviceResponse.ok) {
          throw new Error('Ошибка при загрузке услуги');
        }
        const serviceData = await serviceResponse.json();
        setService(serviceData);
        
        // Заполняем форму данными услуги
        setFormData({
          name: serviceData.name || '',
          description: serviceData.description || '',
          shortDescription: serviceData.description ? serviceData.description.slice(0, 150) : '',
          price: serviceData.price ? String(serviceData.price) : '',
          duration: serviceData.duration ? String(serviceData.duration) : '',
          color: serviceData.color || '#48a9a6',
          image: null,
          imagePreview: serviceData.image || '',
          selectedSpecialists: serviceData.specialists?.map((s: { id: string }) => s.id) || [],
        });
        
        // Загружаем список специалистов
        const specialistsResponse = await fetch('/api/specialists');
        if (!specialistsResponse.ok) {
          throw new Error('Ошибка при загрузке специалистов');
        }
        const specialistsData = await specialistsResponse.json();
        setAvailableSpecialists(specialistsData);
        
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        alert('Ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
        router.push('/admin/services');
      } finally {
        setIsLoaded(true);
      }
    };
    
    if (!isLoading && user && user.role.toUpperCase() === 'ADMIN') {
      fetchData();
    }
  }, [isLoading, user, router, params.id]);

  // Защита страницы: только для админов
  useEffect(() => {
    if (!isLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // При изменении поля убираем ошибку для этого поля
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Обработчик изменения поля описания с помощью RichTextEditor
  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    
    // При изменении поля убираем ошибку
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  // Обработчик изменения изображения
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Проверяем, что это изображение
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Пожалуйста, загрузите изображение' }));
      return;
    }
    
    // Создаем URL для предпросмотра
    const previewUrl = URL.createObjectURL(file);
    
    setFormData(prev => ({ 
      ...prev, 
      image: file,
      imagePreview: previewUrl
    }));
    
    // Убираем ошибку, если она была
    if (errors.image) {
      setErrors(prev => ({ ...prev, image: undefined }));
    }
  };

  // Обработчик для числовых полей (цена, длительность)
  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Разрешаем только цифры
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, [name]: numericValue }));
    
    // При изменении поля убираем ошибку для этого поля
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Обработчик изменения краткого описания
  const handleShortDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, shortDescription: value }));
    
    // При изменении поля убираем ошибку
    if (errors.shortDescription) {
      setErrors(prev => ({ ...prev, shortDescription: undefined }));
    }
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Введите название услуги';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Введите полное описание услуги';
    }
    
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = 'Введите краткое описание услуги';
    } else if (formData.shortDescription.length > 150) {
      newErrors.shortDescription = 'Краткое описание должно быть не более 150 символов';
    }
    
    if (formData.price.trim() === '') {
      newErrors.price = 'Цена обязательна';
    }
    
    if (!formData.duration) {
      newErrors.duration = 'Длительность обязательна';
    } else if (parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Длительность должна быть больше нуля';
    }
    
    if (!formData.color) {
      newErrors.color = 'Выберите цвет услуги';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Кнопка триггер для инпута загрузки файла
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Обработчик для выбора/снятия специалистов
  const toggleSpecialist = (specialistId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedSpecialists.includes(specialistId);
      
      if (isSelected) {
        // Удаляем специалиста, если он был выбран
        return {
          ...prev,
          selectedSpecialists: prev.selectedSpecialists.filter(id => id !== specialistId)
        };
      } else {
        // Добавляем специалиста, если он не был выбран
        return {
          ...prev,
          selectedSpecialists: [...prev.selectedSpecialists, specialistId]
        };
      }
    });
  };

  // Обновляем функцию handleSubmit для отправки краткого описания на сервер
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Подготовка объекта для отправки
      const dataToSend = {
        id: params.id,
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        price: parseInt(formData.price),
        duration: parseInt(formData.duration),
        color: formData.color,
        specialists: formData.selectedSpecialists.map(id => ({ id })),
        imageBase64: formData.image ? await fileToBase64(formData.image) : null
      };
      
      // Отправляем данные на сервер используя PATCH метод
      const response = await fetch(`/api/admin/services/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при обновлении услуги');
      }
      
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push('/admin/services');
      }, 1500);
      
    } catch (error) {
      console.error('Ошибка при сохранении услуги:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при сохранении услуги. Пожалуйста, попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Добавляем функцию fileToBase64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Компонент для отображения карточки специалиста
  const SpecialistCard = ({ specialist }: { specialist: Specialist }) => {
    const isSelected = formData.selectedSpecialists.includes(specialist.id);
    
    return (
      <div 
        className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
          isSelected ? 'border-[#48a9a6] bg-[#48a9a6]/10' : 'border-gray-200 hover:border-[#48a9a6] hover:bg-[#48a9a6]/5'
        }`}
        onClick={() => toggleSpecialist(specialist.id)}
      >
        <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-[#48a9a6]/20">
          {specialist.photo ? (
            <Image 
              src={specialist.photo} 
              alt={`${specialist.firstName} ${specialist.lastName}`} 
              fill
              className="object-cover"
              onError={(e) => {
                e.currentTarget.parentElement?.classList.add('bg-[#48a9a6]/20', 'text-[#48a9a6]', 'flex', 'items-center', 'justify-center', 'text-xs');
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerHTML = specialist.firstName ? specialist.firstName.charAt(0) : '?';
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#48a9a6]/20 text-[#48a9a6] text-xs">
              {specialist.firstName ? specialist.firstName.charAt(0) : '?'}
            </div>
          )}
        </div>
        
        <div className="flex-grow">
          <h4 className="font-medium">{specialist.firstName} {specialist.lastName}</h4>
        </div>
        
        <div className="flex-shrink-0 text-gray-400">
          {isSelected ? <FaTrash size={14} /> : <FaPlus size={14} />}
        </div>
      </div>
    );
  };

  // Функция форматирования цены
  const formatPrice = (price: string) => {
    if (price === '' || price === '0') {
      return 'Бесплатно';
    }
    return `${price} ₽`;
  };

  // Пока загружаем данные или проверяем авторизацию, показываем индикатор загрузки
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }

  // Проверка роли в верхнем регистре
  const userRole = user?.role?.toUpperCase();
  
  // Если пользователь не админ, ничего не показываем
  if (!user || userRole !== 'ADMIN') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Редактирование услуги</h1>
        
        <Link href="/admin/services" className="inline-block mb-6 text-[#48a9a6] hover:underline">
          ← Вернуться к списку услуг
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Основная информация */}
            <div>
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Название услуги*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full p-3 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-[#48a9a6] focus:border-[#48a9a6] outline-none transition-colors`}
                  placeholder="Введите название услуги"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              <div className="mb-6">
                <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Краткое описание <span className="text-red-500">*</span>
                </label>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-3 rounded text-sm text-amber-800">
                  <p><strong>Важно:</strong> Краткое описание отображается в карточках услуг на главной странице (до 150 символов).</p>
                </div>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleShortDescriptionChange}
                  rows={3}
                  maxLength={150}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.shortDescription ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent`}
                  placeholder="Введите краткое описание для отображения в списке услуг..."
                />
                <div className="flex justify-between mt-1">
                  <p className={`text-sm ${errors.shortDescription ? 'text-red-500' : 'text-gray-500'}`}>
                    {errors.shortDescription || ''}
                  </p>
                  <p className="text-sm text-gray-500">{formData.shortDescription.length}/150 символов</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Полное описание <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  error={errors.description}
                  rows={5}
                  placeholder="Введите полное описание услуги..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Стоимость
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaRubleSign className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="price"
                      value={formData.price}
                      onChange={handleNumericInput}
                      className="w-full pl-10 p-2 border rounded-md"
                      placeholder="0 - Бесплатно"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Длительность (мин)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaClock className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleNumericInput}
                      className="w-full pl-10 p-2 border rounded-md"
                    />
                  </div>
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                  Цвет услуги*
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className={`h-10 w-14 rounded cursor-pointer ${
                      errors.color ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <div className="flex-1">
                    <div 
                      className="px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: `${formData.color}20`,
                        color: formData.color,
                        border: `1px solid ${formData.color}`
                      }}
                    >
                      Образец тега услуги
                    </div>
                  </div>
                </div>
                {errors.color && (
                  <p className="mt-1 text-sm text-red-500">{errors.color}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Выберите цвет, который будет отображаться в тегах услуги на сайте.
                </p>
              </div>
            </div>
            
            {/* Фото и выбор специалистов */}
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фотография услуги
                </label>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" onClick={triggerFileInput}>
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <input 
                        id="image" 
                        name="image" 
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                      />
                      <p className="pl-1">Нажмите для загрузки фото или перетащите файл сюда</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF до 10MB</p>
                  </div>
                </div>
                
                {errors.image && (
                  <p className="mt-1 text-sm text-red-500">{errors.image}</p>
                )}
              </div>
              
              <p className="block text-sm font-medium text-gray-700 mb-2">Предпросмотр</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="relative h-48 w-full bg-gray-100">
                  <Image
                    src={formData.imagePreview || '/images/photoPreview.jpg'}
                    alt="Предпросмотр изображения услуги"
                    fill
                    className="object-cover"
                    onError={() => {
                      setFormData(prev => ({
                        ...prev,
                        imagePreview: '/images/photoPreview.jpg'
                      }));
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">
                    {formData.name || '[Название услуги]'}
                  </h3>
                  <div className="mt-2 mb-3 flex items-center gap-2">
                    <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                      {formatPrice(formData.price)}
                    </div>
                    <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      {formData.duration ? `${formData.duration} мин` : '0 мин'}
                    </div>
                    <div 
                      className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${formData.color}20`,
                        color: formData.color 
                      }}
                    >
                      Цвет тега
                    </div>
                  </div>
                  <div 
                    className="text-sm text-gray-600 overflow-hidden"
                    style={{ maxHeight: '80px' }}
                    dangerouslySetInnerHTML={{ 
                      __html: formData.description || 'Описание услуги будет отображаться здесь...' 
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Выберите специалистов, которые оказывают эту услугу
                </label>
                
                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {availableSpecialists.map(specialist => (
                    <SpecialistCard 
                      key={specialist.id} 
                      specialist={specialist} 
                    />
                  ))}
                  
                  {availableSpecialists.length === 0 && (
                    <p className="text-gray-500 text-sm text-center p-4 bg-gray-50 rounded-lg">
                      Специалисты не найдены. Пожалуйста, сначала добавьте специалистов.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Link 
              href="/admin/services"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaTimes className="mr-2" />
              <span>Отмена</span>
            </Link>
            
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center justify-center px-4 py-2 bg-[#48a9a6] text-white rounded-lg ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#48a9a6]/90'
              } transition-colors`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-r-2 mr-2"></div>
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  <span>Сохранить</span>
                </>
              )}
            </button>
          </div>
          
          {submitSuccess && (
            <div className="mt-4 bg-green-100 border-l-4 border-green-500 p-4 rounded">
              <p className="text-green-700">Услуга успешно обновлена!</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 