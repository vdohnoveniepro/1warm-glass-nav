'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { FaUser, FaSave, FaSpinner, FaArrowLeft, FaExclamationTriangle, FaCamera, FaTrash, FaGraduationCap, FaCertificate, FaPlus } from 'react-icons/fa';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import RichTextEditor from '@/components/RichTextEditor';
import Image from 'next/image';

// Типы услуг для выбора
interface Service {
  id: string;
  name: string;
  color: string;
}

// Типы документов
interface Document {
  id: string;
  name: string;
  file: File | null;
  type: 'diploma' | 'certificate' | 'other';
  url?: string;
}

// Интерфейс профиля специалиста
interface SpecialistProfile {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  description: string;
  additionalPositions: string[];
  services: Service[];
  servicesIds: string[];
  documents: Document[];
}

// Основной компонент страницы
export default function EditSpecialistProfile() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [specialistProfile, setSpecialistProfile] = useState<SpecialistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    description: '',
    additionalPositions: [''],
    selectedServices: [] as string[],
    documents: [] as Document[],
    newPosition: ''
  });

  // Мемоизируем функцию загрузки данных
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Параллельные запросы для скорости загрузки
      const [specialistResponse, servicesResponse] = await Promise.all([
        fetch('/api/auth/me/specialist'),
        fetch('/api/services')
      ]);
      
      // Обработка ответа по специалисту
      if (!specialistResponse.ok) {
        const errorData = await specialistResponse.json();
        throw new Error(errorData.error || errorData.message || 'Ошибка при загрузке профиля специалиста');
      }
      
      const specialistData = await specialistResponse.json();
      if (!specialistData.success && !specialistData.data) {
        throw new Error(specialistData.error || specialistData.message || 'Не удалось загрузить профиль специалиста');
      }
      
      const profile = specialistData.data;
      setSpecialistProfile(profile);
      
      // Заполняем форму данными специалиста
      setFormData(prevData => ({
        ...prevData,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        description: profile.description || '',
        additionalPositions: profile.additionalPositions || [''],
        selectedServices: profile.services?.map((s: any) => s.id) || [],
        documents: profile.documents || []
      }));
      
      // Обновляем предпросмотр фото
      if (profile.photo) {
        setPhotoPreview(profile.photo);
      }
      
      // Обработка ответа по услугам
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        setAvailableServices(servicesData);
      } else {
        console.error('Ошибка при загрузке услуг');
      }
      
      setError(null);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }, []);

  // Используем useEffect для загрузки данных только при необходимости
  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    // Если пользователь не специалист, перенаправляем в обычный кабинет
    if (!isLoading && user && user.role.toUpperCase() !== 'SPECIALIST' && user.role.toUpperCase() !== 'ADMIN') {
      router.replace('/cabinet');
      return;
    }

    // Загружаем профиль только если он еще не загружен
    if (!isLoading && user && !specialistProfile) {
      fetchData();
    }
  }, [isLoading, user, router, specialistProfile, fetchData]);

  // Обработчики изменения полей формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => {
      if (prev.selectedServices.includes(serviceId)) {
        return {
          ...prev,
          selectedServices: prev.selectedServices.filter(id => id !== serviceId)
        };
      } else {
        return {
          ...prev,
          selectedServices: [...prev.selectedServices, serviceId]
        };
      }
    });
  };

  const handleAddPosition = () => {
    if (formData.newPosition.trim()) {
      setFormData(prev => ({
        ...prev,
        additionalPositions: [...prev.additionalPositions, formData.newPosition.trim()],
        newPosition: ''
      }));
    }
  };

  const handleRemovePosition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalPositions: prev.additionalPositions.filter((_, i) => i !== index)
    }));
  };

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocuments = Array.from(files).map(file => ({
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        file,
        type: file.type.includes('pdf') ? 'diploma' as const : 'certificate' as const
      }));
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...newDocuments]
      }));
    }
    
    // Сбрасываем значение input, чтобы можно было загрузить тот же файл повторно
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
  };

  const handleDocumentTypeChange = (id: string, type: 'diploma' | 'certificate' | 'other') => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(doc => 
        doc.id === id ? { ...doc, type } : doc
      )
    }));
  };

  // Мемоизируем функцию сохранения
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!specialistProfile?.id) {
        throw new Error('ID специалиста не найден');
      }

      const formDataToSend = new FormData();
      
      // Добавляем обязательные поля с проверкой
      if (!formData.firstName.trim()) {
        throw new Error('Имя обязательно для заполнения');
      }
      if (!formData.lastName.trim()) {
        throw new Error('Фамилия обязательна для заполнения');
      }
      
      formDataToSend.append('firstName', formData.firstName.trim());
      formDataToSend.append('lastName', formData.lastName.trim());
      
      // Добавляем описание
      if (formData.description) {
        formDataToSend.append('description', formData.description);
      }

      // Добавляем дополнительные позиции
      const validPositions = formData.additionalPositions.filter(pos => pos.trim());
      if (validPositions.length > 0) {
        formDataToSend.append('additionalPositions', JSON.stringify(validPositions));
      }

      // Добавляем выбранные услуги
      if (formData.selectedServices.length > 0) {
        formDataToSend.append('selectedServices', JSON.stringify(formData.selectedServices));
      }

      // Добавляем фото, если оно изменилось
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      }

      // Добавляем документы
      if (formData.documents.length > 0) {
        // Подготавливаем информацию о документах для отправки
        const documentsInfo = formData.documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type
        }));
        
        // Добавляем информацию о документах
        formDataToSend.append('documentsInfo', JSON.stringify(documentsInfo));
        
        // Добавляем файлы документов
        formData.documents.forEach((doc, index) => {
          if (doc.file) {
            formDataToSend.append(`document_${index}`, doc.file);
          }
        });
      }

      const response = await fetch(`/api/specialists/${specialistProfile.id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось обновить профиль');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Профиль успешно обновлен');
        router.push('/cabinet/specialist');
      } else {
        throw new Error(data.error || 'Не удалось обновить профиль');
      }
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить профиль');
    } finally {
      setSaving(false);
    }
  };

  // Конвертация файла в base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Отображаем загрузку
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-[#48a9a6] text-4xl mx-auto mb-4" />
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // Отображаем ошибку, если есть
  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded my-4 flex items-center">
          <FaExclamationTriangle className="mr-2" />
          <span>{error}</span>
        </div>
        <div className="text-center mt-4">
          <Link
            href="/cabinet"
            className="text-[#48a9a6] hover:text-[#48a9a6]/80 underline font-medium"
          >
            Вернуться в личный кабинет
          </Link>
        </div>
      </div>
    );
  }

  // Если профиль не найден
  if (!specialistProfile) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-700 px-4 py-3 rounded my-4">
          <p>Профиль специалиста не найден. Возможно, ваш аккаунт еще не связан с профилем специалиста.</p>
          <p className="mt-2">Обратитесь к администратору для настройки вашего профиля.</p>
        </div>
        <div className="text-center mt-4">
          <Link
            href="/cabinet"
            className="text-[#48a9a6] hover:text-[#48a9a6]/80 underline font-medium"
          >
            Вернуться в личный кабинет
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl pb-24">
      <div className="mb-6 flex items-center">
        <Link
          href="/cabinet"
          className="text-gray-600 hover:text-gray-800 flex items-center mr-4"
        >
          <FaArrowLeft className="mr-2" />
          Назад
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Мой профиль специалиста</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-[#48a9a6] p-4 text-white">
          <h2 className="text-xl font-medium">Редактирование профиля</h2>
          <p className="text-white/80 text-sm mt-1">
            Заполните информацию о себе, которая будет отображаться на сайте
          </p>
        </div>
        
        <div className="p-6">
          {/* Фото и основные данные */}
          <div className="mb-8 flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 mb-6 md:mb-0 flex flex-col items-center">
              <label className="cursor-pointer">
                <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-200 mb-3 relative group">
                  {photoPreview ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={photoPreview} 
                        alt={`${formData.firstName} ${formData.lastName}`} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <FaCamera className="text-white text-2xl" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 font-bold text-3xl text-[#48a9a6] relative">
                      {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                      <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <FaCamera className="text-white text-2xl" />
                      </div>
                    </div>
                  )}
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
              <p className="text-sm text-gray-500 text-center">
                Нажмите на фото, чтобы изменить его
              </p>
            </div>
            
            <div className="w-full md:w-2/3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                  <input 
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#48a9a6]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                  <input 
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#48a9a6]"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Специализации */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Специализация</label>
            
            <div className="mb-4">
              {formData.additionalPositions.map((position, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => {
                      const newPositions = [...formData.additionalPositions];
                      newPositions[index] = e.target.value;
                      setFormData(prev => ({ ...prev, additionalPositions: newPositions }));
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#48a9a6]"
                    placeholder="Специализация"
                  />
                  {formData.additionalPositions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePosition(index)}
                      className="ml-2 p-2 text-red-500 hover:text-red-700 focus:outline-none"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex items-center">
              <input
                type="text"
                value={formData.newPosition}
                onChange={(e) => setFormData(prev => ({ ...prev, newPosition: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#48a9a6]"
                placeholder="Добавить специализацию"
              />
              <button
                type="button"
                onClick={handleAddPosition}
                className="ml-2 p-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#48a9a6]/90 focus:outline-none"
              >
                <FaPlus />
              </button>
            </div>
          </div>
          
          {/* Услуги */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Предоставляемые услуги</label>
            
            <div className="flex flex-wrap gap-2">
              {availableServices.map(service => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceToggle(service.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-all`}
                  style={{ 
                    backgroundColor: formData.selectedServices.includes(service.id) 
                      ? service.color 
                      : `${service.color}20`,
                    color: formData.selectedServices.includes(service.id) 
                      ? 'white' 
                      : service.color
                  }}
                >
                  {service.name}
                </button>
              ))}
              
              {availableServices.length === 0 && (
                <p className="text-sm text-gray-500">Нет доступных услуг</p>
              )}
            </div>
          </div>
          
          {/* Описание */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">О себе</label>
            <RichTextEditor 
              value={formData.description} 
              onChange={handleDescriptionChange}
              placeholder="Расскажите о себе, своём опыте и подходе к работе"
            />
          </div>
          
          {/* Документы и сертификаты */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Документы и сертификаты</label>
            
            {formData.documents.length > 0 && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.documents.map(doc => (
                  <div key={doc.id} className="p-3 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        {doc.type === 'diploma' && <FaGraduationCap className="mr-2 text-[#48a9a6]" />}
                        {doc.type === 'certificate' && <FaCertificate className="mr-2 text-[#48a9a6]" />}
                        {doc.type === 'other' && <FaUser className="mr-2 text-[#48a9a6]" />}
                        <span className="text-sm font-medium">{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Тип документа:</label>
                      <select 
                        value={doc.type}
                        onChange={(e) => handleDocumentTypeChange(doc.id, e.target.value as any)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="diploma">Диплом</option>
                        <option value="certificate">Сертификат</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center mt-2">
              <button
                type="button"
                onClick={() => documentInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300 flex items-center"
              >
                <FaUser className="mr-2" />
                Загрузить документы
              </button>
              <input
                ref={documentInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleAddDocument}
              />
              <span className="ml-3 text-sm text-gray-500">Поддерживаемые форматы: PDF, JPG, PNG</span>
            </div>
          </div>
          
          {/* Кнопка сохранения */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#48a9a6]/90 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:ring-offset-2 disabled:opacity-50 flex items-center"
            >
              {saving && <FaSpinner className="animate-spin mr-2" />}
              <FaSave className={`${saving ? 'hidden' : 'mr-2'}`} />
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </form>
      
      {/* Дополнительный отступ внизу страницы */}
      <div className="h-24"></div>
    </div>
  );
}