'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaSave, FaTimes, FaImage, FaEnvelope, FaCog, FaGlobe, FaServer, FaBell, FaSync, FaEye, FaExclamationTriangle, FaFolder, FaRegEnvelope, FaRegBell, FaTelegramPlane, FaUser, FaKey, FaCalendarPlus, FaCheckCircle, FaTimesCircle, FaStar, FaLightbulb, FaBold, FaItalic, FaLink, FaListUl, FaListOl, FaUndo, FaRedo, FaCode, FaDatabase, FaRocket, FaBroom } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from '../../../components/ui/Toast';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';

// Обновляем интерфейс SiteSettings, добавив правильную типизацию для enabledTemplates
interface SiteSettings {
  system: {
    siteName: string;
    siteDescription: string;
    contactPhone: string;
    contactEmail: string;
    contactAddress: string;
    favicon: string;
    metaTitle: string;
    metaDescription: string;
    imageSizes: {
      hero: string;
      thumbnail: string;
      gallery: string;
    };
    enableImageCompression: boolean;
    imageCompressionQuality: number;
    enableWebp: boolean;
    enableLazyLoading: boolean;
    maxUploadFileSize: number;
    maxVideoUploadSize: number;
    videoCompressionEnabled: boolean;
    videoCompressionQuality: number;
    cachingEnabled: boolean;
    cacheDuration: number;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  notifications: {
    templates: {
      registration: string;
      passwordReset: string;
      appointmentCreated: string;
      appointmentConfirmed: string;
      appointmentCancelled: string;
      appointmentReminder: string;
      reviewPublished: string;
      booking: string;
    };
    fromEmail: string;
    enabledTemplates: {
      registration: boolean;
      passwordReset: boolean;
      appointmentCreated: boolean;
      appointmentConfirmed: boolean;
      appointmentCancelled: boolean;
      appointmentReminder: boolean;
      reviewPublished: boolean;
      booking: boolean;
    };
  };
}

// Компонент панели инструментов для редактора Tiptap
const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-gray-100 rounded-t-lg border border-gray-300 border-b-0">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Жирный"
      >
        <FaBold />
      </button>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Курсив"
      >
        <FaItalic />
      </button>

      <div className="h-5 mx-1 border-l border-gray-300"></div>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Маркированный список"
      >
        <FaListUl />
      </button>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Нумерованный список"
      >
        <FaListOl />
      </button>

      <div className="h-5 mx-1 border-l border-gray-300"></div>
      
      <button
        type="button"
        onClick={() => {
          const url = prompt('URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={`p-1.5 rounded ${editor.isActive('link') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Ссылка"
      >
        <FaLink />
      </button>

      <div className="h-5 mx-1 border-l border-gray-300"></div>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Отменить"
      >
        <FaUndo />
      </button>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Повторить"
      >
        <FaRedo />
      </button>

      <div className="h-5 mx-1 border-l border-gray-300"></div>
      
      <button
        type="button"
        onClick={() => {
          const html = editor.getHTML();
          editor.commands.setContent(html);
        }}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Режим HTML"
      >
        <FaCode />
      </button>
    </div>
  );
};

// Компонент редактора шаблона
const TemplateEditor = ({ value, onChange, placeholder }: { value: string, onChange: (html: string) => void, placeholder?: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm min-h-[200px] w-full p-3 focus:outline-none',
      },
    },
  });

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} className="font-mono text-sm bg-white" />
    </div>
  );
};

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Псевдо-загрузка текущих настроек
  const [settings, setSettings] = useState<SiteSettings>({
    system: {
      siteName: 'Вдохновение',
      siteDescription: 'Центр психологии и релаксации',
      contactPhone: '+7 (999) 123-45-67',
      contactEmail: 'info.vdohnovenie.pro@gmail.com',
      contactAddress: '',
      favicon: '/images/logo-flower.png',
      metaTitle: 'Вдохновение - Центр психологии и релаксации',
      metaDescription: 'Профессиональные услуги массажа, йоги, психологии и медитации для вашего здоровья и благополучия.',
      imageSizes: {
        hero: '1200x630',
        thumbnail: '300x300',
        gallery: '800x600',
      },
      enableImageCompression: true,
      imageCompressionQuality: 85,
      enableWebp: true,
      enableLazyLoading: true,
      maxUploadFileSize: 10,
      maxVideoUploadSize: 10,
      videoCompressionEnabled: true,
      videoCompressionQuality: 85,
      cachingEnabled: true,
      cacheDuration: 3600,
      maintenanceMode: false,
      maintenanceMessage: 'Сайт находится в режиме обслуживания',
    },
    notifications: {
      templates: {
        registration: '<p>Здравствуйте, {firstName} {lastName}!</p><p>Благодарим за регистрацию на сайте "{siteName}".</p><p>Для подтверждения вашего email, пожалуйста, перейдите по следующей ссылке: <a href="{verificationUrl}">Подтвердить регистрацию</a></p><p>С уважением, Центр "Вдохновение"</p>',
        passwordReset: '<p>Здравствуйте, {firstName} {lastName}!</p><p>Вы запросили сброс пароля на сайте "{siteName}".</p><p>Для установки нового пароля перейдите по следующей ссылке: <a href="{resetUrl}">Сбросить пароль</a></p><p>Если вы не запрашивали сброс пароля, проигнорируйте это сообщение.</p><p>С уважением, Центр "Вдохновение"</p>',
        appointmentCreated: '<p>Здравствуйте, {firstName} {lastName}!</p><p>Ваша запись на прием успешно создана.</p><p>Услуга: {serviceName}</p><p>Специалист: {specialistName}</p><p>Дата: {date}</p><p>Время: {startTime} - {endTime}</p><p>Стоимость: {price} руб.</p><p>Ожидайте подтверждения от специалиста.</p><p>С уважением, Центр "Вдохновение"</p>',
        appointmentConfirmed: '<p>Здравствуйте, {firstName} {lastName}!</p><p>Ваша запись на прием подтверждена.</p><p>Услуга: {serviceName}</p><p>Специалист: {specialistName}</p><p>Дата: {date}</p><p>Время: {startTime} - {endTime}</p><p>Стоимость: {price} руб.</p><p>С уважением, Центр "Вдохновение"</p>',
        appointmentCancelled: '<p>Здравствуйте, {firstName} {lastName}!</p><p>Ваша запись на прием была отменена.</p><p>Услуга: {serviceName}</p><p>Специалист: {specialistName}</p><p>Дата: {date}</p><p>Время: {startTime} - {endTime}</p><p>Причина отмены: {cancelReason}</p><p>Для создания новой записи посетите наш <a href="{siteUrl}">сайт</a>.</p><p>С уважением, Центр "Вдохновение"</p>',
        appointmentReminder: '<p>Здравствуйте, {firstName} {lastName}!</p><p>Напоминаем, что завтра у вас запланирован прием.</p><p>Услуга: {serviceName}</p><p>Специалист: {specialistName}</p><p>Дата: {date}</p><p>Время: {startTime} - {endTime}</p><p>При невозможности посещения, пожалуйста, сообщите заранее по телефону: {sitePhone}</p><p>С уважением, Центр "Вдохновение"</p>',
        reviewPublished: '<p>Здравствуйте, {firstName} {lastName}!</p><p>Ваш отзыв о специалисте {specialistName} успешно опубликован.</p><p>Ваша оценка: {rating}/5</p><p>Текст отзыва: "{reviewText}"</p><p>Благодарим за ваш отзыв и доверие нашему центру!</p><p>Вы можете увидеть свой отзыв на <a href="{specialistUrl}">странице специалиста</a>.</p><p>С уважением, Центр "Вдохновение"</p>',
        booking: '<p>Здравствуйте, {client_name}!</p><p>Ваша запись на услугу {service_name} подтверждена.</p><p>Дата и время: {date_time}</p><p>Специалист: {specialist_name}</p><p>С уважением, Центр "Вдохновение"</p>',
      },
      fromEmail: 'info.vdohnovenie.pro@gmail.com',
      enabledTemplates: {
        registration: true,
        passwordReset: true,
        appointmentCreated: true,
        appointmentConfirmed: true,
        appointmentCancelled: true,
        appointmentReminder: true,
        reviewPublished: true,
        booking: true,
      },
    },
  });
  
  // Текущая активная вкладка
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'notifications' | 'system'>('general');
  
  // Состояние отправки формы и операций оптимизации
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isOptimizingDB, setIsOptimizingDB] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false);
  const [isPrerendering, setIsPrerendering] = useState(false);
  const [isCleaningFiles, setIsCleaningFiles] = useState(false);
  
  // Состояние активной вкладки внутри Настроек уведомлений
  const [activeNotificationTab, setActiveNotificationTab] = useState<'general' | 'email-templates'>('general');
  
  // Добавляем состояние для email-адреса
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testTemplate, setTestTemplate] = useState('registration');
  const [templateTestEmailAddress, setTemplateTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Защита маршрута: только для админов
  useEffect(() => {
    // Проверяем и выводим в консоль данные пользователя
    if (!isLoading && user) {
      console.log('Данные пользователя в админке (настройки):', user);
      console.log('Роль пользователя:', user.role);
    }
    
    // Приводим роль к верхнему регистру для сравнения
    const userRole = user?.role?.toUpperCase();
    
    // Если пользователь не админ, перенаправляем на главную страницу
    if (!isLoading && (!user || userRole !== 'ADMIN')) {
      console.log('Доступ запрещен: пользователь не администратор');
      toast.error('У вас нет прав для доступа к настройкам сайта');
      router.replace('/');
    }
  }, [user, isLoading, router]);
  
  // Загрузка текущих настроек с сервера при монтировании компонента
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings/general');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            // Обновляем только систему, сохраняя настройки уведомлений
            setSettings(prev => ({
              ...prev,
              system: {
                ...prev.system,
                ...data.settings
              }
            }));
            console.log('Настройки успешно загружены с сервера:', data.settings);
          }
        } else {
          console.error('Ошибка при загрузке настроек:', await response.text());
        }
      } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
      }
    };
    
    // Загружаем настройки только если пользователь авторизован как админ
    if (user && user.role?.toUpperCase() === 'ADMIN') {
      loadSettings();
    }
  }, [user]);
  
  // Обработчик изменения полей формы
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    section?: keyof SiteSettings
  ) => {
    const { name, value, type } = e.target;
    
    if (section) {
      // Если это поле из вложенного объекта
      setSettings(prev => {
        // Создаем временную переменную для типизированного доступа к секции
        // @ts-ignore - Игнорируем проверку типов для индексного доступа
        const sectionData = { ...prev[section] as Record<string, any> };
        
        if (type === 'checkbox' && 'checked' in e.target) {
          sectionData[name] = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
          sectionData[name] = Number(value);
        } else {
          sectionData[name] = value;
        }
        
        return {
          ...prev,
          [section]: sectionData
        };
      });
    } else {
      // Если это поле верхнего уровня или поле в system
      if (name === 'metaTitle' || name === 'metaDescription' || name === 'siteName' || 
          name === 'siteDescription' || name === 'contactPhone' || name === 'contactEmail') {
        // Специальная обработка для полей в system
        setSettings(prev => ({
          ...prev,
          system: {
            ...prev.system,
            [name]: value
          }
        }));
      } else {
        // Обработка других полей верхнего уровня
        setSettings(prev => ({
          ...prev,
          [name]: type === 'checkbox' && 'checked' in e.target 
            ? (e.target as HTMLInputElement).checked 
            : type === 'number' 
              ? Number(value) 
              : value
        }));
      }
    }
  };
  
  // Обработчик изменения настроек компрессии изображений
  const handleImageCompressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prev => ({
      ...prev,
      system: {
        ...prev.system,
        [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
      }
    }));
  };
  
  // Обработчик изменения настроек уведомлений
  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setSettings(prev => {
      const newEnabledTemplates = {
        ...prev.notifications.enabledTemplates,
        [name]: checked
      };
      
      const newSettings = {
        ...prev,
        notifications: {
          ...prev.notifications,
          enabledTemplates: newEnabledTemplates as {
            registration: boolean;
            passwordReset: boolean;
            appointmentCreated: boolean;
            appointmentConfirmed: boolean;
            appointmentCancelled: boolean;
            appointmentReminder: boolean;
            reviewPublished: boolean;
            booking: boolean;
          }
        }
      };
      
      // Вызываем сохранение настроек после обновления состояния
      setTimeout(() => saveNotificationSettings(), 0);
      
      return newSettings;
    });
  };
  
  // Обработчик изменения шаблонов уведомлений
  const handleTemplateChange = (content: string, templateName: string) => {    
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        templates: {
          ...prev.notifications.templates,
          [templateName]: content
        }
      }
    }));
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      // В зависимости от текущей вкладки, отправляем соответствующие настройки
      let response;
      
      if (activeTab === 'media') {
        // Если активна вкладка медиа, отправляем настройки медиа
        response = await fetch('/api/admin/settings/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings.system.imageSizes),
        });
      } else if (activeTab === 'general') {
        // Если активна вкладка основных настроек, отправляем все настройки системы
        response = await fetch('/api/admin/settings/general', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            system: settings.system
          }),
        });
        
        // Если фавикон - это base64 строка (новый загруженный файл), 
        // отправляем его на сервер для сохранения отдельно
        if (settings.system.favicon && settings.system.favicon.startsWith('data:')) {
          const faviconResponse = await fetch('/api/admin/settings/favicon', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ favicon: settings.system.favicon }),
          });
        }
      } else {
        // Имитация отправки данных на сервер для других вкладок
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Настройки сохранены:', settings);
      }
      
      // Показываем сообщение об успехе
      setSubmitSuccess(true);
      toast.success('Настройки успешно сохранены!');
      
      // Скрываем сообщение через 3 секунды
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      toast.error('Произошла ошибка при сохранении настроек');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Обработчик очистки неактуальных связей
  const cleanupRelations = async () => {
    if (isCleaning) return;
    
    setIsCleaning(true);
    
    try {
      // Делаем запрос к API для очистки связей
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Неактуальные связи успешно очищены');
      } else {
        toast.error(data.error || 'Ошибка при очистке связей');
      }
    } catch (error) {
      console.error('Ошибка при очистке связей:', error);
      toast.error('Произошла ошибка при очистке связей');
    } finally {
      setIsCleaning(false);
    }
  };
  
  // Обработчик оптимизации базы данных
  const optimizeDatabase = async () => {
    if (isOptimizingDB) return;
    
    setIsOptimizingDB(true);
    
    try {
      const response = await fetch('/api/admin/optimize/database', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'База данных успешно оптимизирована');
      } else {
        toast.error(data.error || 'Ошибка при оптимизации базы данных');
      }
    } catch (error) {
      console.error('Ошибка при оптимизации базы данных:', error);
      toast.error('Произошла ошибка при оптимизации базы данных');
    } finally {
      setIsOptimizingDB(false);
    }
  };
  
  // Обработчик очистки кеша сайта
  const clearSiteCache = async () => {
    if (isCleaningCache) return;
    
    setIsCleaningCache(true);
    
    try {
      const response = await fetch('/api/admin/optimize/cache', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Кеш сайта успешно очищен');
      } else {
        toast.error(data.error || 'Ошибка при очистке кеша сайта');
      }
    } catch (error) {
      console.error('Ошибка при очистке кеша сайта:', error);
      toast.error('Произошла ошибка при очистке кеша сайта');
    } finally {
      setIsCleaningCache(false);
    }
  };
  
  // Обработчик регенерации миниатюр изображений
  const regenerateImageThumbnails = async () => {
    if (isRegeneratingImages) return;
    
    setIsRegeneratingImages(true);
    
    try {
      const response = await fetch('/api/admin/optimize/images', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || `Миниатюры изображений успешно регенерированы (${data.count} шт.)`);
      } else {
        toast.error(data.error || 'Ошибка при регенерации миниатюр изображений');
      }
    } catch (error) {
      console.error('Ошибка при регенерации миниатюр изображений:', error);
      toast.error('Произошла ошибка при регенерации миниатюр изображений');
    } finally {
      setIsRegeneratingImages(false);
    }
  };
  
  // Обработчик предварительного рендеринга страниц
  const prerenderPages = async () => {
    if (isPrerendering) return;
    
    setIsPrerendering(true);
    
    try {
      const response = await fetch('/api/admin/optimize/prerender', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Страницы успешно предварительно отрендерены');
      } else {
        toast.error(data.error || 'Ошибка при предварительном рендеринге страниц');
      }
    } catch (error) {
      console.error('Ошибка при предварительном рендеринге страниц:', error);
      toast.error('Произошла ошибка при предварительном рендеринге страниц');
    } finally {
      setIsPrerendering(false);
    }
  };
  
  // Функция для форматирования размера файла
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' КБ';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' ГБ';
  };
  
  // Обработчик отправки тестового письма
  const handleSendTestEmail = async (templateName: string, useTemplateEmail: boolean = false) => {
    // Если email не указан, используем testEmailAddress или templateTestEmailAddress
    const emailToUse = useTemplateEmail ? templateTestEmailAddress : testEmailAddress;
    
    if (!emailToUse) {
      toast.error('Укажите email для отправки тестового письма');
      return;
    }
    
    setIsSendingTest(true);
    
    try {
      // Получаем содержимое шаблона
      const templateContent = settings.notifications.templates[templateName as keyof typeof settings.notifications.templates];
      
      // Отправляем запрос на API
      const response = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToUse,
          templateName,
          templateContent
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Тестовое письмо отправлено на ${emailToUse}`);
      } else {
        toast.error(`Ошибка при отправке письма: ${data.error}`);
      }
    } catch (error) {
      console.error('Ошибка при отправке тестового письма:', error);
      toast.error('Произошла ошибка при отправке тестового письма');
    } finally {
      setIsSendingTest(false);
    }
  };
  
  // Исправление обращения к favicon
  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        // TypeScript не уверен, что event.target существует, но в реальности он всегда будет
        // @ts-ignore - игнорируем предупреждение о возможном null в event.target
        if (event.target && event.target.result) {
          setSettings(prev => ({
            ...prev,
            system: {
              ...prev.system,
              favicon: event.target.result as string
            }
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // После handleNotificationsChange добавляем новую функцию
  // Функция для сохранения настроек уведомлений при изменении статуса переключателей
  const saveNotificationSettings = async () => {
    try {
      // Отправляем запрос на API для сохранения настроек
      const response = await fetch('/api/admin/settings/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabledTemplates: settings.notifications.enabledTemplates
        }),
      });
      
      if (response.ok) {
        // Обрабатываем успешный ответ
        const data = await response.json();
        if (data.success) {
          toast.success('Настройки уведомлений успешно сохранены!');
        } else {
          toast.error(data.error || 'Ошибка при сохранении настроек уведомлений');
        }
      } else {
        toast.error('Ошибка при сохранении настроек уведомлений');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек уведомлений:', error);
      toast.error('Произошла ошибка при сохранении настроек уведомлений');
    }
  };
  
  // Функция для очистки неиспользуемых файлов
  const cleanupUnusedFiles = async () => {
    if (isCleaningFiles) return;
    
    if (!confirm('Вы действительно хотите выполнить очистку неиспользуемых файлов? Это удалит все изображения и документы, которые больше не используются в базе данных.')) {
      return;
    }
    
    setIsCleaningFiles(true);
    
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Неиспользуемые файлы успешно очищены!');
        } else {
          toast.error('Ошибка при очистке файлов: ' + (data.error || 'Неизвестная ошибка'));
        }
      } else {
        toast.error('Ошибка при выполнении запроса очистки файлов');
      }
    } catch (error) {
      console.error('Ошибка при очистке файлов:', error);
      toast.error('Произошла ошибка при выполнении очистки файлов');
    } finally {
      setIsCleaningFiles(false);
    }
  };
  
  // Пока проверяем авторизацию, показываем загрузку
  if (isLoading) {
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
  
  // Исправление сравнений активной вкладки
  const isTabActive = (tab: string): boolean => {
    return activeTab === tab;
  };
  
  return (
    <div className="container mx-auto px-3 md:px-4 py-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4">Настройки сайта</h1>
        
      <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        ← Вернуться в панель управления
      </Link>
        
      {submitSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
          <p className="text-green-700">
            Настройки успешно сохранены!
          </p>
        </div>
      )}
        
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Табы - адаптивное отображение */}
        <div className="flex flex-wrap border-b border-gray-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium flex items-center ${isTabActive('general') ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaGlobe className="inline mr-1 md:mr-2" /> <span className="hidden xs:inline">Основные</span>
          </button>
            
          <button
            onClick={() => setActiveTab('media')}
            className={`py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium flex items-center ${isTabActive('media') ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaImage className="inline mr-1 md:mr-2" /> <span className="hidden xs:inline">Медиа</span>
          </button>
            
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium flex items-center ${isTabActive('notifications') ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaBell className="inline mr-1 md:mr-2" /> <span className="hidden xs:inline">Уведомления</span>
          </button>
            
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium flex items-center ${isTabActive('system') ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaServer className="inline mr-1 md:mr-2" /> <span className="hidden xs:inline">Система</span>
          </button>
        </div>
          
        {/* Содержимое табов */}
        <form onSubmit={handleSubmit} className="p-3 md:p-6">
          {/* Общие настройки */}
          {isTabActive('general') && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FaGlobe className="mr-2 text-[#48a9a6]" />
                Общие настройки сайта
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-1">
                      Название сайта
                    </label>
                    <input
                      type="text"
                      id="siteName"
                      name="siteName"
                      value={settings.system.siteName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Контактный Email
                    </label>
                    <input
                      type="email"
                      id="contactEmail"
                      name="contactEmail"
                      value={settings.system.contactEmail}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Описание сайта
                    </label>
                    <input
                      type="text"
                      id="siteDescription"
                      name="siteDescription"
                      value={settings.system.siteDescription}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                      Контактный телефон
                    </label>
                    <input
                      type="text"
                      id="contactPhone"
                      name="contactPhone"
                      value={settings.system.contactPhone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-md font-medium mb-3 flex items-center">
                    <FaImage className="mr-2 text-gray-600" />
                    Фавикон сайта
                  </h3>
                  
                  <div className="mb-4">
                    <label htmlFor="faviconUpload" className="block text-sm font-medium text-gray-700 mb-1">
                      Иконка сайта (favicon)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md overflow-hidden">
                        {settings.system.favicon ? (
                          <Image
                            src={settings.system.favicon}
                            alt="Favicon"
                            width={64}
                            height={64}
                            className="h-16 w-16 object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <FaImage className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          id="faviconUpload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFaviconChange}
                        />
                        <label
                          htmlFor="faviconUpload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#48a9a6] hover:bg-[#3d908d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#48a9a6]"
                        >
                          Загрузить новую иконку
                        </label>
                        <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF до 1MB. Рекомендуемый размер 96x96px.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-md font-medium mb-3 flex items-center">
                    <FaCog className="mr-2 text-gray-600" />
                    Настройки SEO
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        id="metaTitle"
                        name="metaTitle"
                        value={settings.system.metaTitle}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Заголовок страницы для поисковых систем
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
                        Meta Description
                      </label>
                      <textarea
                        id="metaDescription"
                        name="metaDescription"
                        value={settings.system.metaDescription}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Краткое описание сайта для поисковых систем (до 160 символов)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Настройки оптимизации медиа */}
          {isTabActive('media') && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FaImage className="mr-2 text-[#48a9a6]" />
                Оптимизация изображений и медиа
              </h2>
              
              <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-700 text-sm">
                  Настройки оптимизации влияют на скорость загрузки сайта и качество изображений. 
                  Рекомендуется включить все опции оптимизации для лучшей производительности.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="imageCompression-enabled"
                      name="enabled"
                      checked={settings.system.enableImageCompression}
                      onChange={handleImageCompressionChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="imageCompression-enabled" className="font-medium text-gray-700">
                      Включить оптимизацию изображений
                    </label>
                    <p className="text-gray-500">
                      Автоматическая оптимизация всех загружаемых изображений
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="imageCompression-convertToWebp"
                      name="convertToWebp"
                      checked={settings.system.enableWebp}
                      onChange={handleImageCompressionChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="imageCompression-convertToWebp" className="font-medium text-gray-700">
                      Конвертировать в WebP
                    </label>
                    <p className="text-gray-500">
                      Автоматическая конвертация изображений в современный формат WebP для уменьшения размера
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="imageCompression-lazyLoading"
                      name="lazyLoading"
                      checked={settings.system.enableLazyLoading}
                      onChange={handleImageCompressionChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="imageCompression-lazyLoading" className="font-medium text-gray-700">
                      Ленивая загрузка изображений
                    </label>
                    <p className="text-gray-500">
                      Загрузка изображений только при прокрутке страницы до них
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label htmlFor="imageCompression-quality" className="block text-sm font-medium text-gray-700 mb-1">
                      Качество изображений (%)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        id="imageCompression-quality"
                        name="quality"
                        min="50"
                        max="100"
                        value={settings.system.imageCompressionQuality}
                        onChange={handleImageCompressionChange}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="ml-2 w-8 text-sm font-medium text-gray-700">
                        {settings.system.imageCompressionQuality}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Баланс между качеством и размером файла (рекомендуется 80-90%)
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="imageCompression-maxWidth" className="block text-sm font-medium text-gray-700 mb-1">
                      Максимальная ширина (px)
                    </label>
                    <input
                      type="number"
                      id="imageCompression-maxWidth"
                      name="maxWidth"
                      min="800"
                      max="2500"
                      value={settings.system.imageSizes.hero.split('x')[0]}
                      onChange={handleImageCompressionChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Изображения будут автоматически уменьшены до указанной ширины
                    </p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="imageCompression-maxFileSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Максимальный размер файла (МБ)
                  </label>
                  <input
                    type="number"
                    id="imageCompression-maxFileSize"
                    name="maxFileSize"
                    min="1"
                    max="50"
                    value={settings.system.maxUploadFileSize}
                    onChange={handleImageCompressionChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Максимально допустимый размер загружаемого изображения в мегабайтах
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Настройки уведомлений */}
          {isTabActive('notifications') && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FaBell className="mr-2 text-[#48a9a6]" />
                Настройки уведомлений
              </h2>
              
              {/* Вкладки внутри настроек уведомлений */}
              <div className="mb-6 border-b border-gray-200">
                <div className="flex flex-wrap -mb-px">
                  <button
                    className={`mr-2 inline-block p-4 border-b-2 rounded-t-lg ${
                      activeNotificationTab === 'general'
                        ? 'text-[#48a9a6] border-[#48a9a6]'
                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveNotificationTab('general')}
                  >
                    <div className="flex items-center">
                      <FaRegBell className="mr-2" />
                      <span>Общие настройки</span>
                    </div>
                  </button>
                  <button
                    className={`mr-2 inline-block p-4 border-b-2 rounded-t-lg ${
                      activeNotificationTab === 'email-templates'
                        ? 'text-[#48a9a6] border-[#48a9a6]'
                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveNotificationTab('email-templates')}
                  >
                    <div className="flex items-center">
                      <FaRegEnvelope className="mr-2" />
                      <span>Email рассылка</span>
                    </div>
                  </button>
                </div>
              </div>
              
              {activeNotificationTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="notifications-adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Email администратора
                      </label>
                      <input
                        type="email"
                        id="notifications-adminEmail"
                        name="adminEmail"
                        value={settings.notifications.fromEmail}
                        onChange={handleNotificationsChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        На этот адрес будут отправляться уведомления о новых записях
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="notifications-sendNotificationsFrom" className="block text-sm font-medium text-gray-700 mb-1">
                        Отправлять письма от имени
                      </label>
                      <input
                        type="email"
                        id="notifications-sendNotificationsFrom"
                        name="sendNotificationsFrom"
                        value={settings.notifications.fromEmail}
                        onChange={handleNotificationsChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Email, который будет указан в качестве отправителя писем
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          id="notifications-bookingNotifications"
                          name="bookingNotifications"
                          checked={settings.notifications.enabledTemplates?.booking ?? true}
                          onChange={handleNotificationsChange}
                          className="w-4 h-4 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="notifications-bookingNotifications" className="font-medium text-gray-700">
                          Уведомления о бронировании
                        </label>
                        <p className="text-gray-500">
                          Отправлять клиентам уведомления о подтверждении бронирования
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          id="notifications-newUserNotifications"
                          name="newUserNotifications"
                          checked={settings.notifications.enabledTemplates?.registration ?? true}
                          onChange={handleNotificationsChange}
                          className="w-4 h-4 rounded border-gray-300 text-[#48a9a6] focus:ring-[#48a9a6]"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="notifications-newUserNotifications" className="font-medium text-gray-700">
                          Уведомления о новых пользователях
                        </label>
                        <p className="text-gray-500">
                          Получать уведомления при регистрации новых пользователей
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-medium mb-2">Тестирование</h3>
                    <div className="flex items-center mt-2">
                      <button 
                        type="button"
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 flex items-center"
                        onClick={() => handleSendTestEmail('booking')}
                        disabled={isSendingTest}
                      >
                        <FaEnvelope className="mr-1" />
                        {isSendingTest ? 'Отправка...' : 'Отправить тестовое письмо'}
                      </button>
                      <input
                        type="email"
                        placeholder="Ваш email для теста"
                        className="ml-2 px-3 py-1 rounded-lg border border-gray-300 text-sm flex-grow"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {activeNotificationTab === 'email-templates' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 mb-6">
                    <p className="text-blue-700 text-sm">
                      Здесь вы можете настроить все шаблоны email-уведомлений, которые будут отправляться пользователям в различных ситуациях.
                      Для персонализации сообщений можно использовать переменные, указанные под каждым шаблоном.
                    </p>
                  </div>
                  
                  {/* Навигация по типам шаблонов */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Выберите шаблон для редактирования:
                    </label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      onChange={(e) => {
                        const templateId = e.target.value;
                        // Автоматическая прокрутка к выбранному шаблону
                        const element = document.getElementById(`template-${templateId}`);
                        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <option value="registration">Регистрация нового пользователя</option>
                      <option value="passwordReset">Сброс пароля</option>
                      <option value="appointmentCreated">Создание записи на прием</option>
                      <option value="appointmentConfirmed">Подтверждение записи</option>
                      <option value="appointmentCancelled">Отмена записи</option>
                      <option value="appointmentReminder">Напоминание о приеме</option>
                      <option value="reviewPublished">Публикация отзыва</option>
                    </select>
                  </div>
                  
                  {/* Шаблон: Регистрация нового пользователя */}
                  <div id="template-registration" className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FaUser className="text-green-500 mr-2" />
                        <h3 className="text-lg font-medium">Шаблон уведомления при регистрации</h3>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">Отправлять уведомление</span>
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.notifications.enabledTemplates?.registration ?? true}
                            onChange={(e) => {
                              setSettings(prev => {
                                const newEnabledTemplates = {
                                  ...prev.notifications.enabledTemplates,
                                  registration: e.target.checked
                                };
                                
                                const newSettings = {
                                  ...prev,
                                  notifications: {
                                    ...prev.notifications,
                                    enabledTemplates: newEnabledTemplates as {
                                      registration: boolean;
                                      passwordReset: boolean;
                                      appointmentCreated: boolean;
                                      appointmentConfirmed: boolean;
                                      appointmentCancelled: boolean;
                                      appointmentReminder: boolean;
                                      reviewPublished: boolean;
                                      booking: boolean;
                                    }
                                  }
                                };
                                
                                // Вызываем сохранение настроек после обновления состояния
                                setTimeout(() => saveNotificationSettings(), 0);
                                
                                return newSettings;
                              });
                            }}
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#48a9a6]/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#48a9a6]"></div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 p-2 mb-3 rounded-md text-sm text-amber-700">
                      <div className="font-medium mb-1 flex items-center">
                        <FaLightbulb className="mr-1" /> Подсказка по форматированию:
                      </div>
                      <p className="mb-1">Используйте панель инструментов для форматирования текста. Переменные в формате {'{firstName}'} будут заменены на соответствующие данные.</p>
                    </div>
                    
                    <TemplateEditor 
                      value={settings.notifications.templates.registration}
                      onChange={(content) => handleTemplateChange(content, 'registration')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Доступные переменные: {'{firstName}'}, {'{lastName}'}, {'{email}'}, {'{siteName}'}, {'{verificationUrl}'}
                    </p>
                  </div>
                  
                  {/* Шаблон: Сброс пароля */}
                  <div id="template-passwordReset" className="p-4 border border-gray-200 rounded-lg mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FaKey className="text-yellow-500 mr-2" />
                        <h3 className="text-lg font-medium">Шаблон уведомления о сбросе пароля</h3>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">Отправлять уведомление</span>
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.notifications.enabledTemplates?.passwordReset ?? true}
                            onChange={(e) => {
                              setSettings(prev => {
                                const newEnabledTemplates = {
                                  ...prev.notifications.enabledTemplates,
                                  passwordReset: e.target.checked
                                };
                                
                                const newSettings = {
                                  ...prev,
                                  notifications: {
                                    ...prev.notifications,
                                    enabledTemplates: newEnabledTemplates as {
                                      registration: boolean;
                                      passwordReset: boolean;
                                      appointmentCreated: boolean;
                                      appointmentConfirmed: boolean;
                                      appointmentCancelled: boolean;
                                      appointmentReminder: boolean;
                                      reviewPublished: boolean;
                                      booking: boolean;
                                    }
                                  }
                                };
                                
                                // Вызываем сохранение настроек после обновления состояния
                                setTimeout(() => saveNotificationSettings(), 0);
                                
                                return newSettings;
                              });
                            }}
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#48a9a6]/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#48a9a6]"></div>
                        </label>
                      </div>
                    </div>
                    
                    <TemplateEditor 
                      value={settings.notifications.templates.passwordReset}
                      onChange={(content) => handleTemplateChange(content, 'passwordReset')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Доступные переменные: {'{firstName}'}, {'{lastName}'}, {'{email}'}, {'{siteName}'}, {'{resetUrl}'}
                    </p>
                  </div>
                  
                  {/* Шаблон: Создание записи на прием */}
                  <div id="template-appointmentCreated" className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center mb-3">
                      <FaCalendarPlus className="text-blue-500 mr-2" />
                      <h3 className="text-lg font-medium">Шаблон уведомления о создании записи</h3>
                    </div>
                    
                    <TemplateEditor 
                      value={settings.notifications.templates.appointmentCreated}
                      onChange={(content) => handleTemplateChange(content, 'appointmentCreated')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Доступные переменные: {'{firstName}'}, {'{lastName}'}, {'{date}'}, {'{startTime}'}, {'{endTime}'}, {'{serviceName}'}, {'{specialistName}'}, {'{price}'}
                    </p>
                  </div>
                  
                  {/* Шаблон: Подтверждение записи */}
                  <div id="template-appointmentConfirmed" className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center mb-3">
                      <FaCheckCircle className="text-green-500 mr-2" />
                      <h3 className="text-lg font-medium">Шаблон уведомления о подтверждении записи</h3>
                    </div>
                    
                    <TemplateEditor 
                      value={settings.notifications.templates.appointmentConfirmed}
                      onChange={(content) => handleTemplateChange(content, 'appointmentConfirmed')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Доступные переменные: {'{firstName}'}, {'{lastName}'}, {'{date}'}, {'{startTime}'}, {'{endTime}'}, {'{serviceName}'}, {'{specialistName}'}, {'{price}'}
                    </p>
                  </div>
                  
                  {/* Шаблон: Отмена записи */}
                  <div id="template-appointmentCancelled" className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center mb-3">
                      <FaTimesCircle className="text-red-500 mr-2" />
                      <h3 className="text-lg font-medium">Шаблон уведомления об отмене записи</h3>
                    </div>
                    
                    <TemplateEditor 
                      value={settings.notifications.templates.appointmentCancelled}
                      onChange={(content) => handleTemplateChange(content, 'appointmentCancelled')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Доступные переменные: {'{firstName}'}, {'{lastName}'}, {'{date}'}, {'{startTime}'}, {'{endTime}'}, {'{serviceName}'}, {'{specialistName}'}, {'{cancelReason}'}
                    </p>
                  </div>
                  
                  {/* Шаблон: Напоминание о приеме */}
                  <div id="template-appointmentReminder" className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center mb-3">
                      <FaBell className="text-amber-500 mr-2" />
                      <h3 className="text-lg font-medium">Шаблон напоминания о записи</h3>
                    </div>
                    
                    <TemplateEditor 
                      value={settings.notifications.templates.appointmentReminder}
                      onChange={(content) => handleTemplateChange(content, 'appointmentReminder')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Доступные переменные: {'{firstName}'}, {'{lastName}'}, {'{date}'}, {'{startTime}'}, {'{endTime}'}, {'{serviceName}'}, {'{specialistName}'}
                    </p>
                  </div>
                  
                  {/* Шаблон: Публикация отзыва */}
                  <div id="template-reviewPublished" className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center mb-3">
                      <FaStar className="text-yellow-500 mr-2" />
                      <h3 className="text-lg font-medium">Шаблон уведомления о публикации отзыва</h3>
                    </div>
                    
                    <TemplateEditor 
                      value={settings.notifications.templates.reviewPublished}
                      onChange={(content) => handleTemplateChange(content, 'reviewPublished')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Доступные переменные: {'{firstName}'}, {'{lastName}'}, {'{rating}'}, {'{reviewText}'}, {'{specialistName}'}, {'{serviceName}'}
                    </p>
                  </div>
                  
                  {/* Тестирование шаблонов */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-8">
                    <h3 className="text-md font-medium mb-3">Тестирование шаблонов</h3>
                    
                    <div className="bg-white p-3 rounded-md border border-gray-200 mb-4">
                      <p className="text-sm text-gray-700 mb-2">
                        Вставьте этот код в начало шаблона, чтобы добавить логотип:
                      </p>
                      <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                        {`<div style="text-align: center; margin-bottom: 20px;">
  <img src="${window.location.origin}/logo.png" alt="Логотип Вдохновение" width="150">
</div>`}
                      </pre>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select 
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
                        value={testTemplate}
                        onChange={(e) => setTestTemplate(e.target.value)}
                      >
                        <option value="registration">Регистрация</option>
                        <option value="passwordReset">Сброс пароля</option>
                        <option value="appointmentCreated">Создание записи</option>
                        <option value="appointmentConfirmed">Подтверждение записи</option>
                        <option value="appointmentCancelled">Отмена записи</option>
                        <option value="appointmentReminder">Напоминание</option>
                        <option value="reviewPublished">Публикация отзыва</option>
                      </select>
                      
                      <input
                        type="email"
                        placeholder="Email для тестирования"
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm flex-grow"
                        value={templateTestEmailAddress}
                        onChange={(e) => setTemplateTestEmailAddress(e.target.value)}
                      />
                      
                      <button 
                        type="button"
                        className="px-3 py-1.5 bg-[#48a9a6] text-white rounded-lg text-sm hover:bg-[#48a9a6]/90 flex items-center"
                        onClick={() => handleSendTestEmail(testTemplate, true)}
                        disabled={isSendingTest}
                      >
                        <FaTelegramPlane className="mr-1" />
                        {isSendingTest ? 'Отправка...' : 'Отправить тест'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Содержимое вкладки "Система" */}
          {isTabActive('system') && (
            <div className="p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-4">Системные операции</h3>
              
              <div className="space-y-6">
                {/* Очистка связей */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-start mb-3">
                    <div className="mr-3 text-amber-500 mt-1">
                      <FaBroom size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Очистка неактуальных связей</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        Эта операция удалит все ссылки на несуществующие услуги и специалистов. 
                        Используйте эту функцию, если замечаете услуги "Неизвестная услуга" или проблемы с отображением связей.
                      </p>
                      
                      <button
                        onClick={cleanupRelations}
                        disabled={isCleaning}
                        className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaBroom className="mr-2" />
                        {isCleaning ? 'Очистка...' : 'Очистить неактуальные связи'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Очистка неиспользуемых файлов */}
                <div className="bg-gray-50 p-4 rounded-md mt-4">
                  <div className="flex items-start mb-3">
                    <div className="mr-3 text-orange-500 mt-1">
                      <FaFolder size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Очистка неиспользуемых файлов</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        Эта операция удалит все изображения и документы, которые больше не используются в базе данных.
                        Рекомендуется выполнять периодически для освобождения места на сервере.
                      </p>
                      
                      <button
                        onClick={cleanupUnusedFiles}
                        disabled={isCleaningFiles}
                        className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaFolder className="mr-2" />
                        {isCleaningFiles ? 'Очистка...' : 'Очистить неиспользуемые файлы'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Очистка кеша */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-start mb-3">
                    <div className="mr-3 text-purple-500 mt-1">
                      <FaSync size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Очистка кеша сайта</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        Эта операция очистит весь кеш сайта, включая кеш API, статического рендеринга и кеш изображений.
                        Рекомендуется выполнять при обновлении контента или после внесения изменений в функционал.
                      </p>
                      
                      <button
                        onClick={clearSiteCache}
                        disabled={isCleaningCache}
                        className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaSync className="mr-2" />
                        {isCleaningCache ? 'Очистка...' : 'Очистить кеш сайта'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Регенерация миниатюр */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-start mb-3">
                    <div className="mr-3 text-green-500 mt-1">
                      <FaImage size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Регенерация миниатюр изображений</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        Данная операция пересоздаст все миниатюры изображений согласно текущим настройкам оптимизации.
                        Это улучшит скорость загрузки страниц и качество отображения изображений.
                      </p>
                      
                      <button
                        onClick={regenerateImageThumbnails}
                        disabled={isRegeneratingImages}
                        className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaImage className="mr-2" />
                        {isRegeneratingImages ? 'Регенерация...' : 'Регенерировать миниатюры'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Пререндеринг страниц */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-start mb-3">
                    <div className="mr-3 text-indigo-500 mt-1">
                      <FaRocket size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Пререндеринг страниц</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        Эта операция выполнит предварительный рендеринг страниц сайта, ускоряя их загрузку для пользователей.
                        Рекомендуется выполнять после существенных обновлений контента.
                      </p>
                      
                      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={prerenderPages}
                          disabled={isPrerendering}
                          className="flex items-center px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaRocket className="mr-2" />
                          {isPrerendering ? 'Обработка...' : 'Пререндеринг всех страниц'}
                        </button>
                        
                        <button
                          onClick={() => window.open('/api/admin/optimize/sitemap', '_blank')}
                          className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          <FaEye className="mr-2" />
                          Просмотр карты сайта
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Кнопки действий в нижней части формы */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#48a9a6] hover:bg-[#3d908d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#48a9a6]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Сохранить настройки
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 