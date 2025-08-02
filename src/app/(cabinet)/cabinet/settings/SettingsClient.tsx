'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { FaSave, FaSpinner, FaArrowLeft, FaExclamationTriangle, FaCamera, FaEye, FaEyeSlash, FaUser } from 'react-icons/fa';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: string;
}

export default function SettingsClient() {
  const { user, isLoading, updateUserInfo } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    // Инициализируем форму данными текущего пользователя
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Используем любое доступное поле с аватаркой
      const avatarUrl = user.photo || user.avatar || (user as any).photo_url;
      if (avatarUrl) {
        setPhotoPreview(avatarUrl);
      }
      
      // Отладочный вывод для проверки полей аватарки
      console.log('[SettingsClient] Данные пользователя:', { 
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        avatar: user.avatar,
        photo_url: (user as any).photo_url
      });
      
      // Проверяем, есть ли у пользователя привязка к специалисту
      // и синхронизируем данные из карточки специалиста
      if (user.specialistId) {
        const fetchSpecialistData = async () => {
          try {
            const response = await fetch('/api/auth/me/specialist');
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                const specialist = data.data;
                
                // Обновляем данные пользователя данными из карточки специалиста
                setFormData(prevData => ({
                  ...prevData,
                  firstName: specialist.firstName || prevData.firstName,
                  lastName: specialist.lastName || prevData.lastName,
                  phone: specialist.phone || prevData.phone,
                }));
                
                // Обновляем фото из профиля специалиста
                if (specialist.photo) {
                  setPhotoPreview(specialist.photo);
                }
                
                // Обновляем данные пользователя в контексте
                if (updateUserInfo) {
                  updateUserInfo({
                    ...user,
                    firstName: specialist.firstName || user.firstName,
                    lastName: specialist.lastName || user.lastName,
                    phone: specialist.phone || user.phone,
                    photo: specialist.photo || user.photo,
                  });
                }
              }
            }
          } catch (error) {
            console.error('Ошибка при получении данных специалиста:', error);
          }
        };
        
        fetchSpecialistData();
      }
      
      setLoading(false);
    }
  }, [user, isLoading, router, updateUserInfo]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Валидация формы
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('Новый пароль и подтверждение пароля не совпадают');
      return;
    }
    
    try {
      setSaving(true);
      
      // Подготавливаем данные для обновления
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      };
      
      // Если меняется email или пароль, добавляем в запрос
      if (formData.email !== user.email) {
        updateData.email = formData.email;
      }
      
      if (formData.newPassword) {
        updateData.newPassword = formData.newPassword;
      }
      
      // Если есть новое фото, добавляем его в base64
      if (photoFile) {
        const base64Photo = await convertFileToBase64(photoFile);
        updateData.photoBase64 = base64Photo;
      }
      
      // Отправляем запрос на обновление
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при обновлении профиля');
      }
      
      const data = await response.json();
      if (data.success) {
        // Обновляем информацию о пользователе в контексте
        if (updateUserInfo) {
          updateUserInfo({
            ...user,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            photo: photoPreview || user.photo,
            avatar: photoPreview || user.avatar,
          });
        }
        
        // Если пользователь указал телефон и у него не Telegram-почта,
        // удаляем флаг скрытия уведомления, чтобы оно больше не показывалось
        const hasValidPhone = formData.phone && formData.phone.trim() !== '';
        const hasNonTelegramEmail = formData.email && !formData.email.endsWith('@telegram.org');
        
        if (hasValidPhone && hasNonTelegramEmail) {
          localStorage.removeItem('profileAlertDismissed');
        }
        
        toast.success('Профиль успешно обновлен');
        
        // Перенаправляем пользователя обратно в кабинет
        setTimeout(() => {
          router.push('/cabinet');
        }, 1500);
      }
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      toast.error('Ошибка при обновлении профиля');
      setError((error as Error).message || 'Произошла ошибка при обновлении профиля');
    } finally {
      setSaving(false);
    }
  };

  // Функция для конвертации файла в base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/cabinet" className="flex items-center text-[#48a9a6] mr-4 hover:text-[#357d7a] transition-colors">
          <FaArrowLeft className="mr-2" /> Назад
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Настройки профиля</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-start">
          <FaExclamationTriangle className="mr-2 mt-1 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Фото профиля */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Фото профиля" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUser className="text-gray-400 text-5xl" />
                  </div>
                )}
              </div>
              <label 
                htmlFor="photo" 
                className="absolute bottom-0 right-0 bg-[#48a9a6] text-white p-2 rounded-full cursor-pointer hover:bg-[#357d7a] transition-colors"
              >
                <FaCamera />
                <input 
                  type="file" 
                  id="photo" 
                  name="photo"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">Нажмите на иконку камеры, чтобы загрузить новое фото</p>
          </div>
          
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Имя
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]/50"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Фамилия
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]/50"
              />
            </div>
          </div>
          
          {/* Контактная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]/50"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]/50"
              />
            </div>
          </div>
          
          {/* Смена пароля */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">Смена пароля</h3>
            
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword.new ? "text" : "password"}
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]/50 pr-10"
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            
            <div className="mb-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Подтверждение пароля
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]/50 pr-10"
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            
            <p className="text-sm text-gray-500 mt-1">Оставьте поля пустыми, если не хотите менять пароль</p>
          </div>
          
          {/* Кнопка сохранения */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#357d7a] transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Сохранение...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
