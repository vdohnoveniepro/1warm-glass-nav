'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaLock, FaUserTag } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';
import { normalizeUserRoles } from '@/utils/user-roles';

// Определение типа пользователя
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  roles?: string[];
  createdAt: string;
  updatedAt?: string;
};

// Тип данных для отправки на сервер
type UserDataToSend = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roles: string[]; // Отправляем массив ролей
  password?: string; // Пароль необязательный
};

export default function EditUserPage() {
  const { user: currentUser, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  // Извлекаем id, используя правильный синтаксис для Next.js
  const userId = params.id as string;
  
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading2, setIsLoading2] = useState(true);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    roles: [] as string[] // Массив ролей вместо одной роли
  });
  
  // Состояние валидации формы
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  
  // Состояние отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Загрузка данных пользователя
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
          throw new Error(`Ошибка при загрузке данных: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          setUserData(data.data.user);
          
          // Заполняем форму данными пользователя
          setFormData({
            firstName: data.data.user.firstName,
            lastName: data.data.user.lastName,
            email: data.data.user.email,
            phone: data.data.user.phone || '',
            password: '', // Пароль не загружаем из соображений безопасности
            roles: normalizeUserRoles(data.data.user) // Используем функцию нормализации ролей
          });
        } else {
          toast.error(data.error || 'Ошибка при загрузке данных пользователя');
          router.push('/admin/users');
        }
      } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
        toast.error('Ошибка при загрузке данных пользователя');
        router.push('/admin/users');
      } finally {
        setIsLoading2(false);
      }
    };
    
    // Загружаем данные пользователя только если авторизация уже проверена
    if (!isLoading && currentUser && currentUser.role.toUpperCase() === 'ADMIN') {
      fetchUser();
    }
  }, [userId, isLoading, currentUser, router]);
  
  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Сбрасываем ошибку при изменении поля
    if (name in errors) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Валидация формы
  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя обязательно';
      isValid = false;
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна';
      isValid = false;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Подготавливаем данные для отправки
    const dataToSend: UserDataToSend = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      roles: formData.roles
    };
    
    // Добавляем пароль, только если он не пустой
    if (formData.password.trim()) {
      dataToSend.password = formData.password;
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Пользователь ${formData.firstName} ${formData.lastName} успешно обновлен`);
        router.push('/admin/users');
      } else {
        toast.error(data.error || 'Ошибка при обновлении пользователя');
      }
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      toast.error('Произошла ошибка при обновлении пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Защита маршрута: только для админов
  if (!isLoading && (!currentUser || currentUser.role.toUpperCase() !== 'ADMIN')) {
    // Перенаправление на главную страницу
    toast.error('У вас нет доступа к этой странице');
    router.replace('/');
    return null;
  }
  
  // Пока проверяем авторизацию или загружаем данные, показываем загрузку
  if (isLoading || isLoading2) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  // Если пользователь не найден
  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Пользователь не найден</h2>
          <p className="mb-6 text-gray-600">Пользователь с указанным ID не существует или был удален.</p>
          <Link 
            href="/admin/users" 
            className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors"
          >
            Вернуться к списку пользователей
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/admin/users" 
            className="flex items-center text-gray-600 hover:text-[#48a9a6] transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            <span>Назад к списку пользователей</span>
          </Link>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Редактирование пользователя</h1>
        
        <div className="bg-white rounded-xl shadow p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Имя */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Имя <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`pl-10 block w-full rounded-md border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent`}
                    placeholder="Введите имя"
                  />
                </div>
                {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
              </div>
              
              {/* Фамилия */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Фамилия <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`pl-10 block w-full rounded-md border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent`}
                    placeholder="Введите фамилию"
                  />
                </div>
                {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
              </div>
              
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pl-10 block w-full rounded-md border ${errors.email ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent`}
                    placeholder="Введите email"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>
              
              {/* Телефон */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Телефон
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    placeholder="Введите телефон"
                  />
                </div>
              </div>
              
              {/* Пароль (необязательно для редактирования) */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль (оставьте пустым, чтобы не менять)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    placeholder="Введите новый пароль"
                  />
                </div>
              </div>
              
              {/* Роли */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Роли пользователя
                </label>
                <div className="space-y-2">
                  {/* Роль Пользователь */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="role-user"
                      checked={formData.roles.includes('user')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, roles: [...prev.roles.filter(r => r !== 'user'), 'user'] }));
                        } else {
                          // Не позволяем удалить все роли
                          if (formData.roles.length > 1) {
                            setFormData(prev => ({ ...prev, roles: prev.roles.filter(r => r !== 'user') }));
                          } else {
                            toast.warning('Пользователь должен иметь хотя бы одну роль');
                          }
                        }
                      }}
                      className="mr-2 h-5 w-5 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                    />
                    <label htmlFor="role-user" className="text-gray-700">Пользователь</label>
                  </div>
                  
                  {/* Роль Специалист */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="role-specialist"
                      checked={formData.roles.includes('specialist')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, roles: [...prev.roles.filter(r => r !== 'specialist'), 'specialist'] }));
                        } else {
                          // Не позволяем удалить все роли
                          if (formData.roles.length > 1) {
                            setFormData(prev => ({ ...prev, roles: prev.roles.filter(r => r !== 'specialist') }));
                          } else {
                            toast.warning('Пользователь должен иметь хотя бы одну роль');
                          }
                        }
                      }}
                      className="mr-2 h-5 w-5 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                    />
                    <label htmlFor="role-specialist" className="text-gray-700">Специалист</label>
                  </div>
                  
                  {/* Роль Администратор */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="role-admin"
                      checked={formData.roles.includes('admin')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, roles: [...prev.roles.filter(r => r !== 'admin'), 'admin'] }));
                        } else {
                          // Не позволяем удалить все роли
                          if (formData.roles.length > 1) {
                            // Только сам администратор может снять с себя роль администратора
                            if (currentUser?.id === userId) {
                              setFormData(prev => ({ ...prev, roles: prev.roles.filter(r => r !== 'admin') }));
                            } else {
                              toast.warning('Снять роль администратора может только сам пользователь');
                              // Возвращаем чекбокс в исходное состояние
                              e.target.checked = true;
                            }
                          } else {
                            toast.warning('Пользователь должен иметь хотя бы одну роль');
                          }
                        }
                      }}
                      className="mr-2 h-5 w-5 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                    />
                    <label htmlFor="role-admin" className="text-gray-700">Администратор</label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Пользователь может иметь несколько ролей одновременно. Администратор имеет полный доступ к панели управления.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link
                href="/admin/users"
                className="px-4 py-2 mr-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </Link>
              <button
                type="submit"
                className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <span className="mr-2">Сохранение...</span>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  'Сохранить изменения'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 