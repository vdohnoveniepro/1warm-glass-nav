'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaTimesCircle, FaSearch, FaCalendarAlt, FaUser, FaImage, FaTrash, FaEdit, FaSave, FaClock, FaMicrophone, FaBuilding, FaStickyNote } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';
import Image from 'next/image';
import { getAuthTokenStatic } from '@/lib/AuthContext';

// Типы для Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    SpeechRecognitionEvent: any;
    webkitSpeechRecognitionEvent: any;
  }
}

// Типы для компонента
interface Note {
  id: string;
  specialistId: string;
  title: string;
  content: string;
  clientName?: string; 
  clientId?: string;
  serviceId?: string;
  serviceName?: string;
  appointmentId?: string;
  tags?: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialistId: string;
  initialClientName?: string;
  initialServiceName?: string;
  initialServiceId?: string;
  appointmentId?: string;
  openExistingNote?: boolean;
}

const NotesModal = ({ 
  isOpen, 
  onClose, 
  specialistId,
  initialClientName = '',
  initialServiceName = '',
  initialServiceId = '',
  appointmentId = '',
  openExistingNote = false
}: NotesModalProps) => {
  // Состояния для анимации и управления заметками
  const [isAnimating, setIsAnimating] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для создания/редактирования заметки
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [clientName, setClientName] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  
  // Состояния для голосового ввода
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMessage, setRecordingMessage] = useState('');
  
  // Ref для редактора контента
  const contentEditorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Добавляем новое состояние для списка услуг
  const [services, setServices] = useState<{id: string, name: string}[]>([]);
  
  // Добавляем ref для текущего экземпляра распознавания речи
  const recognitionRef = useRef<any>(null);
  
  // Обрабатываем открытие и закрытие модального окна с анимацией
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      fetchNotes();
      fetchServices();
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, specialistId]);

  // Эффект для обработки начальных данных и поиска существующей заметки
  useEffect(() => {
    if (isOpen && notes.length > 0) {
      if (openExistingNote) {
        // Сначала пытаемся найти заметку по appointmentId
        if (appointmentId) {
          const noteByAppointment = notes.find(note => note.appointmentId === appointmentId);
          if (noteByAppointment) {
            console.log('[NotesModal] Найдена существующая заметка для записи по appointmentId:', noteByAppointment);
            editNote(noteByAppointment);
            return;
          }
        }
        
        // Если не нашли по appointmentId, пытаемся найти по клиенту и услуге
        if (initialClientName && initialServiceName) {
          // Пытаемся найти заметку, соответствующую текущей записи
          const matchingNote = notes.find(note => {
            const clientNameMatch = note.clientName && initialClientName && 
              note.clientName.toLowerCase() === initialClientName.toLowerCase();
            
            const serviceMatch = initialServiceId ? 
              note.serviceId === initialServiceId : 
              (note.serviceName && initialServiceName && 
                note.serviceName.toLowerCase() === initialServiceName.toLowerCase());
            
            return clientNameMatch && serviceMatch;
          });

          if (matchingNote) {
            // Если нашли подходящую заметку, открываем ее для редактирования
            console.log('[NotesModal] Найдена существующая заметка для текущей записи:', matchingNote);
            editNote(matchingNote);
          } else if (initialClientName || initialServiceName) {
            // Если не нашли заметку, но есть данные для создания новой
            console.log('[NotesModal] Создание новой заметки с данными из записи');
            setClientName(initialClientName);
            setServiceName(initialServiceName);
            setServiceId(initialServiceId || '');
            setIsCreating(true);
          }
        }
      } else if (initialClientName || initialServiceName) {
        // Если не нужно искать существующую заметку, просто создаем новую
        setClientName(initialClientName);
        setServiceName(initialServiceName);
        setServiceId(initialServiceId || '');
        setIsCreating(true);
      }
    }
  }, [isOpen, notes, initialClientName, initialServiceName, initialServiceId, openExistingNote, appointmentId]);
  
  // Функция для загрузки заметок из API
  const fetchNotes = async () => {
    if (!specialistId) {
      console.warn('[NotesModal] Не указан ID специалиста для загрузки заметок');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[NotesModal] Загрузка заметок для специалиста: ${specialistId}`);
      
      // Загружаем заметки из API
      const response = await fetch(`/api/specialists/${specialistId}/notes`, {
        headers: {
          'Authorization': `Bearer ${getAuthTokenStatic()}`
        }
      });
      
      console.log(`[NotesModal] Статус ответа: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[NotesModal] Успешно загружено ${data.data?.length || 0} заметок`);
        
        if (data.success && Array.isArray(data.data)) {
          setNotes(data.data);
        } else {
          console.warn('[NotesModal] Неожиданный формат данных:', data);
          setError('Неожиданный формат данных от сервера');
        }
      } else {
        // Отображаем понятное сообщение об ошибке
        let errorMessage = 'Не удалось загрузить заметки';
        
        if (response.status === 401) {
          errorMessage = 'Требуется авторизация. Пожалуйста, войдите в систему снова.';
        } else if (response.status === 403) {
          errorMessage = 'У вас нет доступа к этим заметкам. Обратитесь к администратору.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Если не удалось прочитать JSON, оставляем общее сообщение
          }
        }
        
        console.error(`[NotesModal] Ошибка при загрузке заметок: ${errorMessage}`);
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('[NotesModal] Непредвиденная ошибка при загрузке заметок:', error);
      setError('Непредвиденная ошибка при загрузке заметок. Пожалуйста, попробуйте позже.');
      toast.error('Ошибка при загрузке заметок');
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для загрузки списка услуг
  const fetchServices = async () => {
    try {
      console.log('[NotesModal] Начало загрузки услуг');
      const response = await fetch('/api/services');
      
      if (response.ok) {
        const data = await response.json();
        console.log('[NotesModal] Получен ответ от API услуг:', data);
        
        if (data.success && data.data) {
          // Формат ответа с success и data
          const servicesList = data.data.map((service: any) => ({
            id: service.id,
            name: service.name
          }));
          console.log('[NotesModal] Обработанный список услуг (формат success):', servicesList);
          setServices(servicesList);
        } else if (Array.isArray(data)) {
          // Прямой массив услуг
          const servicesList = data.map((service: any) => ({
            id: service.id,
            name: service.name
          }));
          console.log('[NotesModal] Обработанный список услуг (формат массива):', servicesList);
          setServices(servicesList);
        } else if (data.services && Array.isArray(data.services)) {
          // Формат с полем services
          const servicesList = data.services.map((service: any) => ({
            id: service.id,
            name: service.name
          }));
          console.log('[NotesModal] Обработанный список услуг (формат services):', servicesList);
          setServices(servicesList);
        } else {
          console.log('[NotesModal] Не удалось определить формат данных услуг:', data);
          setServices([]);
        }
      } else {
        console.error('[NotesModal] Ошибка при загрузке услуг:', response.status);
        setServices([]);
      }
    } catch (error) {
      console.error('[NotesModal] Ошибка при загрузке услуг:', error);
      setServices([]);
    }
  };
  
  // Функция для сохранения заметки
  const saveNote = async () => {
    try {
      if (!title.trim()) {
        toast.error('Заголовок заметки не может быть пустым');
        return;
      }
      
      setLoading(true);
      console.log(`[NotesModal] Сохранение заметки: ${isEditing ? 'редактирование существующей' : 'создание новой'}`);
      
      const noteData = {
        id: currentNote?.id,
        specialistId,
        title: title.trim(),
        content: content || '',
        clientName: clientName.trim() || undefined,
        serviceName: serviceName.trim() || undefined,
        serviceId,
        appointmentId,
        tags,
        images,
        createdAt: currentNote?.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      console.log(`[NotesModal] Данные для сохранения:`, noteData);
      
      let response;
      
      // Обновляем существующую заметку или создаем новую
      if (isEditing && currentNote) {
        console.log(`[NotesModal] Обновление существующей заметки с ID: ${currentNote.id}`);
        response = await fetch(`/api/specialists/${specialistId}/notes/${currentNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });
      } else {
        console.log(`[NotesModal] Создание новой заметки`);
        response = await fetch(`/api/specialists/${specialistId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });
      }
      
      console.log(`[NotesModal] Получен ответ от сервера: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка при чтении ответа' }));
        console.error(`[NotesModal] Ошибка при сохранении заметки: ${response.status}`, errorData);
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
      }
      
      const data = await response.json().catch(e => {
        console.error('[NotesModal] Ошибка при парсинге ответа:', e);
        throw new Error('Ошибка при обработке ответа сервера');
      });
      
      console.log(`[NotesModal] Результат сохранения:`, data);
      
      if (data.success && data.data) {
        // Обновляем список заметок
        if (isEditing) {
          setNotes(prevNotes => 
            prevNotes.map(note => note.id === data.data.id ? data.data : note)
          );
          console.log(`[NotesModal] Заметка успешно обновлена с ID: ${data.data.id}`);
          toast.success('Заметка успешно обновлена');
        } else {
          setNotes(prevNotes => [data.data, ...prevNotes]);
          console.log(`[NotesModal] Заметка успешно создана с ID: ${data.data.id}`);
          toast.success('Заметка успешно создана');
        }
        
        // Сбрасываем форму
        resetForm();
      } else {
        console.warn('[NotesModal] Получены некорректные данные от сервера:', data);
        throw new Error('Не удалось сохранить заметку');
      }
    } catch (error) {
      console.error('[NotesModal] Ошибка при сохранении заметки:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при сохранении заметки');
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для удаления заметки
  const deleteNote = async (noteId: string) => {
    if (!confirm('Вы действительно хотите удалить эту заметку?')) {
      return;
    }
    
    try {
      setLoading(true);
      console.log(`[NotesModal] Удаление заметки с ID: ${noteId}`);
      
      // Сначала удаляем заметку из локального состояния для мгновенного отклика UI
      const noteToDelete = notes.find(note => note.id === noteId);
      if (!noteToDelete) {
        console.warn(`[NotesModal] Заметка с ID ${noteId} не найдена в локальном состоянии`);
        toast.info('Заметка уже была удалена');
        return;
      }
      
      // Оптимистичное обновление UI - удаляем заметку из состояния до ответа сервера
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
      
      // Если удаляем текущую редактируемую заметку, сбрасываем форму
      if (currentNote?.id === noteId) {
        resetForm();
      }
      
      // Отправляем запрос на удаление на сервер
      console.log(`[NotesModal] Отправка запроса на удаление заметки: /api/specialists/${specialistId}/notes/${noteId}`);
      const response = await fetch(`/api/specialists/${specialistId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Получаем ответ сервера
      let responseData;
      try {
        responseData = await response.json();
        console.log(`[NotesModal] Ответ сервера:`, response.status, responseData);
      } catch (e) {
        console.error('[NotesModal] Ошибка при парсинге ответа:', e);
        responseData = null;
      }
      
      if (!response.ok) {
        // Если заметка не найдена (404), это нормально, т.к. мы уже удалили её из UI
        if (response.status === 404) {
          console.log(`[NotesModal] Заметка с ID ${noteId} не найдена на сервере`);
          toast.info('Заметка успешно удалена');
          return;
        }
        
        // При других ошибках возвращаем заметку обратно в состояние
        console.error(`[NotesModal] Ошибка при удалении заметки: ${response.status} ${responseData?.error || 'Неизвестная ошибка'}`);
        setNotes(prevNotes => [...prevNotes, noteToDelete]);
        
        // Другие ошибки
        const errorMessage = responseData?.error || 'Ошибка при удалении заметки';
        throw new Error(errorMessage);
      }
      
      // Успешное удаление
      console.log(`[NotesModal] Заметка с ID ${noteId} успешно удалена`);
      toast.success('Заметка успешно удалена');
      
      // Обновляем список заметок для синхронизации с сервером
      fetchNotes();
      
    } catch (error) {
      console.error('[NotesModal] Ошибка при удалении заметки:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при удалении заметки');
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для редактирования заметки
  const editNote = (note: Note) => {
    setCurrentNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setClientName(note.clientName || '');
    setServiceName(note.serviceName || '');
    setServiceId(note.serviceId || '');
    setTags(note.tags || []);
    setImages(note.images || []);
    setIsViewMode(true);
    setIsEditing(false);
    setIsCreating(true);
  };
  
  // Функция для перехода в режим редактирования
  const switchToEditMode = () => {
    setIsViewMode(false);
    setIsEditing(true);
  };
  
  // Функция для сброса формы
  const resetForm = () => {
    setCurrentNote(null);
    setTitle('');
    setContent('');
    setClientName('');
    setServiceName('');
    setServiceId('');
    setTags([]);
    setTagInput('');
    setImages([]);
    setIsEditing(false);
    setIsCreating(false);
    setIsViewMode(false);
  };
  
  // Функция для добавления тега
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };
  
  // Функция для удаления тега
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Функция для загрузки изображения
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // В реальном приложении здесь должна быть загрузка файлов на сервер
    // и получение URL для отображения
    
    // Временно используем FileReader для локального превью
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Сбрасываем input для возможности повторной загрузки того же файла
    e.target.value = '';
  };
  
  // Функция для удаления изображения
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };
  
  // Функция для открытия диалога выбора файла
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };
  
  // Обработчик для закрытия с анимацией
  const handleClose = () => {
    setIsAnimating(false);
    // Задержка для анимации
    setTimeout(() => {
      onClose();
      resetForm();
    }, 300);
  };
  
  // Фильтрация заметок по поисковому запросу и дате
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm === '' || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.clientName && note.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (note.serviceName && note.serviceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDate = !dateFilter || 
      new Date(note.createdAt).toDateString() === dateFilter.toDateString();
    
    return matchesSearch && matchesDate;
  });
  
  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Функция для запуска голосового ввода
  const startSpeechRecognition = () => {
    // Если уже идёт запись, просто останавливаем
    if (isRecording) {
      stopRecognition();
      return;
    }
    
    // Проверяем поддержку
    const isSpeechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    
    if (!isSpeechRecognitionSupported) {
      toast.error('Ваш браузер не поддерживает голосовой ввод');
      return;
    }
    
    try {
      // Создаем распознаватель
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Сохраняем экземпляр в ref для возможности остановки
      recognitionRef.current = recognition;
      
      // Базовая настройка
      recognition.lang = 'ru-RU';
      recognition.continuous = true; // Непрерывное распознавание
      recognition.interimResults = true;
      
      // Помечаем, что идет запись
      setIsRecording(true);
      setRecordingMessage('Слушаю...');
      
      // При получении результатов
      recognition.onresult = (event: any) => {
        // Получаем последний результат
        const resultIndex = event.results.length - 1;
        const transcript = event.results[resultIndex][0].transcript;
        
        // Обновляем сообщение с текущим распознанным текстом
        // Ограничиваем до последних 30 символов для удобного отображения
        if (transcript.length > 30) {
          setRecordingMessage('...' + transcript.slice(-30));
        } else {
          setRecordingMessage(transcript);
        }
        
        // Если это финальный результат, добавляем текст к редактору
        if (event.results[resultIndex].isFinal) {
          // Вставляем текст в редактор
          if (contentEditorRef.current) {
            const currentContent = contentEditorRef.current.innerHTML;
            const needsSpace = currentContent && !currentContent.endsWith(' ') && !currentContent.endsWith('<br>') && !currentContent.endsWith('</div>');
            
            contentEditorRef.current.innerHTML = currentContent + (needsSpace ? ' ' : '') + transcript;
            setContent(contentEditorRef.current.innerHTML);
            
            // Прокручиваем редактор вниз
            contentEditorRef.current.scrollTop = contentEditorRef.current.scrollHeight;
            
            // Простое уведомление без опций
            toast.success('Текст распознан');
            
            // Сбрасываем сообщение, но продолжаем запись
            setRecordingMessage('Слушаю...');
          }
        }
      };
      
      // Обработка ошибок - полностью игнорируем ошибки network и no-speech
      recognition.onerror = (event: { error: string }) => {
        console.log('Возникла ошибка распознавания (игнорируем):', event.error);
        
        // Только для ошибки доступа к микрофону остановим запись
        if (event.error === 'not-allowed') {
          toast.error('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
          stopRecognition();
          return;
        }
        
        // Все остальные ошибки игнорируем и продолжаем запись
        // Добавляем принудительный перезапуск при любой ошибке
        try {
          setTimeout(() => {
            if (isRecording && recognitionRef.current === recognition) {
              // Создаем новый экземпляр распознавателя
              recognition.abort(); // Явно прерываем текущую сессию
              startSpeechRecognition(); // Перезапускаем полностью
            }
          }, 500);
        } catch (e) {
          console.log('Ошибка при автоматическом перезапуске после ошибки:', e);
          // Даже при ошибке не останавливаем запись
        }
      };
      
      // Когда распознавание завершено
      recognition.onend = () => {
        console.log('Завершение сессии распознавания речи');
        
        // Всегда перезапускаем распознавание, пока пользователь не нажмет "Остановить"
        if (isRecording) {
          try {
            // Добавляем небольшую задержку перед перезапуском
            setTimeout(() => {
              if (isRecording) {
                console.log('Автоматический перезапуск распознавания');
                try {
                  recognition.start();
                } catch (e) {
                  console.log('Не удалось перезапустить тот же экземпляр, создаем новый');
                  // Если не получилось перезапустить, создаем новый экземпляр
                  startSpeechRecognition();
                }
              }
            }, 300);
          } catch (e) {
            console.log('Ошибка при перезапуске распознавания:', e);
            
            // При любой ошибке перезапускаем через createNew
            setTimeout(() => {
              if (isRecording) {
                startSpeechRecognition();
              }
            }, 500);
          }
        }
      };
      
      // Начинаем распознавание
      recognition.start();
      toast.success('Микрофон активирован. Говорите и нажмите "Остановить", когда закончите.');
      
    } catch (error) {
      console.error('Ошибка при запуске распознавания:', error);
      toast.error('Не удалось запустить голосовой ввод');
      stopRecognition();
    }
  };
  
  // Функция для полной остановки распознавания речи
  const stopRecognition = () => {
    // Останавливаем текущий экземпляр распознавания
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Ошибка при остановке распознавания:', e);
      } finally {
        recognitionRef.current = null;
      }
    }
    
    // Сбрасываем состояние записи
    setIsRecording(false);
    setRecordingMessage('');
    
    // Выводим уведомление только если запись была активна
    if (isRecording) {
      toast.info('Запись остановлена');
    }
  };
  
  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecognition();
      }
    };
  }, [isRecording]);

  // При закрытии модального окна останавливаем запись если она активна
  useEffect(() => {
    if (!isOpen && isRecording) {
      stopRecognition();
    }
  }, [isOpen, isRecording]);
  
  // Проверка, соответствует ли заметка текущей открытой записи
  const isNoteMatchingCurrentAppointment = (note: Note) => {
    if (!initialClientName && !initialServiceId) return false;
    
    const clientNameMatch = note.clientName && initialClientName && 
      note.clientName.toLowerCase() === initialClientName.toLowerCase();
    
    const serviceMatch = initialServiceId ? 
      note.serviceId === initialServiceId : 
      (note.serviceName && initialServiceName && 
        note.serviceName.toLowerCase() === initialServiceName.toLowerCase());
    
    return clientNameMatch && serviceMatch;
  };
  
  // Функция для просмотра изображения в полном размере
  const viewFullImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };
  
  // Функция для закрытия просмотра изображения
  const closeFullImage = () => {
    setSelectedImage(null);
  };
  
  // Блокируем скроллинг основной страницы при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      // Сохраняем текущее положение скролла
      const scrollY = window.scrollY;
      
      // Блокируем скроллинг
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'hidden';
      
      return () => {
        // Восстанавливаем скроллинг при закрытии
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflowY = '';
        
        // Восстанавливаем положение скролла
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
  
  // Если модальное окно закрыто
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 transition-opacity duration-300 ease-in-out"
         onClick={handleClose}>
      <div 
        className={`bg-[#fff9f5] rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-5xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 sm:opacity-0'}`}
        onClick={(e) => e.stopPropagation()}>
        
        {/* Модальное окно для просмотра увеличенного изображения */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={closeFullImage}
          >
            <div 
              className="relative w-full max-w-4xl max-h-[90vh] bg-white p-1 sm:p-2 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white rounded-full p-1 shadow-md z-10"
                onClick={closeFullImage}
              >
                <FaTimesCircle size={20} className="text-gray-600" />
              </button>
              <div className="relative w-full h-[60vh] sm:h-[80vh] overflow-hidden">
                <Image 
                  src={selectedImage} 
                  alt="Просмотр изображения"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 90vw"
                  priority
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Полоска для перетаскивания (только на мобильных устройствах) */}
        <div className="h-1.5 w-16 bg-[#ffe8d9] rounded-full mx-auto my-2 sm:hidden"></div>
        
        {/* Заголовок модального окна */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-[#ffe8d9] bg-[#fff0e6]">
          <h2 className="text-lg sm:text-xl font-semibold text-[#cc8b65]">Заметки специалиста</h2>
          <button 
            onClick={handleClose}
            className="text-[#e0b59f] hover:text-[#cc8b65] focus:outline-none p-1"
          >
            <FaTimesCircle size={20} />
          </button>
        </div>
        
        {/* Содержимое модального окна */}
        <div className="flex flex-col md:flex-row h-[calc(85vh-4rem)] sm:h-[calc(80vh-4rem)] overflow-hidden">
          {/* Левая панель со списком заметок */}
          <div className={`w-full md:w-1/3 border-r border-[#ffe8d9] overflow-y-auto -webkit-overflow-scrolling-touch transition-all duration-300 bg-[#fff9f5] ${isCreating && 'hidden md:block'}`}>
            <div className="p-3 sm:p-4 border-b border-[#ffe8d9] bg-[#fff0e6]">
              <div className="relative mb-2 sm:mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-[#e0b59f] text-sm" />
                </div>
                <input
                  type="text"
                  placeholder="Поиск заметок..."
                  className="pl-8 pr-3 py-1.5 sm:py-2 w-full border border-[#ffe8d9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ffe8d9]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                <input
                  type="date"
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-[#ffe8d9] rounded-lg text-xs sm:text-sm flex-grow bg-white focus:outline-none focus:ring-2 focus:ring-[#ffe8d9]"
                  value={dateFilter ? dateFilter.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDateFilter(e.target.value ? new Date(e.target.value) : null)}
                />
                {dateFilter && (
                  <button 
                    onClick={() => setDateFilter(null)}
                    className="text-xs text-[#e0b59f] hover:text-[#cc8b65] font-medium"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              
              <button
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#ffd6bd] text-[#cc8b65] rounded-lg hover:bg-[#ffc9a8] transition-colors text-sm font-medium shadow-sm"
              >
                Новая заметка
              </button>
            </div>
            
            {loading && !isCreating ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-[#ffd6bd] border-r-2"></div>
              </div>
            ) : error ? (
              <div className="p-3 sm:p-4 text-red-600 text-sm">{error}</div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-4 sm:p-6 text-[#cc8b65] text-center">
                <div className="mb-3 sm:mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-[#ffe8d9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm mb-1">
                  {searchTerm || dateFilter ? 'Нет заметок, соответствующих фильтрам' : 'У вас пока нет заметок'}
                </p>
                <p className="text-xs text-[#e0b59f]">
                  Нажмите "Новая заметка", чтобы создать первую заметку
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredNotes.map(note => (
                  <div 
                    key={note.id} 
                    className={`mb-2 sm:mb-3 p-2.5 sm:p-3 bg-white rounded-lg shadow-sm border ${
                      isNoteMatchingCurrentAppointment(note) 
                        ? 'border-amber-400 bg-amber-50 shadow-md' 
                        : 'border-[#ffe8d9] hover:shadow-md'
                    } transition-shadow cursor-pointer`}
                    onClick={() => editNote(note)}
                  >
                    {isNoteMatchingCurrentAppointment(note) && (
                      <div className="mb-2 text-xs font-medium text-amber-600 bg-amber-100 py-1 px-2 rounded flex items-center">
                        <FaStickyNote className="mr-1" size={10} />
                        Заметка для текущей записи
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                      <h3 className="font-semibold text-[#cc8b65] text-sm sm:text-base line-clamp-1">{note.title}</h3>
                      <div className="flex items-center text-xs text-[#e0b59f] ml-2 flex-shrink-0">
                        <FaClock className="mr-1" size={10} />
                        <span>{formatTime(note.updatedAt)}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-[#e0b59f] mb-1.5 sm:mb-2">
                      {formatDate(note.createdAt)}
                    </div>
                    
                    {note.clientName && (
                      <div className="flex items-center text-xs text-[#cc8b65] mb-1.5 sm:mb-2 bg-[#fff0e6] rounded px-2 py-0.5 sm:py-1">
                        <FaUser className="mr-1 text-[#e0b59f]" size={10} />
                        <span className="truncate">{note.clientName}</span>
                      </div>
                    )}

                    {note.serviceName && (
                      <div className="flex items-center text-xs text-[#cc8b65] mb-1.5 sm:mb-2 bg-[#fff0e6] rounded px-2 py-0.5 sm:py-1">
                        <FaBuilding className="mr-1 text-[#e0b59f]" size={10} />
                        <span className="truncate">{note.serviceName}</span>
                      </div>
                    )}
                    
                    <div className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-1.5 sm:mb-2" 
                         dangerouslySetInnerHTML={{ __html: note.content }} />
                         
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="px-1.5 py-0.5 bg-[#fff0e6] text-[#cc8b65] rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Правая панель для создания/редактирования/просмотра заметки */}
          <div className={`w-full md:w-2/3 flex flex-col transition-all duration-300 bg-white ${!isCreating && 'hidden md:flex'}`}>
            <div className="p-3 sm:p-4 border-b border-[#ffe8d9] flex justify-between items-center bg-[#fff0e6]">
              <h3 className="font-semibold text-[#cc8b65]">
                {isViewMode ? 'Просмотр заметки' : isEditing ? 'Редактирование заметки' : 'Новая заметка'}
              </h3>
              <div className="flex space-x-2">
                {isCreating && (
                  <button
                    onClick={() => setIsCreating(false)}
                    className="md:hidden px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 shadow-sm"
                  >
                    Назад
                  </button>
                )}
                <div className="hidden sm:flex space-x-2">
                  {isViewMode && (
                    <button
                      onClick={switchToEditMode}
                      className="px-3 py-1.5 text-sm bg-[#ffd6bd] text-[#cc8b65] rounded-lg hover:bg-[#ffc9a8] flex items-center shadow-sm"
                    >
                      <FaEdit className="mr-1" size={12} /> Редактировать
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => deleteNote(currentNote!.id)}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center shadow-sm"
                      disabled={loading}
                    >
                      <FaTrash className="mr-1" size={12} /> Удалить
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={saveNote}
                      className="px-4 py-1.5 text-sm bg-[#ffd6bd] text-[#cc8b65] rounded-lg hover:bg-[#ffc9a8] flex items-center shadow-sm"
                      disabled={loading}
                    >
                      <FaSave className="mr-1" size={12} /> Сохранить
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Контент с улучшенным скроллингом */}
            <div className="flex-grow p-3 sm:p-4 overflow-y-auto pb-24 sm:pb-4 overscroll-contain -webkit-overflow-scrolling-touch">
              {isViewMode ? (
                /* Режим просмотра */
                <>
                  <div className="mb-3 sm:mb-4">
                    <h2 className="text-lg font-medium text-[#cc8b65] mb-2">{title}</h2>
                    <div className="text-sm text-gray-500 mb-4">
                      Обновлено: {formatDate(currentNote?.updatedAt || '')} в {formatTime(currentNote?.updatedAt || '')}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      {clientName && (
                        <div className="bg-[#fff0e6] p-2 rounded-lg">
                          <div className="text-xs text-[#e0b59f] mb-1">Клиент</div>
                          <div className="text-sm text-[#cc8b65]">{clientName}</div>
                        </div>
                      )}
                      
                      {serviceName && (
                        <div className="bg-[#fff0e6] p-2 rounded-lg">
                          <div className="text-xs text-[#e0b59f] mb-1">Услуга</div>
                          <div className="text-sm text-[#cc8b65]">{serviceName}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-4 bg-white rounded-lg p-3 border border-[#ffe8d9]">
                      <div 
                        className="text-sm text-gray-800 overflow-y-auto" 
                        dangerouslySetInnerHTML={{ __html: content }}
                        style={{ 
                          maxHeight: '300px',
                          overflowY: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          paddingBottom: '60px'
                        }}
                      />
                    </div>
                    
                    {tags && tags.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-[#cc8b65] mb-2">Теги</div>
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <span 
                              key={tag} 
                              className="px-2 py-1 bg-[#fff0e6] text-[#cc8b65] rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {images && images.length > 0 && (
                      <div className="mb-4 pb-16 sm:pb-0">
                        <div className="text-sm font-medium text-[#cc8b65] mb-2">Изображения</div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {images.map((image, index) => (
                            <div key={index} 
                              className="relative w-24 h-24 sm:w-36 sm:h-36 border border-[#ffe8d9] rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => viewFullImage(image)}>
                              <Image 
                                src={image} 
                                alt={`Изображение ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity">
                                <FaSearch className="text-white opacity-0 hover:opacity-100 transform scale-0 hover:scale-100 transition-transform" size={24} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Режим редактирования */
                <>
                  <div className="mb-3 sm:mb-4">
                    <label className="block text-sm font-medium text-[#cc8b65] mb-1">Заголовок</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-[#ffe8d9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffe8d9]"
                      placeholder="Введите заголовок заметки"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#cc8b65] mb-1">Клиент (опционально)</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-2 border border-[#ffe8d9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffe8d9]"
                        placeholder="Имя клиента"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#cc8b65] mb-1">Услуга (опционально)</label>
                      <select
                        value={serviceId}
                        onChange={(e) => {
                          setServiceId(e.target.value);
                          if (e.target.value === '') {
                            setServiceName('');
                          } else {
                            const selectedService = services.find(s => s.id === e.target.value);
                            if (selectedService) {
                              setServiceName(selectedService.name);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-[#ffe8d9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffe8d9]"
                      >
                        <option value="">Без услуги</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-3 sm:mb-4">
                    <label className="block text-sm font-medium text-[#cc8b65] mb-1">Содержание</label>
                    <div className="flex items-center mb-2">
                      <button
                        type="button"
                        className={`flex items-center px-3 py-1.5 rounded-lg focus:outline-none transition-colors duration-200 text-sm ${
                          isRecording 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                        onClick={startSpeechRecognition}
                      >
                        <div className={`rounded-full p-1 mr-2 ${isRecording ? 'bg-red-200' : 'bg-blue-200'}`}>
                          <FaMicrophone className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                        </div>
                        {isRecording ? 'Остановить' : 'Голосовой ввод'}
                      </button>
                    </div>
                    <div className="relative">
                      <div
                        ref={contentEditorRef}
                        contentEditable
                        className="w-full min-h-[150px] sm:min-h-[200px] px-3 py-2 border border-[#ffe8d9] rounded-lg text-sm overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[#ffe8d9] bg-white"
                        onBlur={(e) => setContent(e.currentTarget.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: content }}
                        style={{ 
                          maxHeight: '300px', 
                          overflowY: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          touchAction: 'pan-y',
                          paddingBottom: '60px'
                        }}
                      />
                      
                      {/* Индикатор активного распознавания - показывает последние слова */}
                      {isRecording && recordingMessage && (
                        <div className="absolute top-2 right-2 bg-red-100 text-red-600 px-2 py-1 rounded-md text-xs animate-pulse overflow-hidden max-w-[80%] text-right">
                          {recordingMessage}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3 sm:mb-4">
                    <label className="block text-sm font-medium text-[#cc8b65] mb-1">Теги</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.map(tag => (
                        <span 
                          key={tag} 
                          className="px-2 py-1 bg-[#fff0e6] text-[#cc8b65] rounded-full text-xs flex items-center"
                        >
                          {tag}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTag(tag);
                            }}
                            className="ml-1 text-[#e0b59f] hover:text-[#cc8b65]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="flex-grow px-3 py-2 border border-[#ffe8d9] rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffe8d9]"
                        placeholder="Добавить тег"
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-2 bg-[#ffb38a] text-white border border-[#ffb38a] rounded-r-lg hover:bg-[#ffa575]"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-20 sm:mb-4">
                    <label className="block text-sm font-medium text-[#cc8b65] mb-1">Изображения</label>
                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-2">
                      {images.map((image, index) => (
                        <div key={index} className="relative w-20 h-20 sm:w-28 sm:h-28 border border-[#ffe8d9] rounded-lg overflow-hidden shadow-sm">
                          <Image 
                            src={image} 
                            alt={`Изображение ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md"
                          >
                            <FaTimesCircle size={12} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={openFileDialog}
                        className="w-20 h-20 sm:w-28 sm:h-28 border border-dashed border-[#ffe8d9] rounded-lg flex flex-col items-center justify-center text-[#e0b59f] hover:text-[#cc8b65] hover:bg-[#fff0e6]"
                      >
                        <FaImage size={20} className="sm:text-2xl" />
                        <span className="text-xs mt-2 font-medium">Добавить</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Фиксированная панель с кнопками для мобильных устройств */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#ffe8d9] p-3 flex justify-between items-center shadow-lg z-10">
              {isViewMode && (
                <button
                  onClick={switchToEditMode}
                  className="px-3 py-2 flex-1 mr-2 bg-[#ffd6bd] text-[#cc8b65] rounded-lg hover:bg-[#ffc9a8] flex items-center justify-center shadow-sm"
                >
                  <FaEdit className="mr-1" size={14} /> Редактировать
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => deleteNote(currentNote!.id)}
                  className="px-3 py-2 flex-1 mr-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center shadow-sm"
                >
                  <FaTrash className="mr-1" size={14} /> Удалить
                </button>
              )}
              {isEditing && (
                <button
                  onClick={saveNote}
                  className="px-3 py-2 flex-1 bg-[#ffd6bd] text-[#cc8b65] rounded-lg hover:bg-[#ffc9a8] flex items-center justify-center shadow-sm"
                  disabled={loading}
                >
                  <FaSave className="mr-1" size={14} /> Сохранить
                </button>
              )}
              {!isEditing && !isViewMode && (
                <button
                  onClick={saveNote}
                  className="px-3 py-2 flex-1 bg-[#ffd6bd] text-[#cc8b65] rounded-lg hover:bg-[#ffc9a8] flex items-center justify-center shadow-sm"
                  disabled={loading}
                >
                  <FaSave className="mr-1" size={14} /> Сохранить
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesModal; 
