'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  FaDatabase, FaTable, FaSearch, FaFileCsv, 
  FaFileExport, FaDownload, FaSync, FaPlay,
  FaEdit, FaTrash, FaPlus
} from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';
import RecordModal from '@/components/database/RecordModal';
import DeleteConfirmModal from '@/components/database/DeleteConfirmModal';

export default function DatabasePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Состояния для работы с базой данных
  const [dbStatus, setDbStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dbPath, setDbPath] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnsInfo, setColumnsInfo] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [queryColumns, setQueryColumns] = useState<string[]>([]);
  const [isQueryRunning, setIsQueryRunning] = useState<boolean>(false);
  const [allowModifying, setAllowModifying] = useState<boolean>(false);
  
  // Состояния для модальных окон
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isProcessingRecord, setIsProcessingRecord] = useState<boolean>(false);
  
  // Защита маршрута
  useEffect(() => {
    if (!isLoading && !user) {
      toast.error('Для доступа к базе данных необходима авторизация');
      router.replace('/');
    }
  }, [user, isLoading, router]);
  
  // Получение информации о базе данных
  useEffect(() => {
    const getDbInfo = async () => {
      try {
        setDbStatus('loading');
        
        const response = await fetch('/api/admin/database/info');
        const data = await response.json();
        
        if (response.ok && data.success) {
          setDbStatus('success');
          setDbPath(data.dbPath || '');
          setTables(data.tables || []);
          
          if (data.tables && data.tables.length > 0) {
            // По умолчанию выбираем первую таблицу
            setActiveTable(data.tables[0]);
            // Устанавливаем запрос для выбора всех данных из выбранной таблицы
            setSqlQuery(`SELECT * FROM ${data.tables[0]} LIMIT 100`);
          }
        } else {
          setDbStatus('error');
          toast.error(data.error || 'Ошибка при получении информации о базе данных');
        }
      } catch (error) {
        setDbStatus('error');
        toast.error('Ошибка при получении информации о базе данных');
        console.error('Ошибка при получении информации о БД:', error);
      }
    };
    
    if (user) {
      getDbInfo();
    }
  }, [user]);
  
  // Загрузка данных таблицы при изменении активной таблицы
  useEffect(() => {
    const loadTableData = async () => {
      if (!activeTable) return;
      
      try {
        const response = await fetch(`/api/admin/database/table?name=${activeTable}&page=${page}&pageSize=${pageSize}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setTableData(data.rows || []);
          setColumns(data.columns || []);
          setColumnsInfo(data.columnsInfo || []);
          setTotalRecords(data.total || 0);
        } else {
          toast.error(data.error || `Ошибка при загрузке данных таблицы ${activeTable}`);
        }
      } catch (error) {
        toast.error(`Ошибка при загрузке данных таблицы ${activeTable}`);
        console.error(`Ошибка при загрузке данных таблицы ${activeTable}:`, error);
      }
    };
    
    loadTableData();
  }, [activeTable, page, pageSize]);
  
  // Обновление информации о базе данных
  const refreshDatabase = async () => {
    try {
      setDbStatus('loading');
      
      const response = await fetch('/api/admin/database/info');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setDbStatus('success');
        setDbPath(data.dbPath || '');
        setTables(data.tables || []);
        toast.success('Информация о базе данных обновлена');
      } else {
        setDbStatus('error');
        toast.error(data.error || 'Ошибка при обновлении информации о базе данных');
      }
    } catch (error) {
      setDbStatus('error');
      toast.error('Ошибка при обновлении информации о базе данных');
      console.error('Ошибка при обновлении информации о БД:', error);
    }
  };
  
  // Экспорт таблицы
  const exportTable = async (format: 'csv' | 'json') => {
    if (!activeTable) return;
    
    try {
      const response = await fetch(`/api/admin/database/export?table=${activeTable}&format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTable}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Таблица ${activeTable} успешно экспортирована в ${format.toUpperCase()}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Ошибка при экспорте таблицы ${activeTable}`);
      }
    } catch (error) {
      toast.error(`Ошибка при экспорте таблицы ${activeTable}`);
      console.error(`Ошибка при экспорте таблицы ${activeTable}:`, error);
    }
  };
  
  // Скачивание базы данных
  const downloadDb = async () => {
    try {
      const response = await fetch('/api/admin/database/download');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vdohnovenie.db';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('База данных успешно скачана');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Ошибка при скачивании базы данных');
      }
    } catch (error) {
      toast.error('Ошибка при скачивании базы данных');
      console.error('Ошибка при скачивании базы данных:', error);
    }
  };
  
  // Изменение активной таблицы
  const handleTableChange = (tableName: string) => {
    setActiveTable(tableName);
    setPage(1); // Сбрасываем пагинацию при смене таблицы
    
    // Устанавливаем запрос для выбора всех данных из выбранной таблицы
    setSqlQuery(`SELECT * FROM ${tableName} LIMIT 100`);
  };
  
  // Изменение страницы при пагинации
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Выполнение SQL-запроса
  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    setIsQueryRunning(true);
    
    try {
      const response = await fetch('/api/admin/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: sqlQuery,
          allowModifying
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.rows) {
          setQueryResult(data.rows || []);
          setQueryColumns(data.columns || []);
          toast.success('Запрос выполнен успешно');
        } else if (data.result) {
          // Для запросов на изменение данных
          toast.success(`Запрос выполнен успешно. Изменено строк: ${data.result.changes || 0}`);
          // Обновляем данные таблицы, если это была операция изменения
          if (activeTable) {
            const tableResponse = await fetch(`/api/admin/database/table?name=${activeTable}&page=${page}&pageSize=${pageSize}`);
            const tableData = await tableResponse.json();
            
            if (tableResponse.ok && tableData.success) {
              setTableData(tableData.rows || []);
              setTotalRecords(tableData.total || 0);
            }
          }
        }
      } else {
        toast.error(data.error || 'Ошибка при выполнении запроса');
      }
    } catch (error) {
      toast.error('Ошибка при выполнении запроса');
      console.error('Ошибка при выполнении запроса:', error);
    } finally {
      setIsQueryRunning(false);
    }
  };
  
  // Расчет общего количества страниц
  const totalPages = Math.ceil(totalRecords / pageSize);
  
  // Обработчики для работы с записями
  const handleCreateRecord = () => {
    setSelectedRecord(null);
    setIsCreateModalOpen(true);
  };
  
  const handleEditRecord = (record: any) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteRecord = (record: any) => {
    setSelectedRecord(record);
    setIsDeleteModalOpen(true);
  };
  
  // Сохранение новой записи
  const handleSaveNewRecord = async (recordData: any) => {
    setIsProcessingRecord(true);
    
    try {
      const response = await fetch('/api/admin/database/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: activeTable,
          action: 'create',
          record: recordData
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Запись успешно создана');
        
        // Обновляем данные таблицы
        const tableResponse = await fetch(`/api/admin/database/table?name=${activeTable}&page=${page}&pageSize=${pageSize}`);
        const tableData = await tableResponse.json();
        
        if (tableResponse.ok && tableData.success) {
          setTableData(tableData.rows || []);
          setTotalRecords(tableData.total || 0);
        }
      } else {
        toast.error(data.error || 'Ошибка при создании записи');
      }
    } catch (error) {
      console.error('Ошибка при создании записи:', error);
      toast.error('Ошибка при создании записи');
    } finally {
      setIsProcessingRecord(false);
      setIsCreateModalOpen(false);
    }
  };
  
  // Сохранение изменений записи
  const handleUpdateRecord = async (recordData: any) => {
    if (!selectedRecord) return;
    
    setIsProcessingRecord(true);
    
    try {
      // Определяем первичный ключ таблицы
      const pkColumn = columnsInfo.find(col => col.pk)?.name || 'id';
      
      // Создаем условие WHERE для обновления по первичному ключу
      const where = { [pkColumn]: selectedRecord[pkColumn] };
      
      const response = await fetch('/api/admin/database/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: activeTable,
          action: 'update',
          record: recordData,
          where
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Запись успешно обновлена');
        
        // Обновляем данные таблицы
        const tableResponse = await fetch(`/api/admin/database/table?name=${activeTable}&page=${page}&pageSize=${pageSize}`);
        const tableData = await tableResponse.json();
        
        if (tableResponse.ok && tableData.success) {
          setTableData(tableData.rows || []);
        }
      } else {
        toast.error(data.error || 'Ошибка при обновлении записи');
      }
    } catch (error) {
      console.error('Ошибка при обновлении записи:', error);
      toast.error('Ошибка при обновлении записи');
    } finally {
      setIsProcessingRecord(false);
      setIsEditModalOpen(false);
    }
  };
  
  // Удаление записи
  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;
    
    setIsProcessingRecord(true);
    
    try {
      // Определяем первичный ключ таблицы
      const pkColumn = columnsInfo.find(col => col.pk)?.name || 'id';
      
      // Создаем условие WHERE для удаления по первичному ключу
      const where = { [pkColumn]: selectedRecord[pkColumn] };
      
      const response = await fetch('/api/admin/database/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: activeTable,
          action: 'delete',
          where
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Запись успешно удалена');
        
        // Обновляем данные таблицы
        const tableResponse = await fetch(`/api/admin/database/table?name=${activeTable}&page=${page}&pageSize=${pageSize}`);
        const tableData = await tableResponse.json();
        
        if (tableResponse.ok && tableData.success) {
          setTableData(tableData.rows || []);
          setTotalRecords(tableData.total || 0);
        }
      } else {
        toast.error(data.error || 'Ошибка при удалении записи');
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      toast.error('Ошибка при удалении записи');
    } finally {
      setIsProcessingRecord(false);
      setIsDeleteModalOpen(false);
    }
  };
  
  // Получение информации о записи для отображения в модальном окне удаления
  const getRecordInfo = (record: any) => {
    if (!record) return '';
    
    // Определяем первичный ключ и его значение
    const pkColumn = columnsInfo.find(col => col.pk)?.name || 'id';
    const pkValue = record[pkColumn];
    
    // Находим еще 1-2 поля для отображения (обычно это name, title, email и т.д.)
    const nameFields = ['name', 'title', 'email', 'username', 'login', 'description'];
    const displayField = columns.find(col => nameFields.includes(col.toLowerCase()));
    
    if (displayField && record[displayField]) {
      return `${pkColumn}: ${pkValue}, ${displayField}: ${record[displayField]}`;
    }
    
    return `${pkColumn}: ${pkValue}`;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Управление базой данных</h1>
      
      <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        ← Вернуться в панель управления
      </Link>
      
      {dbStatus === 'loading' && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
        </div>
      )}
      
      {dbStatus === 'error' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <p className="text-red-700">
            Ошибка при получении информации о базе данных. Возможно, база данных не существует или недоступна.
          </p>
        </div>
      )}
      
      {dbStatus === 'success' && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Верхняя панель с информацией о БД */}
          <div className="bg-gray-100 p-4 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <FaDatabase className="mr-2 text-blue-600" />
                  База данных SQLite
                </h2>
                <p className="text-sm text-gray-600 mt-1">{dbPath}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={refreshDatabase}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm"
                >
                  <FaSync className="mr-1" /> Обновить
                </button>
                <button 
                  onClick={downloadDb}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center text-sm"
                >
                  <FaDownload className="mr-1" /> Скачать БД
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row">
            {/* Левая панель со списком таблиц */}
            <div className="w-full md:w-1/4 border-r">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-semibold flex items-center">
                  <FaTable className="mr-2 text-blue-600" /> Таблицы
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                <ul className="divide-y">
                  {tables.map((table) => (
                    <li key={table}>
                      <button
                        onClick={() => handleTableChange(table)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                          activeTable === table ? 'bg-blue-50 text-blue-600 font-medium' : ''
                        }`}
                      >
                        {table}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Правая панель с содержимым */}
            <div className="w-full md:w-3/4 p-4">
              {/* SQL-запрос */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2 flex items-center">
                  <FaSearch className="mr-2 text-blue-600" /> SQL-запрос
                </h3>
                <div className="flex flex-col space-y-2">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full border rounded-md p-2 font-mono text-sm h-32"
                    placeholder="Введите SQL-запрос..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowModifying"
                        checked={allowModifying}
                        onChange={(e) => setAllowModifying(e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="allowModifying" className="text-sm text-gray-600">
                        Разрешить изменение данных (INSERT, UPDATE, DELETE)
                      </label>
                    </div>
                    <button
                      onClick={executeQuery}
                      disabled={isQueryRunning || !sqlQuery.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                    >
                      <FaPlay className="mr-2" />
                      {isQueryRunning ? 'Выполнение...' : 'Выполнить'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Результаты запроса */}
              {queryResult.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 flex items-center">
                    Результаты запроса
                  </h3>
                  <div className="overflow-x-auto border rounded">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {queryColumns.map((column) => (
                            <th
                              key={column}
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {queryResult.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {queryColumns.map((column) => (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                              >
                                {row[column] !== null && row[column] !== undefined
                                  ? String(row[column])
                                  : <span className="text-gray-300">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Данные выбранной таблицы */}
              {activeTable && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center">
                      <FaTable className="mr-2 text-blue-600" /> Таблица: {activeTable}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateRecord}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center"
                      >
                        <FaPlus className="mr-1" /> Создать
                      </button>
                      <button
                        onClick={() => exportTable('json')}
                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm flex items-center"
                      >
                        <FaFileExport className="mr-1" /> JSON
                      </button>
                      <button
                        onClick={() => exportTable('csv')}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center"
                      >
                        <FaFileCsv className="mr-1" /> CSV
                      </button>
                    </div>
                  </div>
                  
                  {/* Информация о структуре таблицы */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Структура таблицы:</h4>
                    <div className="overflow-x-auto border rounded">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Поле</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NOT NULL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PK</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {columnsInfo.map((col) => (
                            <tr key={col.name}>
                              <td className="px-4 py-2">{col.name}</td>
                              <td className="px-4 py-2">{col.type}</td>
                              <td className="px-4 py-2">{col.notnull ? 'Да' : 'Нет'}</td>
                              <td className="px-4 py-2">{col.pk ? 'Да' : 'Нет'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Данные таблицы */}
                  <div className="overflow-x-auto border rounded">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {/* Добавляем колонку для действий */}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Действия
                          </th>
                          {columns.map((column) => (
                            <th
                              key={column}
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            {/* Кнопки действий для записи */}
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleEditRecord(row)}
                                  className="p-1 text-blue-600 hover:text-blue-800"
                                  title="Редактировать запись"
                                >
                                  <FaEdit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(row)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Удалить запись"
                                >
                                  <FaTrash size={16} />
                                </button>
                              </div>
                            </td>
                            {columns.map((column) => (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                              >
                                {row[column] !== null && row[column] !== undefined
                                  ? String(row[column])
                                  : <span className="text-gray-300">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Пагинация */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-600">
                        Всего записей: {totalRecords}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={page === 1}
                          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                          &laquo;
                        </button>
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                          &lsaquo;
                        </button>
                        <span className="px-3 py-1 border rounded bg-blue-50">
                          {page} из {totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalPages}
                          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                          &rsaquo;
                        </button>
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={page === totalPages}
                          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                          &raquo;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Модальные окна для управления записями */}
      <RecordModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewRecord}
        title={`Создать запись в таблице ${activeTable}`}
        table={activeTable}
        columns={columnsInfo}
        mode="create"
      />
      
      <RecordModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateRecord}
        title={`Редактировать запись в таблице ${activeTable}`}
        table={activeTable}
        columns={columnsInfo}
        record={selectedRecord}
        mode="edit"
      />
      
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление записи"
        tableName={activeTable}
        recordInfo={selectedRecord ? getRecordInfo(selectedRecord) : ''}
        isDeleting={isProcessingRecord}
      />
    </div>
  );
} 