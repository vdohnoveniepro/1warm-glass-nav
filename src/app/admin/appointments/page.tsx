'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AppointmentStatus, UserRole } from '@/models/types';
import { toast } from '@/components/ui/Toast';
import { FaCalendarAlt, FaList, FaCalendarDay, FaCalendarWeek, FaCog, FaSearch, FaFilter, FaArchive, FaTrash } from 'react-icons/fa';
import Link from 'next/link';

// Импорт компонентов
import AppointmentCalendar from './components/AppointmentCalendar';
import AppointmentsList from './components/AppointmentsList';
import AppointmentDetailsModal from './components/AppointmentDetailsModal';

// Импорт модального окна заметок
import NotesModal from '@/app/(cabinet)/cabinet/calendar/components/NotesModal';

// Типы для компонента
interface Appointment {
  id: string;
  specialistId: string;
  serviceId: string;
  userId?: string;
  date: string;
  startTime: string;
  endTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  price: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  service?: {
    name: string;
  };
  specialist?: {
    firstName: string;
    lastName: string;
    photo: string;
  };
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
}

// Типы для представления календаря
type CalendarView = 'month' | 'week' | 'day' | 'list';

interface AppointmentWithDetails extends Appointment {
  notes: string;
}

export default function AdminAppointmentsPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | 'all'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [requireConfirmation, setRequireConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Состояния для модального окна заметок
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [noteSpecialistId, setNoteSpecialistId] = useState('');
  const [noteClientName, setNoteClientName] = useState('');
  const [noteServiceName, setNoteServiceName] = useState('');

  // Состояние компонента
  const [appointmentsWithNotes, setAppointmentsWithNotes] = useState<Record<string, boolean>>({});

  // Функция для загрузки записей
  const fetchAppointments = async () => {
    console.log('Начинаем загрузку записей...');
    try {
      const response = await fetch('/api/admin/appointments');
      
      if (!response.ok) {
        console.error('Ошибка получения записей:', response.status, response.statusText);
        throw new Error('Ошибка загрузки записей: ' + response.statusText);
      }
      
      const data = await response.json();
      console.log('Получены данные для админ-панели:', JSON.stringify(data, null, 2));
      
      let appointmentsData = [];
      
      if (data?.data?.appointments) {
        appointmentsData = data.data.appointments;
        console.log('Найдены записи в data.data.appointments:', appointmentsData.length);
      } else if (data?.appointments) {
        appointmentsData = data.appointments;
        console.log('Найдены записи в data.appointments:', appointmentsData.length);
      } else if (Array.isArray(data)) {
        appointmentsData = data;
        console.log('Данные представлены в виде массива:', appointmentsData.length);
      } else if (data?.data && Array.isArray(data.data)) {
        appointmentsData = data.data;
        console.log('Найдены записи в data.data:', appointmentsData.length);
      } else {
        console.error('Неверный формат данных записей:', data);
        appointmentsData = []; // Установим пустой массив вместо исключения
      }
      
      console.log(`Количество полученных записей: ${appointmentsData.length}`);
      
      // Проверяем, есть ли у записей необходимые поля
      if (appointmentsData.length > 0) {
        console.log('Пример первой записи:', JSON.stringify(appointmentsData[0], null, 2));
        
        // Проверяем, есть ли у записей необходимые поля
        const hasClientInfo = appointmentsData[0].firstName && appointmentsData[0].lastName;
        console.log('Содержит информацию о клиенте:', hasClientInfo);
      }
      
      // Явно проверяем, что все поля присутствуют
      const validatedAppointments = appointmentsData.map(appointment => {
        // Гарантируем, что все поля есть
        return {
          id: appointment.id || '',
          specialistId: appointment.specialistId || '',
          serviceId: appointment.serviceId || '',
          userId: appointment.userId || '',
          date: appointment.date || '',
          startTime: appointment.startTime || '',
          endTime: appointment.endTime || '',
          firstName: appointment.firstName || '',
          lastName: appointment.lastName || '',
          email: appointment.email || '',
          phone: appointment.phone || '',
          price: appointment.price || 0,
          status: appointment.status || 'PENDING',
          createdAt: appointment.createdAt || new Date().toISOString(),
          updatedAt: appointment.updatedAt || new Date().toISOString(),
          notes: appointment.notes || '',
          specialist: appointment.specialist,
          service: appointment.service
        };
      });
      
      console.log('Записи с гарантированными полями:', validatedAppointments.length);
      setAppointments(validatedAppointments);
      return validatedAppointments;
    } catch (error) {
      console.error('Ошибка при загрузке записей:', error);
      setError(error instanceof Error ? error.message : String(error));
      setAppointments([]);
      return []; // Возвращаем пустой массив вместо ошибки
    }
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (authLoading) return;
    
    // Приводим роль к верхнему регистру для сравнения
    const userRole = user?.role?.toUpperCase();
    console.log('Роль пользователя в админке записей:', user?.role, 'В верхнем регистре:', userRole);
    
    if (!user || userRole !== 'ADMIN') {
      setError('Доступ запрещен. Только администраторы могут просматривать эту страницу.');
      setLoading(false);
      return;
    }
    
    async function initializeData() {
      setLoading(true);
      try {
        await Promise.all([
          fetchSpecialists(),
          fetchServices(),
          fetchAppointments(),
          fetchSettings()
        ]);
        
        // Загружаем информацию о заметках после загрузки основных данных
        await fetchNotesInfo();
        
        setLoading(false);
        setIsLoaded(true);
      } catch (error) {
        console.error('Ошибка при инициализации данных:', error);
        setError('Ошибка при загрузке данных. Пожалуйста, обновите страницу.');
        setLoading(false);
      }
    }
    
    // Специальная проверка для пользователя bakeevd@yandex.ru
    const isSpecialAdmin = user?.email === 'bakeevd@yandex.ru';
    if (isSpecialAdmin && userRole !== 'ADMIN') {
      console.log('Обнаружен специальный пользователь bakeevd@yandex.ru, обходим проверку роли');
      // Если это специальный пользователь, даем доступ даже без роли ADMIN
      initializeData();
      return;
    }
    
    // Инициализируем данные, если пользователь - администратор
    if (userRole === 'ADMIN') {
      initializeData();
    }
  }, [authLoading, user]);

  // Загрузка специалистов
  const fetchSpecialists = async () => {
    try {
      console.log('Начинаем загрузку специалистов...');
      const response = await fetch('/api/specialists');
      
      console.log('Статус ответа API специалистов:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка API специалистов. Статус:', response.status, 'Текст:', errorText);
        throw new Error(`Ошибка при загрузке специалистов: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Данные ответа API специалистов:', data);
      
      // Проверяем формат ответа - может быть массив напрямую или обернутый в объект с success/data
      if (Array.isArray(data)) {
        // API вернул массив напрямую
        console.log(`Успешно загружено ${data.length} специалистов (прямой массив)`);
        setSpecialists(data);
      } else if (data.success && Array.isArray(data.data.specialists)) {
        // API вернул объект с success/data
        console.log(`Успешно загружено ${data.data.specialists.length} специалистов`);
        setSpecialists(data.data.specialists);
      } else if (data.success && Array.isArray(data.data)) {
        // API вернул объект с success/data, но data - это массив напрямую
        console.log(`Успешно загружено ${data.data.length} специалистов`);
        setSpecialists(data.data);
      } else {
        console.error('Неожиданный формат данных API специалистов:', data);
        throw new Error('Неожиданный формат данных от API специалистов');
      }
    } catch (error) {
      console.error('Ошибка при загрузке специалистов:', error);
      // Устанавливаем пустой массив, чтобы избежать бесконечной загрузки
      setSpecialists([]);
      throw error; // Передаем ошибку выше для обработки в useEffect
    } finally {
      console.log('Завершена загрузка специалистов');
    }
  };

  // Загрузка настроек записей
  const fetchSettings = async () => {
    try {
      console.log('Начинаем загрузку настроек записей...');
      
      // Устанавливаем значение по умолчанию перед запросом (выключено)
      setRequireConfirmation(false);
      
      try {
        const response = await fetch('/api/admin/settings/appointments');
        console.log('Статус ответа API настроек:', response.status, response.statusText);
        
        if (!response.ok) {
          // Используем настройки по умолчанию и логируем ошибку
          console.log('API настроек недоступен или вернул ошибку. Используем настройки по умолчанию (подтверждение выключено).');
          return;
        }
        
        const data = await response.json();
        console.log('Данные ответа API настроек:', data);
        
        if (data.success && data.data && data.data.settings) {
          console.log('Успешно загружены настройки записей:', data.data.settings);
          setRequireConfirmation(data.data.settings.requireConfirmation === true);
        } else {
          console.log('Некорректные данные от API настроек. Используем настройки по умолчанию (подтверждение выключено).');
        }
      } catch (fetchError) {
        // Если запрос не удалось выполнить, используем настройки по умолчанию
        console.error('Ошибка при выполнении запроса к API настроек:', fetchError);
        console.log('Используем настройки по умолчанию из-за ошибки запроса (подтверждение выключено).');
      }
    } catch (error) {
      console.error('Ошибка в функции fetchSettings:', error);
    } finally {
      console.log('Завершена загрузка настроек');
    }
  };

  // Загрузка услуг
  const fetchServices = async () => {
    try {
      console.log('Начинаем загрузку услуг...');
      
      const response = await fetch('/api/services');
      console.log('Статус ответа API услуг:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка API услуг. Статус:', response.status, 'Текст:', errorText);
        throw new Error(`Ошибка при загрузке услуг: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Данные ответа API услуг:', data);
      
      if (data.success && data.data) {
        console.log(`Успешно загружено ${data.data.length} услуг`);
        setServices(data.data);
        
        // Обновляем записи с информацией об услугах
        setAppointments(prevAppointments => {
          return prevAppointments.map(appointment => {
            const service = data.data.find((s: any) => s.id === appointment.serviceId);
            if (service) {
              return {
                ...appointment,
                service: {
                  ...appointment.service,
                  name: service.name
                }
              };
            }
            return appointment;
          });
        });
      } else if (Array.isArray(data)) {
        console.log(`Успешно загружено ${data.length} услуг (прямой массив)`);
        setServices(data);
        
        // Обновляем записи с информацией об услугах
        setAppointments(prevAppointments => {
          return prevAppointments.map(appointment => {
            const service = data.find((s: any) => s.id === appointment.serviceId);
            if (service) {
              return {
                ...appointment,
                service: {
                  ...appointment.service,
                  name: service.name
                }
              };
            }
            return appointment;
          });
        });
      } else {
        console.error('Неожиданный формат данных API услуг:', data);
        throw new Error('Неожиданный формат данных от API услуг');
      }
    } catch (error) {
      console.error('Ошибка при загрузке услуг:', error);
      // Устанавливаем пустой массив, чтобы избежать бесконечной загрузки
      setServices([]);
      throw error; // Передаем ошибку выше для обработки в useEffect
    } finally {
      console.log('Завершена загрузка услуг');
    }
  };

  // Обновление статуса записи
  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      console.log(`Начинаем обновление статуса записи ID:${appointmentId} на статус:${status}`);
      
      const url = `/api/admin/appointments/${appointmentId}/status`;
      console.log(`Отправка запроса к: ${url}`);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      console.log(`Статус ответа: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка API статуса. Статус:${response.status}. Текст:`, errorText);
        throw new Error(`Ошибка при обновлении статуса записи: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Данные ответа:', data);
      
      if (data.success) {
        // Обновляем состояние
        setAppointments(prevAppointments => 
          prevAppointments.map(appointment => 
            appointment.id === appointmentId ? { ...appointment, status } : appointment
          )
        );
        toast.success('Статус записи успешно обновлен');
        
        // Если модальное окно открыто для данной записи, обновим и ее
        if (selectedAppointment && selectedAppointment.id === appointmentId) {
          setSelectedAppointment({ ...selectedAppointment, status });
        }
      } else {
        console.error('API вернул ошибку:', data.error);
        throw new Error(data.error || 'Ошибка при обновлении статуса записи');
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса записи:', error);
      toast.error('Не удалось обновить статус записи.');
    }
  };

  // Функция для удаления записи (только для архивных записей)
  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('Вы действительно хотите удалить эту запись?\nЭто действие необратимо.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`[Admin] Удаление записи ID: ${appointmentId}`);
      
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      console.log(`[Admin] Результат удаления записи:`, data);
      
      if (data.success) {
        toast.success('Запись успешно удалена');
        
        // Обновляем список записей
        setAppointments(prev => prev.filter(item => item.id !== appointmentId));
      } else {
        console.error('[Admin] Ошибка при удалении записи:', data.error);
        toast.error(data.error || 'Не удалось удалить запись');
      }
    } catch (error) {
      console.error('[Admin] Ошибка при отправке запроса на удаление записи:', error);
      toast.error('Произошла ошибка при удалении записи');
    } finally {
      setIsLoading(false);
    }
  };

  // Обновление настроек
  const updateSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requireConfirmation }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при обновлении настроек');
      }
      
      const data = await response.json();
      if (data.success) {
        toast.success('Настройки успешно обновлены');
        setShowSettings(false);
      } else {
        throw new Error(data.error || 'Ошибка при обновлении настроек');
      }
    } catch (error) {
      console.error('Ошибка при обновлении настроек:', error);
      toast.error('Не удалось обновить настройки записей.');
    }
  };

  // Загрузка данных о заметках при загрузке компонента
  useEffect(() => {
    // После загрузки записей, загружаем информацию о заметках
    if (appointments.length > 0 && !loading) {
      fetchNotesInfo();
    }
  }, [appointments, loading]);

  // Открытие модального окна с деталями записи
  const handleAppointmentSelect = (appointment: Appointment) => {
    console.log('[AdminAppointments] Выбрана запись для просмотра:', appointment);
    
    // Найти полную информацию об услуге и специалисте перед открытием модального окна
    const service = services.find((s: any) => s.id === appointment.serviceId);
    const specialist = specialists.find((s: any) => s.id === appointment.specialistId);
    
    // Извлекаем информацию о клиенте из notes, если основные поля не заполнены
    let firstName = appointment.firstName || '';
    let lastName = appointment.lastName || '';
    let email = appointment.email || '';
    let phone = appointment.phone || '';
    
    // Если есть поле notes и какие-то поля отсутствуют, пытаемся извлечь их из notes
    if (appointment?.notes && (!firstName || !email || !phone)) {
      try {
        const notesData = JSON.parse(appointment.notes);
        console.log('[AdminAppointments] Извлекаем данные клиента из notes:', notesData);
        
        // Извлекаем имя и фамилию
        if (notesData.name && !firstName) {
          const nameParts = notesData.name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        // Извлекаем email
        if (notesData.email && !email) {
          email = notesData.email;
        }
        
        // Извлекаем телефон
        if (notesData.phone && !phone) {
          phone = notesData.phone;
        }
      } catch (e) {
        console.error('[AdminAppointments] Ошибка при разборе notes:', e);
      }
    }
    
    // Создаем обновленную запись с полной информацией
    const enrichedAppointment = {
      ...appointment,
      firstName,
      lastName,
      email,
      phone,
      service: service ? {
        ...appointment.service,
        name: service.name
      } : appointment.service,
      specialist: specialist ? {
        ...appointment.specialist,
        firstName: specialist.firstName,
        lastName: specialist.lastName,
        photo: specialist.photo
      } : appointment.specialist
    };
    
    console.log('[AdminAppointments] Обогащенная запись для модального окна:', enrichedAppointment);
    setSelectedAppointment(enrichedAppointment);
    setIsModalOpen(true);
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Обработчик переключения на режим списка
  const handleListViewClick = () => {
    setCalendarView('list');
    // При переключении в режим списка, активируем вкладку "Подтвержденные"
    setActiveTab('confirmed');
  };

  // Обработчик изменения начальной даты диапазона
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null;
    setDateRange(prev => ({ ...prev, start: newDate }));
  };

  // Обработчик изменения конечной даты диапазона
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null;
    setDateRange(prev => ({ ...prev, end: newDate }));
  };

  // Сброс фильтра дат
  const resetDateFilter = () => {
    setDateRange({ start: null, end: null });
  };

  // Фильтрация записей в зависимости от активной вкладки, поиска и фильтров
  const filteredAppointments = useMemo(() => {
    // Применяем все фильтры
    let result = appointments;
    
    // Фильтрация по вкладкам
    switch (activeTab) {
      case 'pending':
        result = result.filter(a => a.status === AppointmentStatus.PENDING);
        break;
      case 'confirmed':
        result = result.filter(a => a.status === AppointmentStatus.CONFIRMED);
        break;
      case 'completed':
        result = result.filter(a => a.status === AppointmentStatus.COMPLETED);
        break;
      case 'cancelled':
        result = result.filter(a => a.status === AppointmentStatus.CANCELLED);
        break;
      case 'archived':
        result = result.filter(a => a.status === AppointmentStatus.ARCHIVED);
        break;
      default:
        // Для вкладки "Все" отображаем все записи, кроме архивированных
        result = result.filter(a => a.status !== AppointmentStatus.ARCHIVED);
        break;
    }
    
    // Фильтрация по строке поиска
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.firstName?.toLowerCase().includes(term) ||
        a.lastName?.toLowerCase().includes(term) ||
        a.phone?.includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        (a.service?.name?.toLowerCase() || '').includes(term) ||
        (a.specialist?.firstName?.toLowerCase() || '').includes(term) ||
        (a.specialist?.lastName?.toLowerCase() || '').includes(term)
      );
    }
    
    // Дополнительная фильтрация по специалисту
    if (selectedSpecialistId !== 'all') {
      result = result.filter(a => a.specialistId === selectedSpecialistId);
    }
    
    // Фильтрация по диапазону дат
    if (dateRange.start && dateRange.end) {
      result = result.filter(a => {
        const appointmentDate = new Date(a.date);
        return appointmentDate >= dateRange.start! && appointmentDate <= dateRange.end!;
      });
    }
    
    // Сортировка по дате и времени (ближайшие записи сначала)
    result.sort((a, b) => {
      // Создаем объекты Date с учетом времени
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      
      // Сравниваем даты
      return dateA.getTime() - dateB.getTime();
    });
    
    return result;
  }, [
    appointments, 
    activeTab, 
    searchTerm, 
    selectedSpecialistId, 
    dateRange.start, 
    dateRange.end
  ]);

  // Функция для создания заметки из карточки записи
  const handleCreateNote = (appointment: Appointment) => {
    console.log('[AdminAppointments] Создание заметки для записи:', appointment);
    
    // Получаем данные для заметки
    const specialistId = appointment.specialistId;
    const clientName = `${appointment.firstName} ${appointment.lastName}`.trim();
    const serviceName = appointment.service?.name || '';
    
    // Устанавливаем данные для модального окна заметок
    setNoteSpecialistId(specialistId);
    setNoteClientName(clientName);
    setNoteServiceName(serviceName);
    
    // Закрываем модальное окно с деталями записи
    setIsModalOpen(false);
    
    // Открываем модальное окно заметок
    setTimeout(() => {
      setIsNotesModalOpen(true);
    }, 300); // Небольшая задержка для анимации закрытия предыдущего модального окна
  };
  
  // Обработчик закрытия модального окна заметок
  const handleCloseNotesModal = () => {
    setIsNotesModalOpen(false);
    
    // После закрытия модального окна заметок обновляем информацию о заметках
    setTimeout(() => {
      fetchNotesInfo();
    }, 500);
  };
  
  // Загрузка информации о заметках
  const fetchNotesInfo = async () => {
    try {
      console.log('[AdminAppointments] Начало загрузки информации о заметках');
      
      // Получаем список специалистов для запроса
      const specialistIds = [...new Set(appointments.map(a => a.specialistId))];
      
      // Если нет специалистов, выходим
      if (specialistIds.length === 0) {
        console.log('[AdminAppointments] Нет специалистов для запроса заметок');
        return;
      }
      
      console.log('[AdminAppointments] Запрашиваем заметки для специалистов:', specialistIds);
      
      // Загружаем информацию о заметках для каждого специалиста
      const notesMap: Record<string, boolean> = {};
      
      for (const specialistId of specialistIds) {
        console.log(`[AdminAppointments] Запрос заметок для специалиста: ${specialistId}`);
        const response = await fetch(`/api/admin/appointments/notes?specialistId=${specialistId}`);
        
        console.log(`[AdminAppointments] Получен ответ API заметок:`, response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[AdminAppointments] Данные о заметках:`, data);
          
          if (data.success && data.data) {
            // Обрабатываем полученные данные
            Object.keys(data.data).forEach(key => {
              notesMap[key] = true;
              console.log(`[AdminAppointments] Найдена заметка для записи: ${key}`);
            });
          } else if (data.error) {
            console.error(`[AdminAppointments] Ошибка API заметок:`, data.error);
          }
        } else {
          const errorText = await response.text();
          console.error(`[AdminAppointments] Ошибка при получении заметок: ${response.status}`, errorText);
        }
      }
      
      console.log(`[AdminAppointments] Итого найдено заметок: ${Object.keys(notesMap).length}`);
      console.log(`[AdminAppointments] Карта заметок:`, notesMap);
      
      // Проверяем заметки для текущих записей
      appointments.forEach((appointment: Appointment) => {
        console.log(`[AdminAppointments] Запись ${appointment.id} имеет заметку: ${!!notesMap[appointment.id]}`);
      });
      
      setAppointmentsWithNotes(notesMap);
    } catch (error) {
      console.error('[AdminAppointments] Ошибка при загрузке информации о заметках:', error);
    }
  };
  
  // Проверка наличия заметок для конкретной записи
  const checkHasNotes = (appointmentId: string): boolean => {
    if (!appointmentId) {
      console.log(`[checkHasNotes] Передан пустой ID записи`);
      return false;
    }
    
    // Проверяем наличие записи в кеше заметок
    const hasNote = !!appointmentsWithNotes[appointmentId];
    console.log(`[checkHasNotes] ID:${appointmentId}, Есть заметка: ${hasNote}`);
    return hasNote;
  };

  // Если есть ошибка, показываем её
  if (error) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="p-4 bg-red-100 border border-red-300 rounded shadow-md">
          <h2 className="mb-2 text-xl font-semibold text-red-700">Ошибка</h2>
          <p className="text-red-600">{error}</p>
          <button 
            className="px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }
  
  // Если данные загружаются, показываем спиннер
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="p-6 text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Управление записями</h1>
          <div className="flex space-x-2">
            <button 
              onClick={() => setCalendarView('month')}
              className={`px-3 py-2 rounded-md ${calendarView === 'month' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-700'}`}
              title="Месяц"
            >
              <FaCalendarAlt />
            </button>
            <button 
              onClick={() => setCalendarView('week')}
              className={`px-3 py-2 rounded-md ${calendarView === 'week' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-700'}`}
              title="Неделя"
            >
              <FaCalendarWeek />
            </button>
            <button 
              onClick={() => setCalendarView('day')}
              className={`px-3 py-2 rounded-md ${calendarView === 'day' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-700'}`}
              title="День"
            >
              <FaCalendarDay />
            </button>
            <button 
              onClick={handleListViewClick}
              className={`px-3 py-2 rounded-md ${calendarView === 'list' ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-700'}`}
              title="Список"
            >
              <FaList />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`px-3 py-2 rounded-md ${showSettings ? 'bg-[#48a9a6] text-white' : 'bg-gray-100 text-gray-700'}`}
              title="Настройки"
            >
              <FaCog />
            </button>
          </div>
        </div>
        
        <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
          ← Вернуться в панель управления
        </Link>
      </div>
      
      {/* Настройки */}
      {showSettings && (
        <div className="mb-6 p-4 bg-white border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Настройки записей</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="form-checkbox h-5 w-5 text-[#48a9a6]" 
                checked={requireConfirmation}
                onChange={e => setRequireConfirmation(e.target.checked)}
              />
              <span className="ml-2">Требовать подтверждение записи администратором</span>
            </label>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={updateSettings}
              className="bg-[#48a9a6] text-white px-4 py-2 rounded-md hover:bg-[#3c8d8a] transition-colors"
            >
              Сохранить настройки
            </button>
          </div>
        </div>
      )}
      
      {/* Фильтры */}
      <div className="mb-6 space-y-4">
        {/* Поиск и выбор специалиста */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <FaSearch />
              </div>
              <input
                type="text"
                placeholder="Поиск по имени, email или телефону..."
                className="pl-10 pr-3 py-2 w-full border rounded-md"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center">
            <span className="mr-2 whitespace-nowrap">Специалист:</span>
            <select 
              className="border rounded-md px-3 py-2 bg-white"
              value={selectedSpecialistId}
              onChange={e => setSelectedSpecialistId(e.target.value)}
            >
              <option value="all">Все специалисты</option>
              {specialists.map(specialist => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.firstName} {specialist.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Фильтр по дате */}
        <div>
          <button 
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center text-gray-700 hover:text-[#48a9a6] transition-colors"
          >
            <FaFilter className="mr-2" />
            <span>Фильтр по дате</span>
            {(dateRange.start || dateRange.end) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Активен</span>
            )}
          </button>
          
          {showDateFilter && (
            <div className="mt-3 p-4 border rounded-md bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Начальная дата</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-md px-3 py-2"
                    value={dateRange.start ? dateRange.start.toISOString().substring(0, 10) : ''}
                    onChange={handleStartDateChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Конечная дата</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-md px-3 py-2"
                    value={dateRange.end ? dateRange.end.toISOString().substring(0, 10) : ''}
                    onChange={handleEndDateChange}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={resetDateFilter}
                  className="text-gray-600 hover:text-gray-800 mr-3"
                >
                  Сбросить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Вкладки статусов - отображаем только в режиме списка */}
      {calendarView === 'list' && (
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px">
              <button
                onClick={() => setActiveTab('all')}
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-[#48a9a6] text-[#48a9a6]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Все записи
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-[#48a9a6] text-[#48a9a6]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ожидающие
              </button>
              <button
                onClick={() => setActiveTab('confirmed')}
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'confirmed'
                    ? 'border-[#48a9a6] text-[#48a9a6]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Подтвержденные
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'completed'
                    ? 'border-[#48a9a6] text-[#48a9a6]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Завершенные
              </button>
              <button
                onClick={() => setActiveTab('cancelled')}
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'cancelled'
                    ? 'border-[#48a9a6] text-[#48a9a6]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Отмененные
              </button>
              <button
                className={`px-4 py-2 ${activeTab === 'archived' ? 'border-b-2 border-violet-600 text-violet-600 font-semibold' : 'text-gray-500'}`} 
                onClick={() => setActiveTab('archived')}
                title="Архивные записи"
              >
                <FaArchive className="text-base" />
              </button>
            </nav>
          </div>
        </div>
      )}
      
      {/* Контент в зависимости от выбранного представления */}
      <div className="bg-white border rounded-lg shadow-sm p-4">
        {calendarView === 'list' ? (
          // Список записей
          <AppointmentsList 
            appointments={filteredAppointments} 
            specialists={specialists}
            onAppointmentSelect={handleAppointmentSelect}
            onStatusChange={updateAppointmentStatus}
            onDeleteAppointment={deleteAppointment}
          />
        ) : (
          // Календарь
          <div className="min-h-[500px]">
            <AppointmentCalendar 
              appointments={filteredAppointments}
              specialists={specialists}
              view={calendarView}
              selectedSpecialistId={selectedSpecialistId}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onAppointmentSelect={handleAppointmentSelect}
            />
          </div>
        )}
      </div>
      
      {/* Модальное окно с деталями записи */}
      <AppointmentDetailsModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        appointment={selectedAppointment}
        specialists={specialists}
        onStatusChange={updateAppointmentStatus}
        onCreateNote={handleCreateNote}
        hasNotes={checkHasNotes}
      />
      
      {/* Модальное окно для заметок специалиста */}
      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={handleCloseNotesModal}
        specialistId={noteSpecialistId}
        initialClientName={noteClientName}
        initialServiceName={noteServiceName}
        openExistingNote={!!noteClientName || !!noteServiceName}
      />
    </div>
  );
}