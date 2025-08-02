'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaLock, FaUserTag } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

export default function AddUserPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Состояние формы
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'user'
  });
  
  // Состояние валидации формы
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  
  // Состояние отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    
    // Валидация пароля
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Пароль должен содержать не менее 4 символов';
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
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Пользователь ${formData.firstName} ${formData.lastName} успешно создан`);
        router.push('/admin/users');
      } else {
        toast.error(data.error || 'Ошибка при создании пользователя');
      }
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      toast.error('Произошла ошибка при создании пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Защита маршрута: только для админов
  if (!isLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
    // Перенаправление на главную страницу
    toast.error('У вас нет доступа к этой странице');
    router.replace('/');
    return null;
  }
  
  // Пока проверяем авторизацию, показываем загрузку
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
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/admin/users" 
            className="flex items-center text-gray-600 hover:text-[#48a9a6] transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            <span>Назад к списку пользователей</span>
          </Link>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Добавление нового пользователя</h1>
        
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
              
              {/* Пароль */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль <span className="text-red-500">*</span>
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
                    className={`pl-10 block w-full rounded-md border ${errors.password ? 'border-red-500' : 'border-gray-300'} py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent`}
                    placeholder="Введите пароль"
                  />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
              </div>
              
              {/* Роль */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Роль
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUserTag className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent appearance-none"
                  >
                    <option value="user">Пользователь</option>
                    <option value="specialist">Специалист</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
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
                    <span className="mr-2">Создание...</span>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  'Создать пользователя'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 