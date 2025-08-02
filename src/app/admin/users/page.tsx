'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaFilter, FaTimes, FaCheck, FaUser, FaUserTie, FaUserCog, FaSync } from 'react-icons/fa';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';

// Определение типа пользователя
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string; // Основная роль (для обратной совместимости)
  roles?: string[]; // Массив всех ролей пользователя
  createdAt: string; // ISO date string
};

// Тип для диалога подтверждения
type ConfirmDialogProps = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Компонент диалога подтверждения
const ConfirmDialog = ({ title, message, onConfirm, onCancel }: ConfirmDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
};

function UsersPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'user' | 'specialist' | 'admin'>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState<{[key: string]: boolean}>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [refreshKey, setRefreshKey] = useState(0); // Добавляем ключ обновления

  // Загрузка данных пользователей
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoaded(false);
      console.log('Начинаем загрузку пользователей...');
      
      const response = await fetch('/api/admin/users', {
        cache: 'no-store', // Отключаем кеширование
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Получен ответ от API:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Данные от API:', data);
        
        if (data.success) {
          console.log('Получены данные пользователей:', data.data.users);
          
          // Проверяем наличие пользователей Telegram
          const telegramUsers = data.data.users.filter(user => user.telegramId);
          console.log('Пользователи с Telegram ID:', telegramUsers.length, telegramUsers);
          
          setUsers(data.data.users);
        } else {
          toast.error(data.error || 'Не удалось загрузить пользователей');
        }
      } else {
        toast.error('Ошибка при получении данных пользователей');
      }
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      toast.error('Произошла ошибка при загрузке данных');
    } finally {
      setIsLoaded(true);
    }
  }, []);
  
  // Загрузка пользователей при монтировании компонента или изменении ключа обновления
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshKey]);

  // Защита маршрута: только для админов
  useEffect(() => {
    // Специальная проверка для пользователя bakeevd@yandex.ru
    if (!isLoading && user && user.email === 'bakeevd@yandex.ru') {
      console.log('Доступ к странице пользователей разрешен для bakeevd@yandex.ru');
      return; // Пропускаем проверку роли
    }
    
    // Приводим роль к верхнему регистру для сравнения
    const userRole = user?.role?.toUpperCase();
    
    // Если пользователь не админ, перенаправляем на главную страницу
    if (!isLoading && (!user || userRole !== 'ADMIN')) {
      console.log('Доступ запрещен: пользователь не администратор');
      toast.error('У вас нет прав для доступа к управлению пользователями');
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Обработка поиска и фильтрации
  const filteredUsers = users.filter(u => {
    // Проверяем, есть ли у пользователя массив ролей или используем роль как строку
    const userRoles = u.roles || [u.role.toLowerCase()];
    
    const matchesSearch = 
      u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    
    // Для фильтрации проверяем либо массив ролей, либо основную роль
    const matchesFilter = filter === 'all' || 
                         (Array.isArray(userRoles) && userRoles.some(r => r.toLowerCase() === filter)) ||
                         u.role.toLowerCase() === filter;
    
    return matchesSearch && matchesFilter;
  });

  // Форматирование даты
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Получение локализованного названия роли
  const getRoleName = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower === 'admin') return 'Администратор';
    if (roleLower === 'specialist') return 'Специалист';
    if (roleLower === 'user') return 'Пользователь';
    return 'Неизвестная роль';
  };

  // Получение стилей для роли
  const getRoleStyles = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower === 'admin') return 'bg-purple-100 text-purple-800';
    if (roleLower === 'specialist') return 'bg-green-100 text-green-800';
    if (roleLower === 'user') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Обработчик обновления роли пользователя
  const handleRoleChange = async (userId: string, roleName: string, action: 'add' | 'remove') => {
    // Устанавливаем флаг загрузки для конкретного действия
    const actionKey = `${userId}-${roleName}-${action}`;
    setIsProcessing(prev => ({...prev, [actionKey]: true}));
    
    try {
      // Запрос к API
      const response = await fetch(`/api/admin/users/${userId}/update-role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleName.toLowerCase(), action })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Обновляем состояние пользователей на клиенте
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId 
              ? { 
                  ...u, 
                  role: data.user.role,
                  roles: Array.isArray(data.user.roles) 
                    ? data.user.roles 
                    : typeof data.user.roles === 'string'
                      ? JSON.parse(data.user.roles)
                      : [data.user.role.toLowerCase()]
                } 
              : u
          )
        );
        
        toast.success(`Роль ${getRoleName(roleName)} успешно ${action === 'add' ? 'добавлена' : 'удалена'}`);
        
        // Обновляем данные через 500 мс для гарантии синхронизации
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 500);
      } else {
        toast.error(data.message || 'Ошибка при обновлении роли');
      }
    } catch (error) {
      console.error('Ошибка при обновлении роли:', error);
      toast.error('Не удалось обновить роль пользователя');
    } finally {
      // Снимаем флаг загрузки
      setIsProcessing(prev => ({...prev, [actionKey]: false}));
    }
  };

  // Обработчик удаления пользователя
  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(user => user.id === userId);
    if (!userToDelete) return;
    
    // Открываем диалог подтверждения
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление пользователя',
      message: `Вы уверены, что хотите удалить пользователя ${userToDelete.firstName} ${userToDelete.lastName}?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({...prev, isOpen: false}));
        
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Удаляем пользователя из локального состояния
            setUsers(prev => prev.filter(u => u.id !== userId));
            toast.success(`Пользователь ${userToDelete.firstName} успешно удален`);
          } else {
            toast.error(data.error || 'Ошибка при удалении пользователя');
          }
        } catch (error) {
          console.error('Ошибка при удалении пользователя:', error);
          toast.error('Не удалось удалить пользователя');
        }
      }
    });
  };

  // Получение иконки для роли
  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower === 'admin') return <FaUserCog className="mr-1" />;
    if (roleLower === 'specialist') return <FaUserTie className="mr-1" />;
    if (roleLower === 'user') return <FaUser className="mr-1" />;
    return null;
  };

  // Проверка наличия роли у пользователя
  const hasRole = (user: User, role: string) => {
    const roleLower = role.toLowerCase();
    const userRoles = user.roles || [user.role.toLowerCase()];
    
    if (Array.isArray(userRoles)) {
      return userRoles.some(r => r.toLowerCase() === roleLower);
    }
    
    // Если это строка (JSON), пробуем парсить
    if (typeof userRoles === 'string') {
      try {
        const parsedRoles = JSON.parse(userRoles);
        return Array.isArray(parsedRoles) && parsedRoles.some(r => r.toLowerCase() === roleLower);
      } catch (e) {
        console.error('Ошибка при парсинге ролей:', e);
      }
    }
    
    return user.role.toLowerCase() === roleLower;
  };

  // Непосредственное обновление данных
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.info('Обновление данных...');
  };

  // Пока проверяем авторизацию или загружаем данные, показываем загрузку
  if (isLoading || !isLoaded) {
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

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Диалог подтверждения */}
      {confirmDialog.isOpen && (
        <ConfirmDialog 
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({...prev, isOpen: false}))}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Управление пользователями</h1>
        
        <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
          ← Вернуться в панель управления
        </Link>
        
        <div className="flex justify-between items-center flex-wrap md:flex-nowrap gap-4 mb-6">
          <div className="flex gap-2">
            <button 
              onClick={forceRefresh} 
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              title="Обновить список"
            >
              <FaSync className={`w-5 h-5 ${!isLoaded ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/admin/users/add" className="flex items-center justify-center px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors">
              <FaPlus className="mr-2" />
              <span>Добавить пользователя</span>
            </Link>
          </div>
        </div>
        
        {/* Поиск и фильтры */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Поиск по имени, email или телефону..."
              className="w-full py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Очистить поиск"
              >
                <FaTimes />
              </button>
            )}
          </div>
          
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full md:w-48 py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] appearance-none"
            >
              <option value="all">Все роли</option>
              <option value="user">Пользователи</option>
              <option value="specialist">Специалисты</option>
              <option value="admin">Администраторы</option>
            </select>
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* Таблица пользователей */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пользователь</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роли</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата регистрации</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-3">
                      {/* Текущие роли пользователя */}
                      <div className="flex flex-wrap gap-1">
                        {(user.roles || [user.role.toLowerCase()]).map((role, index) => (
                          <div key={`${user.id}-${role}-${index}`} className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getRoleStyles(role)} relative group`}>
                            {getRoleIcon(role)}
                            {getRoleName(role)}
                            
                            {/* Кнопка для удаления роли */}
                            {((user.roles && user.roles.length > 1) || (role.toLowerCase() !== 'user')) && (
                              <button 
                                onClick={() => handleRoleChange(user.id, role, 'remove')}
                                disabled={isProcessing[`${user.id}-${role}-remove`]}
                                className="ml-2 text-gray-600 hover:text-red-600 opacity-70 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                                title="Удалить роль"
                              >
                                {isProcessing[`${user.id}-${role}-remove`] ? 
                                  <span className="animate-pulse">⋯</span> : 
                                  <FaTimes size={12} />
                                }
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Кнопки для добавления ролей */}
                      <div className="flex flex-wrap gap-2">
                        {/* Роль Администратор */}
                        {!hasRole(user, 'admin') && (
                          <button 
                            onClick={() => handleRoleChange(user.id, 'admin', 'add')}
                            disabled={isProcessing[`${user.id}-admin-add`]}
                            className="px-2 py-1 text-xs rounded-lg flex items-center bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-800 transition-colors disabled:opacity-50"
                            title="Добавить роль Администратор"
                          >
                            {isProcessing[`${user.id}-admin-add`] ? (
                              <span className="animate-pulse">Добавляем...</span>
                            ) : (
                              <>
                                <FaUserCog className="mr-1" /> Админ
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Роль Специалист */}
                        {!hasRole(user, 'specialist') && (
                          <button 
                            onClick={() => handleRoleChange(user.id, 'specialist', 'add')}
                            disabled={isProcessing[`${user.id}-specialist-add`]}
                            className="px-2 py-1 text-xs rounded-lg flex items-center bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-800 transition-colors disabled:opacity-50"
                            title="Добавить роль Специалист"
                          >
                            {isProcessing[`${user.id}-specialist-add`] ? (
                              <span className="animate-pulse">Добавляем...</span>
                            ) : (
                              <>
                                <FaUserTie className="mr-1" /> Специалист
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Роль Пользователь */}
                        {!hasRole(user, 'user') && (
                          <button 
                            onClick={() => handleRoleChange(user.id, 'user', 'add')}
                            disabled={isProcessing[`${user.id}-user-add`]}
                            className="px-2 py-1 text-xs rounded-lg flex items-center bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800 transition-colors disabled:opacity-50"
                            title="Добавить роль Пользователь"
                          >
                            {isProcessing[`${user.id}-user-add`] ? (
                              <span className="animate-pulse">Добавляем...</span>
                            ) : (
                              <>
                                <FaUser className="mr-1" /> Пользователь
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/admin/users/edit/${user.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center"
                    >
                      <FaEdit className="mr-1" /> Редактировать
                    </Link>
                    <button
                      className="text-red-600 hover:text-red-900 inline-flex items-center"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <FaTrash className="mr-1" /> Удалить
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm || filter !== 'all' 
                    ? 'Нет пользователей, соответствующих вашему запросу.' 
                    : 'Нет зарегистрированных пользователей.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>}>
      <UsersPageContent />
    </Suspense>
  );
} 