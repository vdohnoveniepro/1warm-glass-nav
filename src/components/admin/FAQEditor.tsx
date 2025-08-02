import React, { useState, useEffect, useRef } from 'react';
import { FAQ } from '@/types/faq';
import { FaPlus, FaEdit, FaTrash, FaArrowUp, FaArrowDown, FaSave, FaTimes, FaSpinner, FaCog } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

interface FAQEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQEditor: React.FC<FAQEditorProps> = ({ isOpen, onClose }) => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Загрузка списка FAQ
  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/faq');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить FAQ');
      }
      
      const data = await response.json();
      
      // API теперь возвращает массив напрямую
      if (Array.isArray(data)) {
        setFaqs(data);
      } else {
        throw new Error('Неверный формат данных FAQ');
      }
    } catch (error) {
      console.error('Ошибка при загрузке FAQ:', error);
      toast.error('Не удалось загрузить список вопрос-ответов');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка FAQ при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      fetchFAQs();
    }
  }, [isOpen]);
  
  // Обработчик клика вне формы редактирования
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editorExpanded && editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setEditorExpanded(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editorExpanded]);

  // Начать редактирование FAQ
  const startEditing = (faq: FAQ) => {
    setEditingFAQ(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setIsActive(faq.isActive === 1);
    setEditorExpanded(true);
  };

  // Добавить новый FAQ
  const startAddingNew = () => {
    setEditingFAQ(null);
    setQuestion('');
    setAnswer('');
    setIsActive(true);
    setEditorExpanded(true);
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingFAQ(null);
    setQuestion('');
    setAnswer('');
    setIsActive(true);
    setEditorExpanded(false);
  };

  // Сохранение FAQ
  const saveFAQ = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    
    try {
      setIsSaving(true);
      
      if (editingFAQ) {
        // Обновление существующего FAQ
        const response = await fetch(`/api/faq/${editingFAQ.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            answer,
            isActive: isActive ? 1 : 0,
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Обновляем локальный список
          setFaqs(prevFaqs =>
            prevFaqs.map(faq =>
              faq.id === editingFAQ.id ? data.data : faq
            )
          );
          toast.success('FAQ успешно обновлен');
        } else {
          throw new Error(data.message || 'Ошибка при обновлении FAQ');
        }
      } else {
        // Создание нового FAQ
        const response = await fetch('/api/faq', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            answer,
            isActive: isActive ? 1 : 0,
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Добавляем в локальный список
          setFaqs(prevFaqs => [...prevFaqs, data.data]);
          toast.success('Новый FAQ успешно добавлен');
        } else {
          throw new Error(data.message || 'Ошибка при создании FAQ');
        }
      }
      
      // Сбрасываем состояние редактирования
      cancelEditing();
      
    } catch (error) {
      console.error('Ошибка при сохранении FAQ:', error);
      toast.error('Не удалось сохранить FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  // Удаление FAQ
  const deleteFAQ = async (faq: FAQ) => {
    if (!confirm(`Вы уверены, что хотите удалить вопрос: "${faq.question}"?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/faq/${faq.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Удаляем из локального списка
        setFaqs(prevFaqs => prevFaqs.filter(item => item.id !== faq.id));
        toast.success('FAQ успешно удален');
        
        // Если удаляем FAQ, который редактируем, отменяем редактирование
        if (editingFAQ && editingFAQ.id === faq.id) {
          cancelEditing();
        }
      } else {
        throw new Error(data.message || 'Ошибка при удалении FAQ');
      }
    } catch (error) {
      console.error('Ошибка при удалении FAQ:', error);
      toast.error('Не удалось удалить FAQ');
    } finally {
      setLoading(false);
    }
  };
  
  // Изменение порядка FAQ (перемещение вверх)
  const moveFAQUp = async (faq: FAQ) => {
    const currentIndex = faqs.findIndex(item => item.id === faq.id);
    if (currentIndex <= 0) return;
    
    try {
      setLoading(true);
      
      // Создаем новый массив с обновленным порядком
      const newFaqs = [...faqs];
      const prevItem = newFaqs[currentIndex - 1];
      
      // Меняем местами текущий и предыдущий элементы
      newFaqs[currentIndex - 1] = {
        ...newFaqs[currentIndex],
        order: currentIndex - 1
      };
      
      newFaqs[currentIndex] = {
        ...prevItem,
        order: currentIndex
      };
      
      // Отправляем запрос на обновление порядка
      const response = await fetch('/api/faq/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          { id: faq.id, order: currentIndex - 1 },
          { id: prevItem.id, order: currentIndex }
        ]),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFaqs(data.data);
        toast.success('Порядок FAQ обновлен');
      } else {
        throw new Error(data.message || 'Ошибка при обновлении порядка FAQ');
      }
    } catch (error) {
      console.error('Ошибка при изменении порядка FAQ:', error);
      toast.error('Не удалось обновить порядок FAQ');
      // Перезагружаем FAQ, чтобы восстановить правильный порядок
      fetchFAQs();
    } finally {
      setLoading(false);
    }
  };
  
  // Изменение порядка FAQ (перемещение вниз)
  const moveFAQDown = async (faq: FAQ) => {
    const currentIndex = faqs.findIndex(item => item.id === faq.id);
    if (currentIndex >= faqs.length - 1) return;
    
    try {
      setLoading(true);
      
      // Создаем новый массив с обновленным порядком
      const newFaqs = [...faqs];
      const nextItem = newFaqs[currentIndex + 1];
      
      // Меняем местами текущий и следующий элементы
      newFaqs[currentIndex + 1] = {
        ...newFaqs[currentIndex],
        order: currentIndex + 1
      };
      
      newFaqs[currentIndex] = {
        ...nextItem,
        order: currentIndex
      };
      
      // Отправляем запрос на обновление порядка
      const response = await fetch('/api/faq/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          { id: faq.id, order: currentIndex + 1 },
          { id: nextItem.id, order: currentIndex }
        ]),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFaqs(data.data);
        toast.success('Порядок FAQ обновлен');
      } else {
        throw new Error(data.message || 'Ошибка при обновлении порядка FAQ');
      }
    } catch (error) {
      console.error('Ошибка при изменении порядка FAQ:', error);
      toast.error('Не удалось обновить порядок FAQ');
      // Перезагружаем FAQ, чтобы восстановить правильный порядок
      fetchFAQs();
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для вставки форматирования в поле ответа
  const insertFormatting = (format: 'bold' | 'link') => {
    const textarea = document.getElementById('faq-answer') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = answer.substring(start, end);
    
    let formattedText = '';
    let newCursorPos = 0;
    
    if (format === 'bold') {
      formattedText = `<strong>${selectedText}</strong>`;
      newCursorPos = start + 8 + selectedText.length;
    } else if (format === 'link') {
      const url = prompt('Введите URL:', 'https://');
      if (!url) return;
      
      const linkText = selectedText || 'ссылка';
      formattedText = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${linkText}</a>`;
      newCursorPos = start + formattedText.length;
    }
    
    // Вставляем форматированный текст
    const newText = answer.substring(0, start) + formattedText + answer.substring(end);
    setAnswer(newText);
    
    // Устанавливаем курсор после вставленного текста
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-[#48a9a6] text-white px-6 py-4">
          <h2 className="text-xl font-semibold">Управление блоком "Часто задаваемые вопросы"</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <FaSpinner className="animate-spin text-[#48a9a6] text-3xl" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Список вопросов</h3>
                <button
                  onClick={startAddingNew}
                  className="flex items-center gap-2 px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8683] transition-colors"
                >
                  <FaPlus />
                  <span>Добавить вопрос</span>
                </button>
              </div>
              
              {faqs.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-600">Список вопросов пуст. Добавьте новый вопрос.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div 
                      key={faq.id}
                      className={`bg-gray-50 rounded-lg overflow-hidden ${!faq.isActive ? 'opacity-60' : ''}`}
                    >
                      <div className="p-4 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{faq.question}</h4>
                          <div 
                            className="mt-2 text-gray-600 text-sm" 
                            dangerouslySetInnerHTML={{ __html: faq.answer }}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => startEditing(faq)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Редактировать"
                          >
                            <FaEdit size={16} />
                          </button>
                          <button
                            onClick={() => deleteFAQ(faq)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Удалить"
                          >
                            <FaTrash size={16} />
                          </button>
                          
                          {index > 0 && (
                            <button
                              onClick={() => moveFAQUp(faq)}
                              className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                              title="Переместить выше"
                            >
                              <FaArrowUp size={16} />
                            </button>
                          )}
                          
                          {index < faqs.length - 1 && (
                            <button
                              onClick={() => moveFAQDown(faq)}
                              className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                              title="Переместить ниже"
                            >
                              <FaArrowDown size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Форма редактирования FAQ */}
        {editorExpanded && (
          <div 
            ref={editorRef}
            className="fixed inset-0 flex items-center justify-center z-[60] bg-black bg-opacity-50"
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingFAQ ? 'Редактирование вопроса' : 'Добавление нового вопроса'}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="faq-question" className="block text-sm font-medium text-gray-700 mb-1">
                    Вопрос <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="faq-question"
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                    placeholder="Введите вопрос"
                  />
                </div>
                
                <div>
                  <label htmlFor="faq-answer" className="block text-sm font-medium text-gray-700 mb-1">
                    Ответ <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => insertFormatting('bold')}
                      className="p-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300"
                      title="Жирный текст"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('link')}
                      className="p-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300"
                      title="Вставить ссылку"
                    >
                      🔗
                    </button>
                  </div>
                  <textarea
                    id="faq-answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6] min-h-[120px]"
                    placeholder="Введите ответ"
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">
                    Поддерживается HTML для форматирования текста. Используйте кнопки выше для быстрого форматирования.
                  </p>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="faq-active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-[#48a9a6] focus:ring-[#48a9a6] border-gray-300 rounded"
                  />
                  <label htmlFor="faq-active" className="ml-2 block text-sm text-gray-700">
                    Активный (отображается на сайте)
                  </label>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={saveFAQ}
                    disabled={isSaving}
                    className={`px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8683] transition-colors flex items-center gap-2 ${
                      isSaving ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    <span>Сохранить</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQEditor; 