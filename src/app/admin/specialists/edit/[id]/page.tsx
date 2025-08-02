'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { FaSave, FaTimes, FaImage, FaPlus, FaTrash, FaSearch, FaUserCheck, FaUserTimes, FaUserPlus, FaUser, FaEnvelope } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import RichTextEditor from '@/components/RichTextEditor';
import ServiceTag from '@/components/ServiceTag';
import { toast } from '@/components/ui/Toast';
import { FaUpload } from 'react-icons/fa';
import { FaGraduationCap, FaCertificate } from 'react-icons/fa';
import { FaCheck } from 'react-icons/fa';

// Типы данных
type Service = {
  id: string;
  name: string;
  color: string;
};

type Specialist = {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  description: string;
  position: string;
  additionalPositions: string[];
  services: Service[];
  documents: Array<{
    id: string;
    name: string;
    file?: string;
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
    vacations: Array<{
      id: string;
      enabled: boolean;
      startDate: string;
      endDate: string;
    }>;
  };
  userId: string | null;
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
  id: string;
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

export default function EditSpecialistPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // Начальная структура расписания работы
  const defaultWorkSchedule = {
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
  };

  // Состояние формы с начальными данными
  const [formData, setFormData] = useState<FormData>({
    id: '',
    firstName: '',
    lastName: '',
    photo: null,
    photoPreview: '/images/photoPreview.jpg',
    description: '',
    selectedServices: [],
    position: '',
    additionalPositions: [],
    documents: [],
    workSchedule: defaultWorkSchedule,
    userId: null
  });
  
  // Ошибки валидации
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  
  // Список доступных услуг
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  
  // Состояние загрузки специалиста
  const [isLoading2, setIsLoading2] = useState(true);
  const [specialistData, setSpecialistData] = useState<Specialist | null>(null);
  
  // Состояние отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Состояния для работы с пользователями
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Загрузка данных специалиста при монтировании компонента
  useEffect(() => {
    const fetchSpecialist = async () => {
      try {
        // Проверяем роль пользователя
        if (!user || user.role.toUpperCase() !== 'ADMIN') {
          router.push('/admin');
          return;
        }
        
        setIsLoading2(true);
        const response = await fetch(`/api/specialists/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке данных специалиста');
        }
        
        const responseData = await response.json();
        
        // Проверяем структуру ответа и получаем данные специалиста
        if (!responseData.success || !responseData.data) {
          throw new Error('Некорректный формат данных');
        }
        
        const specialist = responseData.data;
        setSpecialistData(specialist);
        
        // Заполняем форму данными специалиста
        setFormData({
          id: specialist.id || '',
          firstName: specialist.firstName || '',
          lastName: specialist.lastName || '',
          photo: null, // Файл не передается через API
          photoPreview: specialist.photo || '/images/photoPreview.jpg',
          description: specialist.description || '',
          selectedServices: specialist.services?.map((s: Service) => s.id) || [],
          position: specialist.position || '',
          additionalPositions: specialist.additionalPositions || [],
          documents: specialist.documents?.map((doc: any) => ({
            id: doc.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: doc.name || 'Документ',
            file: null, // Файл не передается через API
            type: doc.type || 'certificate'
          })) || [],
          workSchedule: specialist.workSchedule || defaultWorkSchedule,
          userId: specialist.userId || null
        });
        
        // Если у специалиста есть связанный пользователь, находим его
        if (specialist.userId) {
          const userResponse = await fetch(`/api/admin/users/${specialist.userId}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.success && userData.data && userData.data.user) {
              setSelectedUser(userData.data.user);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        toast.error('Не удалось загрузить данные специалиста');
        router.push('/admin/specialists');
      } finally {
        setIsLoading2(false);
      }
    };
    
    if (!isLoading && user) {
      fetchSpecialist();
    }
  }, [isLoading, user, params.id, router]);
  
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
                .filter((specialist: any) => 
                  specialist.userId && specialist.id !== params.id // Исключаем текущего специалиста
                )
                .map((specialist: any) => specialist.userId)
            : [];
          
          console.log('Уже привязанные пользователи (кроме текущего):', assignedUserIds);
          
          // Фильтрация пользователей, исключая уже привязанных к другим специалистам
          const availableUsersList = data.data.users.filter((user: User) => 
            !assignedUserIds.includes(user.id) || user.id === specialistData?.userId
          );
          
          setAvailableUsers(availableUsersList);
          setFilteredUsers(availableUsersList);
        }
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      }
    };

    if (specialistData) {
      fetchUsers();
    }
  }, [specialistData, params.id]);

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
  
  // Функция для открытия диалога выбора документов
  const triggerDocumentInput = () => {
    if (documentInputRef.current) {
      documentInputRef.current.click();
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
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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

  // Обработчик изменения обеденного перерыва
  const handleLunchBreakChange = (dayIndex: number, breakIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        workDays: prev.workSchedule.workDays.map((day, dIndex) => {
          if (dIndex === dayIndex) {
            return {
              ...day,
              lunchBreaks: day.lunchBreaks.map((breakItem, bIndex) => {
                if (bIndex === breakIndex) {
                  return { ...breakItem, [field]: value };
                }
                return breakItem;
              })
            };
          }
          return day;
        })
      }
    }));
  };

  // Обработчик удаления обеденного перерыва
  const handleRemoveLunchBreak = (dayIndex: number, breakIndex: number) => {
    setFormData(prev => ({
      ...prev,
                        workSchedule: {
        ...prev.workSchedule,
        workDays: prev.workSchedule.workDays.map((day, dIndex) => {
          if (dIndex === dayIndex) {
            return {
              ...day,
              lunchBreaks: day.lunchBreaks.filter((_, bIndex) => bIndex !== breakIndex)
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
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            enabled: true,
            startDate: '',
            endDate: ''
          }
        ]
      }
    }));
  };
  
  // Обработчик изменения отпуска
  const handleVacationChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
                        workSchedule: {
        ...prev.workSchedule,
        vacations: prev.workSchedule.vacations.map((vacation, vIndex) => {
          if (vIndex === index) {
            return { ...vacation, [field]: value };
          }
          return vacation;
        })
      }
    }));
  };
  
  // Обработчик удаления отпуска
  const handleRemoveVacation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        vacations: prev.workSchedule.vacations.filter((_, vIndex) => vIndex !== index)
      }
    }));
  };
  
  // Обработчик поиска пользователей
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
      const data = await response.json();
      
      if (data.success && data.data && Array.isArray(data.data.users)) {
        // Фильтруем результаты поиска, оставляя только пользователей, которые не привязаны к другим специалистам
        const assignedUserIds = availableUsers.map(user => user.id);
        const currentSpecialistUserId = specialistData?.userId;
        
        const searchResults = data.data.users.filter((user: User) => 
          assignedUserIds.includes(user.id) || user.id === currentSpecialistUserId
        );
        
        setFilteredUsers(searchResults);
      } else {
        setFilteredUsers([]);
        if (!data.success) {
          toast.error(data.message || 'Ошибка при поиске пользователей');
        }
      }
    } catch (error) {
      console.error('Ошибка при поиске пользователей:', error);
      toast.error('Ошибка при поиске пользователей');
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
    
    // Если пользователь уже имеет роль специалиста, то ничего не делаем
    if (userRoles.includes('specialist')) {
      toast.info(`Пользователь ${user.firstName} ${user.lastName} уже имеет роль специалиста`);
    }
    
    // Добавляем роль специалиста и обновляем specialistId, сохраняя существующие роли
    fetch(`/api/admin/users/${user.id}/update-role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        role: 'specialist', 
        action: 'add',
        specialistId: params.id
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
  
  // Обработчик удаления связи с пользователем
  const handleClearUser = () => {
    // Сохраняем ID пользователя перед сбросом
    const userId = selectedUser?.id;
    const userName = selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : '';
    
    // Сбрасываем связь
    setSelectedUser(null);
    setFormData(prev => ({ ...prev, userId: null }));
    
    // Если был пользователь, удаляем у него роль "specialist", но сохраняем другие роли
    if (userId) {
      // Сначала обновляем специалиста, удаляя связь с пользователем
      fetch(`/api/specialists/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: null }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Связь с пользователем удалена у специалиста');
          
          // Теперь обновляем пользователя, удаляя роль специалиста
          return fetch(`/api/admin/users/${userId}/update-role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'specialist', action: 'remove' }),
          });
        } else {
          throw new Error(data.error || 'Ошибка при обновлении специалиста');
        }
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            toast.success(`Роль "Специалист" удалена у ${userName}`);
                    } else {
            toast.error(`Ошибка при удалении роли специалиста: ${data.message}`);
          }
        })
        .catch(error => {
          console.error('Ошибка при удалении роли специалиста:', error);
          toast.error('Произошла ошибка при удалении роли специалиста');
        });
    }
  };
  
  // Валидация формы перед отправкой
  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя специалиста обязательно для заполнения';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия специалиста обязательна для заполнения';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Описание специалиста обязательно для заполнения';
    }
    
    setErrors(newErrors);
    
    // Если есть ошибки, возвращаем false
    return Object.keys(newErrors).length === 0;
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Валидация формы
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки в форме');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Подготавливаем данные для отправки
      const formDataToSend = new FormData();
      
      // Добавляем базовые поля
      formDataToSend.append('id', formData.id);
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('additionalPositions', JSON.stringify(formData.additionalPositions));
      formDataToSend.append('description', formData.description);
      formDataToSend.append('selectedServices', JSON.stringify(formData.selectedServices));
      
      // Очень важно: добавляем userId корректно, даже если null
      formDataToSend.append('userId', formData.userId === null ? 'null' : formData.userId);
      
      console.log('Отправка userId:', formData.userId);
      
      // Добавляем фото, если оно изменено
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo);
      }
      
      // Добавляем информацию о документах
      const documentsInfo = formData.documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type
      }));
      formDataToSend.append('documentsInfo', JSON.stringify(documentsInfo));
      
      // Добавляем файлы документов, если они есть
      formData.documents.forEach((doc, index) => {
        if (doc.file) {
          formDataToSend.append(`document_${index}`, doc.file);
        }
      });
      
      // Добавляем расписание работы
      formDataToSend.append('workSchedule', JSON.stringify(formData.workSchedule));
      
      // Отправляем запрос на сервер
      const response = await fetch(`/api/specialists/${formData.id}`, {
        method: 'PUT',
        body: formDataToSend,
      });
      
      if (response.ok) {
        toast.success('Специалист успешно обновлен');
        setSubmitSuccess(true);
        
        // Перенаправляем на страницу списка специалистов
        setTimeout(() => {
          router.push('/admin/specialists');
        }, 1500);
      } else {
        // Обрабатываем ошибку, проверяя наличие данных в ответе
        let errorMessage = 'Ошибка при обновлении специалиста';
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            errorMessage = data.message || data.error || errorMessage;
          } else {
            errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
          }
        } catch (jsonError) {
          console.error('Ошибка при разборе JSON ответа:', jsonError);
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      toast.error('Произошла ошибка при обновлении специалиста');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Редактирование специалиста</h1>
        
        <Link href="/admin/specialists" className="inline-block mb-6 text-[#48a9a6] hover:underline">
          ← Вернуться к списку специалистов
        </Link>
      </div>

      {isLoading2 ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
        </div>
      ) : specialistData ? (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-md p-6">
          {/* Основная информация */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Основная информация</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Имя*
                </label>
                  <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Фамилия*
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>
            
            <div className="mt-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Описание*
                  </label>
              <RichTextEditor 
                value={formData.description} 
                onChange={handleDescriptionChange}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>
          </div>
          
          {/* Связь с аккаунтом пользователя */}
          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Связь с аккаунтом пользователя</h2>
            
            {selectedUser ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedUser.photo ? (
                      <img src={selectedUser.photo} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} className="object-cover w-full h-full" />
                    ) : (
                      <FaUserCheck size={24} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-lg">{selectedUser.firstName} {selectedUser.lastName}</div>
                    <div className="text-gray-500 flex items-center space-x-2">
                      <FaEnvelope className="text-gray-400" size={14} />
                      <span className="text-sm truncate max-w-[200px] md:max-w-full">{selectedUser.email}</span>
                    </div>
                    <div className="mt-1">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {selectedUser.role.toUpperCase() === 'SPECIALIST' ? 'Специалист' : selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearUser}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors flex items-center space-x-1 w-full md:w-auto justify-center md:justify-start"
                >
                  <FaUserTimes className="mr-1" />
                  <span>Удалить связь</span>
                </button>
              </div>
            ) : (
              <>
                {showUserSearch ? (
                  <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    <div className="p-3 border-b flex flex-col md:flex-row md:items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Поиск пользователя (имя, фамилия, email)"
                          value={userSearchTerm}
                          onChange={handleUserSearch}
                          className="w-full p-2 pl-8 border rounded-md border-gray-300"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          {isSearching ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-[#48a9a6] border-r-2"></div>
                          ) : (
                            <FaSearch />
                          )}
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowUserSearch(false)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors w-full md:w-auto"
                      >
                        Отмена
                      </button>
                    </div>
              
                    <div className="max-h-60 overflow-y-auto p-2">
                      {isSearching ? (
                        <div className="text-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#48a9a6] border-r-2 mx-auto mb-2"></div>
                          <p className="text-gray-500">Выполняется поиск...</p>
                        </div>
                      ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div 
                            key={user.id} 
                            className="p-2 hover:bg-gray-50 rounded-md cursor-pointer flex items-center space-x-3" 
                            onClick={() => handleSelectUser(user)}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {user.photo ? (
                                <img src={user.photo} alt={`${user.firstName} ${user.lastName}`} className="object-cover w-full h-full" />
                              ) : (
                                <FaUser size={16} className="text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              {user.role.toLowerCase() === 'admin' && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                  Администратор
                                </span>
                              )}
                            </div>
                          </div>
                        ))
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
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <button 
                      type="button" 
                      onClick={() => setShowUserSearch(true)}
                      className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <FaUserPlus />
                      <span>Привязать к пользователю</span>
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      Привязка к пользователю позволит ему редактировать свой профиль специалиста
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Фотография */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Фотография</h2>
            
            <div className="flex items-center space-x-4">
              <div className="relative w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {formData.photoPreview ? (
                  <img src={formData.photoPreview} alt="Превью фото" className="object-cover w-full h-full" />
                ) : (
                  <div className="flex items-center justify-center h-full w-full">
                    <FaUser size={40} className="text-gray-300" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <button 
                  type="button" 
                  onClick={triggerFileInput}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <FaUpload />
                  <span>{formData.photoPreview !== '/images/photoPreview.jpg' ? 'Изменить фото' : 'Загрузить фото'}</span>
                </button>
                
                {formData.photoPreview !== '/images/photoPreview.jpg' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        photo: null,
                        photoPreview: '/images/photoPreview.jpg'
                      }));
                    }}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors flex items-center space-x-2"
                  >
                    <FaTrash />
                    <span>Удалить фото</span>
                  </button>
                )}
                
                  <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
            {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
          </div>
          
          {/* Специализация */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Специализация</h2>
            
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                placeholder="Введите специализацию"
                value={formData.position}
                onChange={handlePositionChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <button
                type="button"
                onClick={handleAddPosition}
                disabled={!formData.position.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPlus />
              </button>
            </div>
            
            {formData.additionalPositions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.additionalPositions.map((position, index) => (
                  <div key={index} className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-full">
                    <span className="text-sm">{position}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePosition(index)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Услуги */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Услуги</h2>
            
            {availableServices.length > 0 ? (
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
            ) : (
              <p className="text-gray-500">Нет доступных услуг</p>
            )}
            
            {errors.selectedServices && (
              <p className="text-red-500 text-sm mt-1">{errors.selectedServices}</p>
            )}
          </div>
          
          {/* Загрузка документов */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Документы</h2>
            
            <div className="mb-4">
              <button 
                type="button" 
                onClick={triggerDocumentInput}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <FaUpload />
                <span>Загрузить документы</span>
              </button>
              <input
                type="file"
                ref={documentInputRef}
                onChange={handleAddDocument}
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="hidden"
              />
              
              <p className="text-xs text-gray-500 mt-1">Поддерживаемые форматы: PDF, JPG, PNG</p>
            </div>
            
            {formData.documents.length > 0 && (
              <div className="space-y-2">
                {formData.documents.map(doc => (
                  <div key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-500">
                        {doc.type === 'diploma' ? <FaGraduationCap size={18} /> : <FaCertificate size={18} />}
                      </div>
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <select
                        value={doc.type}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            documents: prev.documents.map(d => 
                              d.id === doc.id ? { ...d, type: e.target.value as 'diploma' | 'certificate' } : d
                            )
                          }));
                        }}
                        className="text-sm p-1 border border-gray-300 rounded-md"
                      >
                        <option value="diploma">Диплом</option>
                        <option value="certificate">Сертификат</option>
                      </select>
                      
                      <button 
                        type="button" 
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
                </div>
          
          {/* Расписание работы */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Расписание работы</h2>
            
            <div className="space-y-4">
              {formData.workSchedule.workDays.map((day, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b flex items-center">
                    <input
                      type="checkbox"
                      id={`day-${index}`}
                      checked={day.active}
                      onChange={(e) => handleWorkScheduleChange(index, 'active', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor={`day-${index}`} className="font-medium">
                      {['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][day.day]}
                  </label>
                </div>
                  
                  {day.active && (
                    <div className="p-3">
                      <div className="flex space-x-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => handleWorkScheduleChange(index, 'startTime', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
                  <input
                    type="time"
                            value={day.endTime}
                            onChange={(e) => handleWorkScheduleChange(index, 'endTime', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      
                      {/* Обеденные перерывы */}
                      <div className="mt-4">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Перерывы:</h4>
                        
                        {day.lunchBreaks.map((breakItem, breakIndex) => (
                          <div key={breakItem.id} className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 p-2 border-b flex items-center">
                              <input
                                type="checkbox"
                                id={`break-${index}-${breakIndex}`}
                                checked={breakItem.enabled}
                                onChange={(e) => handleLunchBreakChange(index, breakIndex, 'enabled', e.target.checked)}
                                className="mr-2"
                              />
                              <label htmlFor={`break-${index}-${breakIndex}`} className="text-sm font-medium">
                                Перерыв {breakIndex + 1}
                  </label>
                            </div>
                            
                            {breakItem.enabled && (
                              <div className="p-2 flex items-center space-x-2">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-500 mb-1">Начало</label>
                  <input
                    type="time"
                                    value={breakItem.startTime}
                                    onChange={(e) => handleLunchBreakChange(index, breakIndex, 'startTime', e.target.value)}
                                    className="w-full p-1 text-sm border border-gray-300 rounded-md"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-500 mb-1">Конец</label>
                                  <input
                                    type="time"
                                    value={breakItem.endTime}
                                    onChange={(e) => handleLunchBreakChange(index, breakIndex, 'endTime', e.target.value)}
                                    className="w-full p-1 text-sm border border-gray-300 rounded-md"
                                  />
                                </div>
                                <div className="pt-5">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLunchBreak(index, breakIndex)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                  >
                                    <FaTrash size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={() => handleAddLunchBreak(index)}
                          className="mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm flex items-center space-x-1"
                        >
                          <FaPlus size={12} />
                          <span>Добавить перерыв</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Отпуска */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-800 mb-3">Отпуска и выходные дни</h3>
              
              <div className="space-y-3">
                {formData.workSchedule.vacations.map((vacation, index) => (
                  <div key={vacation.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b flex items-center">
                      <input
                        type="checkbox"
                        id={`vacation-${index}`}
                        checked={vacation.enabled}
                        onChange={(e) => handleVacationChange(index, 'enabled', e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor={`vacation-${index}`} className="font-medium">Отпуск {index + 1}</label>
                </div>
                    
                    {vacation.enabled && (
                      <div className="p-3 flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                          <input
                            type="date"
                            value={vacation.startDate}
                            onChange={(e) => handleVacationChange(index, 'startDate', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
              </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
                          <input
                            type="date"
                            value={vacation.endDate}
                            onChange={(e) => handleVacationChange(index, 'endDate', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
            </div>
                        <div className="pt-5">
                          <button
                            type="button"
                            onClick={() => handleRemoveVacation(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={handleAddVacation}
                className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <FaPlus size={14} />
                <span>Добавить отпуск</span>
              </button>
            </div>
          </div>
          
          {/* Кнопки формы */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => router.push('/admin/specialists')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || submitSuccess}
              className="px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Сохранение...</span>
                </>
              ) : submitSuccess ? (
                <>
                  <FaCheck />
                  <span>Сохранено</span>
                </>
              ) : (
                <span>Сохранить изменения</span>
              )}
            </button>
      </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-red-500 mb-4">{errors.firstName || 'Ошибка при загрузке данных'}</p>
          <button 
            type="button" 
            onClick={() => router.push('/admin/specialists')}
            className="px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87]"
          >
            Вернуться к списку специалистов
          </button>
    </div>
      )}
    </div>
  );
} 