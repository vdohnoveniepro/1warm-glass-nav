'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaSave, FaTimes, FaImage, FaPlus, FaTrash, FaSearch, FaUserCheck, FaUserTimes, FaUserPlus, FaUpload, FaGraduationCap, FaCertificate, FaEnvelope, FaChevronUp, FaChevronDown, FaCheck, FaCircle, FaFileAlt, FaTrashAlt } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import RichTextEditor from '@/components/RichTextEditor';
import ServiceTag from '@/components/ServiceTag';
import { toast } from '@/components/ui/Toast';
import { v4 as uuidv4 } from 'uuid';

// Типы данных
type Service = {
  id: string;
  name: string;
  color: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  photo?: string;
  roles?: string[];
};

type FormData = {
  firstName: string;
  lastName: string;
  photo: File | null;
  photoPreview: string;
  description: string;
  selectedServices: string[]; // ID выбранных услуг
  position: string; // Специализация
  additionalPositions: string[]; // Дополнительные специализации
  documents: Array<{
    id: string;
    name: string;
    file: File | null;
    type: string;
  }>;
  workSchedule: {
    enabled: boolean;
    workDays: Array<{
      day: number;
      active: boolean;
      startTime: string;
      endTime: string;
      lunchBreaks: Array<{
        id: string;
        enabled: boolean;
        startTime: string;
        endTime: string;
      }>;
    }>;
    vacations: Array<{ // Множественные отпуска
      id: string;
      enabled: boolean;
      startDate: string;
      endDate: string;
    }>;
  };
  userId: string | null;
};

export default function AddSpecialistPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние формы
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    photo: null,
    photoPreview: '/images/photoPreview.jpg',
    description: '',
    selectedServices: [],
    position: '',
    additionalPositions: [],
    documents: [],
    workSchedule: {
      enabled: true,
      workDays: [
        { 
          day: 1, 
          active: true, 
          startTime: '09:00', 
          endTime: '18:00',
          lunchBreaks: [
            {
              id: Date.now().toString() + '1',
              enabled: true,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        }, // Понедельник
        { 
          day: 2, 
          active: true, 
          startTime: '09:00', 
          endTime: '18:00',
          lunchBreaks: [
            {
              id: Date.now().toString() + '2',
              enabled: true,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        }, // Вторник
        { 
          day: 3, 
          active: true, 
          startTime: '09:00', 
          endTime: '18:00',
          lunchBreaks: [
            {
              id: Date.now().toString() + '3',
              enabled: true,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        }, // Среда
        { 
          day: 4, 
          active: true, 
          startTime: '09:00', 
          endTime: '18:00',
          lunchBreaks: [
            {
              id: Date.now().toString() + '4',
              enabled: true,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        }, // Четверг
        { 
          day: 5, 
          active: true, 
          startTime: '09:00', 
          endTime: '18:00',
          lunchBreaks: [
            {
              id: Date.now().toString() + '5',
              enabled: true,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        }, // Пятница
        { 
          day: 6, 
          active: false, 
          startTime: '09:00', 
          endTime: '18:00',
          lunchBreaks: [
            {
              id: Date.now().toString() + '6',
              enabled: false,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        }, // Суббота
        { 
          day: 0, 
          active: false, 
          startTime: '09:00', 
          endTime: '18:00',
          lunchBreaks: [
            {
              id: Date.now().toString() + '0',
              enabled: false,
              startTime: '13:00',
              endTime: '14:00'
            }
          ]
        }, // Воскресенье
      ],
      vacations: [
        {
          id: Date.now().toString(),
          enabled: false,
          startDate: '',
          endDate: ''
        }
      ]
    },
    userId: null
  });
  
  // Состояние для предпросмотра изображения больше не нужно отдельно, оно в FormData
  
  // Ошибки валидации
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  
  // Список доступных услуг (в реальном приложении будет загружаться с сервера)
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  
  // Загрузка списка услуг при монтировании компонента
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('Ошибка при загрузке услуг');
        const data = await response.json();
        setAvailableServices(data);
      } catch (error) {
        console.error('Ошибка при загрузке услуг:', error);
      }
    };
    
    fetchServices();
  }, []);
  
  // Состояние отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Загрузка списка пользователей при монтировании компонента
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Дополнительное состояние для индикатора загрузки
  const [isSearching, setIsSearching] = useState(false);
  
  // Загрузка списка пользователей при монтировании компонента
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Загрузка пользователей
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success && data.data && Array.isArray(data.data.users)) {
          // Загрузка всех специалистов, чтобы проверить, какие пользователи уже привязаны
          const specialistsResponse = await fetch('/api/specialists');
          const specialistsData = await specialistsResponse.json();
          
          // Получаем список ID пользователей, уже привязанных к специалистам
          const assignedUserIds = specialistsData.success 
            ? specialistsData.data
                .filter((specialist: any) => specialist.userId)
                .map((specialist: any) => specialist.userId)
            : [];
          
          console.log('Уже привязанные пользователи:', assignedUserIds);
          
          // Фильтрация пользователей, исключая уже привязанных к специалистам
          const availableUsersList = data.data.users.filter((user: User) => {
            // Для каждого пользователя проверяем его роли
            const userRoles = user.roles || [user.role.toLowerCase()];
            
            // Не отображаем уже привязанных пользователей
            if (assignedUserIds.includes(user.id)) {
              return false;
            }
            
            return true;
          });
          
          setAvailableUsers(availableUsersList);
          setFilteredUsers(availableUsersList);
        }
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      }
    };

    fetchUsers();
  }, []);
  
  // Состояние для формы нового пользователя
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'specialist'
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserErrors, setNewUserErrors] = useState<{[key: string]: string}>({});
  
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
  
  // Обработчик изменения URL фотографии - заменяем на загрузку файла
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Проверяем, что это изображение
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Пожалуйста, загрузите изображение' }));
      return;
    }
    
    // Создаем URL для предпросмотра
    const previewUrl = URL.createObjectURL(file);
    
    setFormData(prev => ({ 
      ...prev, 
      photo: file,
      photoPreview: previewUrl
    }));
    
    // Убираем ошибку, если она была
    if (errors.photo) {
      setErrors(prev => ({ ...prev, photo: undefined }));
    }
  };
  
  // Функция для открытия диалога выбора файла
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Обработчик выбора услуг
  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedServices.includes(serviceId);
      let newSelected: string[];
      
      if (isSelected) {
        // Если услуга уже выбрана, удаляем её
        newSelected = prev.selectedServices.filter(id => id !== serviceId);
      } else {
        // Иначе добавляем в выбранные
        newSelected = [...prev.selectedServices, serviceId];
      }
      
      return { ...prev, selectedServices: newSelected };
    });
  };
  
  // Обработчик изменения специализации
  const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, position: e.target.value }));
  };

  // Обработчик добавления дополнительной специализации
  const handleAddPosition = () => {
    if (formData.position.trim()) {
      setFormData(prev => ({
        ...prev,
        additionalPositions: [...prev.additionalPositions, prev.position],
        position: ''
      }));
    }
  };

  // Обработчик удаления дополнительной специализации
  const handleRemovePosition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalPositions: prev.additionalPositions.filter((_, i) => i !== index)
    }));
  };

  // Обработчик добавления документа
  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocuments = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
      type: file.type.includes('pdf') ? 'diploma' : 'certificate'
    }));

    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocuments]
    }));
  };

  // Обработчик удаления документа
  const handleRemoveDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
  };

  // Обработчик изменения рабочего времени
  const handleWorkScheduleChange = (dayIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        workDays: prev.workSchedule.workDays.map((day, index) => 
          index === dayIndex ? { ...day, [field]: value } : day
        )
      }
    }));
  };

  // Обработчик добавления обеденного перерыва для конкретного дня
  const handleAddLunchBreak = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        workDays: prev.workSchedule.workDays.map((day, index) => {
          if (index === dayIndex) {
            return {
              ...day,
              lunchBreaks: [
                ...day.lunchBreaks,
                {
                  id: Date.now().toString(),
                  enabled: true,
                  startTime: '13:00',
                  endTime: '14:00'
                }
              ]
            };
          }
          return day;
        })
      }
    }));
  };

  // Обработчик удаления обеденного перерыва для конкретного дня
  const handleRemoveLunchBreak = (dayIndex: number, breakId: string) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        workDays: prev.workSchedule.workDays.map((day, index) => {
          if (index === dayIndex) {
            return {
              ...day,
              lunchBreaks: day.lunchBreaks.filter(break_ => break_.id !== breakId)
            };
          }
          return day;
        })
      }
    }));
  };

  // Обработчик изменения обеденного перерыва для конкретного дня
  const handleLunchBreakChange = (dayIndex: number, breakId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        workDays: prev.workSchedule.workDays.map((day, index) => {
          if (index === dayIndex) {
            return {
              ...day,
              lunchBreaks: day.lunchBreaks.map(break_ => 
                break_.id === breakId ? { ...break_, [field]: value } : break_
              )
            };
          }
          return day;
        })
      }
    }));
  };

  // Обработчик добавления отпуска
  const handleAddVacation = () => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        vacations: [
          ...prev.workSchedule.vacations,
          {
            id: Date.now().toString(),
            enabled: false,
            startDate: '',
            endDate: ''
          }
        ]
      }
    }));
  };

  // Обработчик удаления отпуска
  const handleRemoveVacation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        vacations: prev.workSchedule.vacations.filter(vacation => vacation.id !== id)
      }
    }));
  };

  // Обработчик изменения отпуска
  const handleVacationChange = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        vacations: prev.workSchedule.vacations.map(vacation => 
          vacation.id === id ? { ...vacation, [field]: value } : vacation
        )
      }
    }));
  };
  
  // Функция для поиска пользователей
  const handleUserSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.toLowerCase();
    setUserSearchTerm(searchTerm);
    
    try {
      setIsSearching(true);
      
      if (searchTerm.trim() === '') {
        // Загружаем всех доступных пользователей если поиск пустой
        setFilteredUsers(availableUsers);
        setIsSearching(false);
        return;
      }
      
      // Используем API для поиска пользователей
      const response = await fetch(`/api/admin/users/search?query=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка при поиске пользователей: ${response.status} ${response.statusText}`, errorText);
        toast.error('Ошибка при поиске пользователей');
        setFilteredUsers([]);
        setIsSearching(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data && Array.isArray(data.data.users)) {
        console.log(`Найдено ${data.data.users.length} пользователей по запросу "${searchTerm}"`);
        
        // Загрузка всех специалистов, чтобы проверить, какие пользователи уже привязаны
        const specialistsResponse = await fetch('/api/specialists');
        const specialistsData = await specialistsResponse.json();
        
        // Получаем список ID пользователей, уже привязанных к специалистам
        const assignedUserIds = specialistsData.success 
          ? specialistsData.data
              .filter((specialist: any) => specialist.userId)
              .map((specialist: any) => specialist.userId)
          : [];
        
        console.log('Уже привязанные пользователи:', assignedUserIds);
        
        // Фильтрация пользователей, исключая уже привязанных к специалистам
        const filteredUsers = data.data.users.filter((user: User) => {
          // Не отображаем уже привязанных пользователей
          if (assignedUserIds.includes(user.id)) {
            return false;
          }
          
          return true;
        });
        
        setFilteredUsers(filteredUsers);
      } else {
        console.warn('Неверный формат данных при поиске пользователей:', data);
        setFilteredUsers([]);
        if (!data.success) {
          toast.error(data.message || 'Ошибка при поиске пользователей');
        }
      }
    } catch (error) {
      console.error('Ошибка при поиске пользователей:', error);
      toast.error('Ошибка при поиске пользователей');
      setFilteredUsers([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Обработчик выбора пользователя
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setFormData(prev => ({ ...prev, userId: user.id }));
    setShowUserSearch(false);
    
    // Получаем список ролей пользователя
    const userRoles = user.roles || [user.role.toLowerCase()];
    
    // Если пользователь уже имеет роль специалиста, то просто показываем сообщение
    if (userRoles.includes('specialist')) {
      toast.info(`Пользователь ${user.firstName} ${user.lastName} уже имеет роль специалиста`);
    }
    
    // Добавляем роль специалиста, сохраняя существующие роли
    // Специалист еще не создан, поэтому specialistId будет добавлен позже при сохранении
    fetch(`/api/admin/users/${user.id}/update-role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        role: 'specialist', 
        action: 'add'
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast.success(`Роль "Специалист" добавлена для ${user.firstName} ${user.lastName}`);
        } else {
          toast.error(`Ошибка при добавлении роли специалиста: ${data.message}`);
        }
      })
      .catch(error => {
        console.error('Ошибка при обновлении роли пользователя:', error);
        toast.error('Произошла ошибка при добавлении роли специалиста');
      });
  };
  
  // Обработчик отмены привязки пользователя
  const handleClearUser = () => {
    // Сохраняем ID пользователя перед сбросом
    const userId = selectedUser?.id;
    const userName = selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : '';
    
    // Сбрасываем связь
    setSelectedUser(null);
    setFormData(prev => ({ ...prev, userId: null }));
    
    // Если был пользователь, возвращаем ему роль "user"
    if (userId) {
      fetch(`/api/admin/users/${userId}/update-role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'user' }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            toast.success(`Роль пользователя ${userName} изменена на "Пользователь"`);
          } else {
            toast.error(`Ошибка при сбросе роли пользователя: ${data.message}`);
          }
        })
        .catch(error => {
          console.error('Ошибка при сбросе роли пользователя:', error);
          toast.error('Произошла ошибка при сбросе роли пользователя');
        });
    }
  };
  
  // Обработчик изменения полей формы нового пользователя
  const handleNewUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUserForm(prev => ({ ...prev, [name]: value }));
    
    // При изменении поля убираем ошибку для этого поля
    if (newUserErrors[name]) {
      setNewUserErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Валидация формы нового пользователя
  const validateNewUserForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!newUserForm.firstName.trim()) {
      errors.firstName = 'Введите имя';
    }
    
    if (!newUserForm.lastName.trim()) {
      errors.lastName = 'Введите фамилию';
    }
    
    if (!newUserForm.email.trim()) {
      errors.email = 'Введите email';
    } else if (!/\S+@\S+\.\S+/.test(newUserForm.email)) {
      errors.email = 'Введите корректный email';
    }
    
    // Валидация пароля
    if (newUserForm.password === '') {
      errors.password = 'Пароль обязателен';
    } else if (newUserForm.password.length < 4) {
      errors.password = 'Пароль должен содержать не менее 4 символов';
    }
    
    setNewUserErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Создание нового пользователя
  const handleCreateNewUser = async () => {
    if (!validateNewUserForm()) {
      return;
    }
    
    setIsCreatingUser(true);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserForm),
      });
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.user) {
        toast.success('Пользователь успешно создан');
        
        // Выбираем созданного пользователя в качестве специалиста
        const newUser = data.data.user;
        setSelectedUser(newUser);
        setFormData(prev => ({ ...prev, userId: newUser.id }));
        
        // Скрываем форму создания
        setShowCreateUserForm(false);
        setShowUserSearch(false);
        
        // Очищаем форму
        setNewUserForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'specialist'
        });
      } else {
        toast.error(data.error || 'Ошибка при создании пользователя');
      }
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      toast.error('Произошла ошибка при создании пользователя');
    } finally {
      setIsCreatingUser(false);
    }
  };
  
  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    let errorMessage = '';
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Введите имя специалиста';
      errorMessage = 'Введите имя специалиста';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Введите фамилию специалиста';
      if (!errorMessage) errorMessage = 'Введите фамилию специалиста';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Введите описание специалиста';
      if (!errorMessage) errorMessage = 'Введите описание специалиста';
    }
    
    if (formData.selectedServices.length === 0) {
      newErrors.selectedServices = 'Выберите хотя бы одну услугу';
      if (!errorMessage) errorMessage = 'Выберите хотя бы одну услугу';
    }
    
    setErrors(newErrors);
    
    // Показываем toast-уведомление, если есть ошибки
    if (Object.keys(newErrors).length > 0) {
      toast.error(errorMessage || 'Пожалуйста, исправьте ошибки в форме');
      
      // Скроллим к первой ошибке
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    return Object.keys(newErrors).length === 0;
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки в форме');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Добавляем основные поля
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      if (formData.description) {
        formDataToSend.append('description', formData.description);
      }
      if (formData.position) {
        formDataToSend.append('position', formData.position);
      }
      
      // Добавляем фото
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo);
      }
      
      // Добавляем дополнительные позиции
      if (formData.additionalPositions.length > 0) {
        formDataToSend.append('additionalPositions', JSON.stringify(formData.additionalPositions));
      }
      
      // Добавляем выбранные услуги
      if (formData.selectedServices.length > 0) {
        formDataToSend.append('selectedServices', JSON.stringify(formData.selectedServices));
      }
      
      // Добавляем документы
      if (formData.documents.length > 0) {
        // Конвертируем документы в нужный формат
        const documentsData = formData.documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          file: doc.file,
          type: doc.type
        }));
        
        formDataToSend.append('documentsInfo', JSON.stringify(documentsData));
        
        // Добавляем файлы документов
        formData.documents.forEach(doc => {
          if (doc.file) {
            formDataToSend.append(`document_${doc.id}`, doc.file);
          }
        });
      }
      
      // Добавляем расписание работы
      formDataToSend.append('workSchedule', JSON.stringify(formData.workSchedule));
      
      // Добавляем привязку к пользователю
      if (formData.userId) {
        formDataToSend.append('userId', formData.userId);
      }
      
      // Отправляем запрос на сервер
      const response = await fetch('/api/specialists', {
        method: 'POST',
        body: formDataToSend,
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Специалист успешно создан');
        
        // Если есть привязанный пользователь и создание специалиста успешно, обновляем specialistId пользователя
        if (data.success && data.data && data.data.id && formData.userId) {
          try {
            // Обновляем specialistId у пользователя
            await fetch(`/api/admin/users/${formData.userId}/update-role`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                role: 'specialist', 
                action: 'add',
                specialistId: data.data.id
              }),
            });
            console.log(`Обновлен specialistId пользователя ${formData.userId} на ${data.data.id}`);
          } catch (userUpdateError) {
            console.error('Ошибка при обновлении specialistId пользователя:', userUpdateError);
            // Продолжаем выполнение, даже если обновление не удалось
          }
        }
        
        // Также синхронизируем расписание с отдельным файлом
        if (data.success && data.data && data.data.id) {
          try {
            await fetch(`/api/specialists/${data.data.id}/update-schedule`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ workSchedule: formData.workSchedule }),
            });
          } catch (syncError) {
            console.error('Ошибка при синхронизации графика:', syncError);
            // Продолжаем выполнение, даже если синхронизация не удалась
          }
        }
        
        // Перенаправляем на страницу списка специалистов
        router.push('/admin/specialists');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Произошла ошибка при создании специалиста');
      }
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      toast.error('Произошла ошибка при создании специалиста');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Защита маршрута: только для админов
  if (!isLoading && (!user || user.role.toUpperCase() !== 'ADMIN')) {
    // Если пользователь не администратор, перенаправляем на главную страницу
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Добавление нового специалиста</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        {/* Существующие поля */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full p-2 border rounded-md bg-white"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Фамилия
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full p-2 border rounded-md bg-white"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Поле специализации */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Специализация
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={formData.position}
              onChange={handlePositionChange}
              className="w-full p-2 border rounded-md bg-white"
              placeholder="Введите специализацию"
            />
            <button
              type="button"
              onClick={handleAddPosition}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              +
            </button>
          </div>
          
          {/* Список дополнительных специализаций */}
          {formData.additionalPositions.length > 0 && (
            <div className="mt-2 space-y-2">
              {formData.additionalPositions.map((position, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <span className="text-sm">{position}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePosition(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Существующее поле фото */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Фотография
          </label>
          <div className="flex items-center space-x-4">
            <div className="relative w-24 h-24">
              <Image
                src={formData.photoPreview}
                alt="Preview"
                fill
                className="object-cover rounded-md"
              />
            </div>
            <button
              type="button"
              onClick={triggerFileInput}
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <FaImage className="text-gray-600" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Новое поле - Документы */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Документы (дипломы, сертификаты)
          </label>
          <div className="space-y-2">
            {formData.documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <span className="text-sm">{doc.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
            <input
              type="file"
              onChange={handleAddDocument}
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
        </div>

        {/* Существующее поле описания */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <RichTextEditor
            value={formData.description}
            onChange={handleDescriptionChange}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* Существующее поле выбора услуг */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Услуги
          </label>
          <div className="flex flex-wrap gap-2">
            {availableServices.map(service => (
              <ServiceTag
                key={service.id}
                service={service}
                isSelected={formData.selectedServices.includes(service.id)}
                onClick={() => handleServiceToggle(service.id)}
              />
            ))}
          </div>
          {errors.selectedServices && (
            <p className="text-red-500 text-sm mt-1">{errors.selectedServices}</p>
          )}
        </div>

        {/* Рабочее время */}
        <div className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-4">Рабочее время</h3>
          
          <div className="space-y-6">
            {formData.workSchedule.workDays.map((day, index) => (
              <div key={day.day} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="w-32">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={day.active}
                        onChange={(e) => handleWorkScheduleChange(index, 'active', e.target.checked)}
                        className="rounded"
                      />
                      <span className="font-medium">{getDayName(day.day)}</span>
                    </label>
                  </div>
                  
                  {day.active && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => handleWorkScheduleChange(index, 'startTime', e.target.value)}
                        className="p-1 border rounded bg-white"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => handleWorkScheduleChange(index, 'endTime', e.target.value)}
                        className="p-1 border rounded bg-white"
                      />
                    </div>
                  )}
                </div>
                
                {day.active && (
                  <div className="ml-8">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Обеденные перерывы</h4>
                      <button
                        type="button"
                        onClick={() => handleAddLunchBreak(index)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                      >
                        + Добавить перерыв
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {day.lunchBreaks.map(break_ => (
                        <div key={break_.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={break_.enabled}
                              onChange={(e) => handleLunchBreakChange(index, break_.id, 'enabled', e.target.checked)}
                              className="rounded"
                            />
                            {break_.enabled && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="time"
                                  value={break_.startTime}
                                  onChange={(e) => handleLunchBreakChange(index, break_.id, 'startTime', e.target.value)}
                                  className="p-1 border rounded bg-white"
                                />
                                <span>-</span>
                                <input
                                  type="time"
                                  value={break_.endTime}
                                  onChange={(e) => handleLunchBreakChange(index, break_.id, 'endTime', e.target.value)}
                                  className="p-1 border rounded bg-white"
                                />
                              </div>
                            )}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveLunchBreak(index, break_.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Отпуска */}
        <div className="border rounded-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Отпуска</h3>
            <button
              type="button"
              onClick={handleAddVacation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Добавить отпуск
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.workSchedule.vacations.map(vacation => (
              <div key={vacation.id} className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={vacation.enabled}
                      onChange={(e) => handleVacationChange(vacation.id, 'enabled', e.target.checked)}
                      className="rounded"
                    />
                    <span>Включить отпуск</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveVacation(vacation.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </div>
                
                {vacation.enabled && (
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm text-gray-600">Начало</label>
                      <input
                        type="date"
                        value={vacation.startDate}
                        onChange={(e) => handleVacationChange(vacation.id, 'startDate', e.target.value)}
                        className="p-1 border rounded bg-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600">Конец</label>
                      <input
                        type="date"
                        value={vacation.endDate}
                        onChange={(e) => handleVacationChange(vacation.id, 'endDate', e.target.value)}
                        className="p-1 border rounded bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Привязка к аккаунту пользователя */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Привязка к аккаунту пользователя
          </label>
          
          {selectedUser ? (
            <div className="border rounded-md p-4 mb-2 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedUser.photo ? (
                      <img src={selectedUser.photo} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} className="object-cover w-full h-full" />
                    ) : (
                      <FaUserCheck size={22} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-lg">{selectedUser.firstName} {selectedUser.lastName}</div>
                    <div className="text-sm text-gray-600 flex items-center space-x-1">
                      <FaEnvelope className="text-gray-500" size={12} />
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="mt-1">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {selectedUser.role.toUpperCase() === 'SPECIALIST' ? 'Специалист' : selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearUser}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                  title="Отвязать пользователя"
                >
                  <FaUserTimes size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => setShowUserSearch(true)}
                className="w-full p-3 border border-dashed rounded-md text-gray-500 hover:text-[#48a9a6] hover:border-[#48a9a6] flex items-center justify-center transition-colors"
              >
                <FaUserPlus size={18} className="mr-2" />
                <span>Выбрать существующего пользователя</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowCreateUserForm(true);
                  setShowUserSearch(false);
                }}
                className="w-full p-3 border border-dashed rounded-md text-gray-500 hover:text-green-600 hover:border-green-600 flex items-center justify-center transition-colors"
              >
                <FaUserPlus size={18} className="mr-2" />
                <span>Создать нового пользователя</span>
              </button>
            </div>
          )}
          
          {showUserSearch && (
            <div className="mt-2 border rounded-md p-4 shadow-md bg-white">
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={handleUserSearch}
                    placeholder="Поиск по имени, фамилии или email..."
                    className="w-full p-3 pl-10 border rounded-md focus:ring-2 focus:ring-[#48a9a6] focus:border-[#48a9a6] transition-all"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-[#48a9a6] border-r-2"></div>
                    ) : (
                      <FaSearch />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#48a9a6] border-r-2 mx-auto mb-2"></div>
                    <p className="text-gray-500">Выполняется поиск...</p>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="p-3 hover:bg-gray-50 cursor-pointer rounded-md flex justify-between items-center border border-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {user.photo ? (
                              <img src={user.photo} alt={`${user.firstName} ${user.lastName}`} className="object-cover w-full h-full" />
                            ) : (
                              <FaUser size={16} className="text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            {user.role.toLowerCase() === 'admin' && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                Администратор
                              </span>
                            )}
                          </div>
                        </div>
                        <FaUserCheck className="text-[#48a9a6]" size={18} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-md">
                    <FaSearch size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">
                      {userSearchTerm 
                        ? `По запросу "${userSearchTerm}" пользователи не найдены` 
                        : "Введите имя, фамилию или email для поиска"}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUserSearch(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
          
          {/* Форма создания нового пользователя */}
          {showCreateUserForm && (
            <div className="mt-2 border rounded-md p-6 shadow-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Создание нового пользователя</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateUserForm(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <FaTimes size={16} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Имя <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={newUserForm.firstName}
                      onChange={handleNewUserFormChange}
                      className="w-full p-2 border rounded-md"
                      placeholder="Введите имя"
                    />
                    {newUserErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{newUserErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Фамилия <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={newUserForm.lastName}
                      onChange={handleNewUserFormChange}
                      className="w-full p-2 border rounded-md"
                      placeholder="Введите фамилию"
                    />
                    {newUserErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{newUserErrors.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newUserForm.email}
                    onChange={handleNewUserFormChange}
                    className="w-full p-2 border rounded-md"
                    placeholder="example@email.com"
                  />
                  {newUserErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{newUserErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Пароль <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={newUserForm.password}
                    onChange={handleNewUserFormChange}
                    className="w-full p-2 border rounded-md"
                    placeholder="Введите пароль (мин. 6 символов)"
                  />
                  {newUserErrors.password && (
                    <p className="text-red-500 text-xs mt-1">{newUserErrors.password}</p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserForm(false)}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewUser}
                    disabled={isCreatingUser}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isCreatingUser ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-r-2"></div>
                        <span>Создание...</span>
                      </div>
                    ) : (
                      'Создать и выбрать'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mt-2">
            <strong>Примечание:</strong> Привязка позволит пользователю получить доступ к личному кабинету специалиста и управлять своими записями
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/admin/specialists"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Вспомогательная функция для получения названия дня недели
function getDayName(day: number): string {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return days[day];
} 