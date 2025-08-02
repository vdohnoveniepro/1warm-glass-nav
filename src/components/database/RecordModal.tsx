import { useState, useEffect } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Record<string, any>) => Promise<void>;
  title: string;
  table: string;
  columns: any[];
  record?: Record<string, any>;
  mode: 'create' | 'edit';
}

export default function RecordModal({
  isOpen,
  onClose,
  onSave,
  title,
  table,
  columns,
  record = {},
  mode
}: RecordModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Инициализация формы при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && record) {
        setFormData({ ...record });
      } else {
        // Для создания новой записи - пустые поля или значения по умолчанию
        const initialData: Record<string, any> = {};
        columns.forEach(col => {
          // Пропускаем автоинкрементные поля при создании
          if (col.pk && col.type.toLowerCase().includes('integer')) {
            return;
          }
          initialData[col.name] = '';
        });
        setFormData(initialData);
      }
    }
  }, [isOpen, record, mode, columns]);

  // Обработка изменения полей формы
  const handleChange = (column: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Сохранение записи
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении записи:', error);
      toast.error('Не удалось сохранить запись');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            {columns.map((col) => {
              // Пропускаем автоинкрементные поля при создании
              if (mode === 'create' && col.pk && col.type.toLowerCase().includes('integer')) {
                return null;
              }
              
              // Определяем тип поля ввода на основе типа данных колонки
              const inputType = getInputTypeForColumn(col.type);
              
              return (
                <div key={col.name} className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    {col.name}
                    {col.notnull ? ' *' : ''}
                    {col.pk ? ' (PK)' : ''}
                  </label>
                  <div className="col-span-2">
                    {inputType === 'textarea' ? (
                      <textarea
                        value={formData[col.name] || ''}
                        onChange={(e) => handleChange(col.name, e.target.value)}
                        className="w-full border rounded-md p-2 text-sm"
                        rows={3}
                        disabled={mode === 'edit' && col.pk}
                      />
                    ) : (
                      <input
                        type={inputType}
                        value={formData[col.name] || ''}
                        onChange={(e) => handleChange(col.name, e.target.value)}
                        className="w-full border rounded-md p-2 text-sm"
                        disabled={mode === 'edit' && col.pk}
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">{col.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            <FaSave className="mr-2" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Функция для определения типа поля ввода на основе типа данных SQLite
function getInputTypeForColumn(columnType: string): string {
  const type = columnType.toLowerCase();
  
  if (type.includes('int')) return 'number';
  if (type.includes('real') || type.includes('float') || type.includes('double')) return 'number';
  if (type.includes('bool')) return 'checkbox';
  if (type.includes('date')) return 'date';
  if (type.includes('time')) return 'time';
  if (type.includes('datetime')) return 'datetime-local';
  if (type.includes('text') && (type.includes('long') || type.includes('blob'))) return 'textarea';
  
  return 'text';
} 