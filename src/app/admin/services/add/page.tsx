'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaSave, FaTimes, FaImage, FaPlus, FaTrash, FaClock, FaRubleSign } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import RichTextEditor from '@/components/RichTextEditor';
import { ServicesContext } from '@/contexts/ServicesContext';
import { Specialist } from '@/types/Specialist';
import { Service } from '@/types/Service';
import { uploadImage } from '@/utils/imageUpload';
import ColorPicker from '@/components/ColorPicker';

// Типы данных
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
  image: File | null;
  imagePreview: string;
  price: string;
  duration: string;
  color: string;
  selectedSpecialists: string[]; // ID выбранных специалистов
};

export default function AddServicePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние формы
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    shortDescription: '',
    image: null,
    imagePreview: '/images/photoPreview.jpg',
    price: '',
    duration: '',
    color: '#48a9a6', // Цвет по умолчанию
    selectedSpecialists: [],
  });
  
  // Ошибки валидации
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  
  // Список доступных специалистов (в реальном приложении будет загружаться с сервера)
  const [availableSpecialists, setAvailableSpecialists] = useState<Specialist[]>([]);
  
  // Состояние отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Загрузка списка специалистов при монтировании компонента
  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        const response = await fetch('/api/specialists');
        if (!response.ok) throw new Error('Ошибка при загрузке специалистов');
        
        const text = await response.text();
        let data;
        
        try {
          // Пытаемся распарсить JSON
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Ошибка при парсинге ответа:', parseError);
          setAvailableSpecialists([]);
          return;
        }
        
        // Проверка формата полученных данных
        if (!Array.isArray(data)) {
          console.error('Получены некорректные данные вместо массива специалистов:', data);
          setAvailableSpecialists([]);
        } else {
          console.log(`Получено ${data.length} специалистов`);
          setAvailableSpecialists(data);
        }
      } catch (error) {
        console.error('Ошибка при загрузке специалистов:', error);
        setAvailableSpecialists([]);
      }
    };
    
    fetchSpecialists();
  }, []);
  
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
  
  // Обработчик изменения поля краткого описания
  const handleShortDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, shortDescription: value }));
    
    // При изменении поля убираем ошибку
    if (errors.shortDescription) {
      setErrors(prev => ({ ...prev, shortDescription: undefined }));
    }
  };
  
  // Обработчик изменения URL изображения - заменяем на загрузку файла
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
  
  // Обработчик выбора специалистов
  const handleSpecialistToggle = (specialistId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedSpecialists.includes(specialistId);
      let newSelected: string[];
      
      if (isSelected) {
        // Если специалист уже выбран, удаляем его
        newSelected = prev.selectedSpecialists.filter(id => id !== specialistId);
      } else {
        // Иначе добавляем в выбранные
        newSelected = [...prev.selectedSpecialists, specialistId];
      }
      
      return { ...prev, selectedSpecialists: newSelected };
    });
  };
  
  // Функция для открытия диалога выбора файла
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
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
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Подготовка данных для отправки на сервер
      const formDataToSend = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        price: parseInt(formData.price) || 0,
        duration: parseInt(formData.duration) || 0,
        color: formData.color,
        specialists: formData.selectedSpecialists.map(id => ({ id })),
        imageBase64: formData.image ? await fileToBase64(formData.image) : null
      };
      
      // Отправляем данные через API админа
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataToSend),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании услуги');
      }
      
      setSubmitSuccess(true);
      
      // После успешного добавления перенаправляем на страницу услуг
      setTimeout(() => {
        router.push('/admin/services');
      }, 1000);
      
    } catch (error) {
      console.error('Ошибка при добавлении услуги:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при добавлении услуги. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Функция для преобразования файла в base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // Функция для генерации URL изображения через API
  const getImageUrl = (path: string) => {
    if (!path) return '/images/photoPreview.jpg';
    if (path.startsWith('data:')) return path;
    // Добавляем timestamp для предотвращения кэширования
    const timestamp = new Date().getTime();
    return `/api/images?path=${encodeURIComponent(path)}&t=${timestamp}`;
  };
  
  // Компонент для отображения карточки специалиста
  const SpecialistCard = ({ specialist, isSelected }: { specialist: Specialist; isSelected: boolean }) => {
    return (
      <div 
        onClick={() => handleSpecialistToggle(specialist.id)}
        className={`flex items-center p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-[#48a9a6]/10 border-2 border-[#48a9a6]' 
            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
        }`}
      >
        <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
          <Image
            src={getImageUrl(`specialists/${specialist.id}`)}
            alt={`${specialist.firstName} ${specialist.lastName}`}
            fill
            className="object-cover"
            unoptimized={true}
          />
        </div>
        <div className="flex-grow">
          <p className="font-medium text-gray-800">{specialist.firstName} {specialist.lastName}</p>
        </div>
        <div>
          {isSelected ? (
            <div className="text-[#48a9a6]">
              <FaTrash size={14} />
            </div>
          ) : (
            <div className="text-gray-400">
              <FaPlus size={14} />
            </div>
          )}
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
  
  // Форматирование длительности
  const formatDuration = (minutes: string) => {
    if (!minutes) return '';
    
    const mins = parseInt(minutes);
    if (mins < 60) {
      return `${mins} мин`;
    }
    
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours} ч${remainingMins > 0 ? ` ${remainingMins} мин` : ''}`;
  };
  
  // Защита маршрута: только для админов
  if (!isLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
    router.replace('/');
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Добавление новой услуги</h1>
        
        <Link href="/admin/services" className="inline-block mb-6 text-[#48a9a6] hover:underline">
          ← Вернуться к списку услуг
        </Link>
        
        {submitSuccess ? (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
            <p className="text-green-700">
              Услуга успешно добавлена! Перенаправление на страницу услуг...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Левая колонка с основными данными */}
              <div>
                <div className="mb-6">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Название услуги <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent`}
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
                
                <div className="col-span-6 sm:col-span-3">
                  <ColorPicker 
                    color={formData.color}
                    onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                    label="Цвет"
                    isRequired={true}
                    error={errors.color}
                    showSample={true}
                    sampleText="Образец цвета"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Специалисты <span className="text-red-500">*</span>
                  </label>
                  <div className="max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                    {Array.isArray(availableSpecialists) && availableSpecialists.length > 0 ? (
                      availableSpecialists.map(specialist => (
                        <SpecialistCard 
                          key={specialist.id} 
                          specialist={specialist} 
                          isSelected={formData.selectedSpecialists.includes(specialist.id)} 
                        />
                      ))
                    ) : (
                      <p className="text-center py-3 text-gray-500">Специалисты не найдены или загружаются...</p>
                    )}
                  </div>
                  {errors.selectedSpecialists && (
                    <p className="mt-1 text-sm text-red-500">{errors.selectedSpecialists}</p>
                  )}
                </div>
              </div>
              
              {/* Правая колонка с фото и предпросмотром */}
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
                
                <div className="mb-6">
                  <p className="block text-sm font-medium text-gray-700 mb-2">Предпросмотр</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="relative h-48 w-full bg-gray-100">
                      <Image
                        src={formData.image ? formData.imagePreview : getImageUrl('services/placeholder')}
                        alt="Предпросмотр изображения услуги"
                        fill
                        className="object-cover"
                        unoptimized={true}
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
                      <div className="mt-2 mb-3 flex items-center justify-between">
                        <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                          <FaRubleSign size={12} className="mr-1" />
                          <span>{formatPrice(formData.price) || '0 ₽'}</span>
                        </div>
                        <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          <FaClock size={12} className="mr-1" />
                          <span>{formatDuration(formData.duration) || '0 мин'}</span>
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
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6 mt-6 flex justify-between">
              <Link 
                href="/admin/services" 
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 flex items-center hover:bg-gray-50"
              >
                <FaTimes className="mr-2" />
                <span>Отмена</span>
              </Link>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg bg-[#48a9a6] text-white flex items-center hover:bg-[#48a9a6]/90 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
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
          </form>
        )}
      </div>
    </div>
  );
} 