import React, { useRef, useState } from 'react';
import { FaFile, FaImage, FaFileAlt, FaTrash, FaPlus, FaFileDownload, FaFileUpload } from 'react-icons/fa';

export interface Document {
  id: string;
  name: string;
  file: string;
  type: string;
  fileBase64?: string;
  originalName?: string;
}

interface DocumentUploaderProps {
  documents: Document[];
  onChange: (documents: Document[]) => void;
  maxSize?: number; // в МБ
}

export default function DocumentUploader({ documents, onChange, maxSize = 5 }: DocumentUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Определение типа иконки в зависимости от типа файла
  const getDocumentIcon = (file: string) => {
    if (file.endsWith('.pdf')) return <FaFileAlt size={18} className="text-red-500" />;
    if (file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <FaImage size={18} className="text-blue-500" />;
    return <FaFile size={18} className="text-gray-500" />;
  };

  // Открывает диалог выбора файла
  const handleAddClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Обработка выбранного файла
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setError(null);

    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Проверка размера файла
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Размер файла превышает ${maxSize} МБ`);
      return;
    }
    
    // Генерация уникального id
    const id = Date.now().toString();
    
    // Конвертация файла в base64
    const reader = new FileReader();
    reader.onload = () => {
      const fileBase64 = reader.result as string;
      
      // Создаем новый документ
      const newDoc: Document = {
        id,
        name: file.name.split('.')[0], // Используем имя файла без расширения как название
        file: '', // Будет заполнено после загрузки на сервер
        fileBase64,
        originalName: file.name,
        type: getFileType(file.name)
      };
      
      // Обновляем список документов
      onChange([...documents, newDoc]);
    };
    
    reader.readAsDataURL(file);
    
    // Очищаем значение input, чтобы можно было загрузить тот же файл снова
    e.target.value = '';
  };
  
  // Определение типа файла по расширению
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['pdf', 'doc', 'docx'].includes(extension)) {
      return 'diploma';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'certificate';
    }
    
    return 'other';
  };
  
  // Удаление документа
  const handleDeleteDocument = (id: string) => {
    onChange(documents.filter(doc => doc.id !== id));
  };
  
  // Обновление имени документа
  const handleNameChange = (id: string, newName: string) => {
    onChange(
      documents.map(doc => 
        doc.id === id ? { ...doc, name: newName } : doc
      )
    );
  };
  
  // Обновление типа документа
  const handleTypeChange = (id: string, newType: string) => {
    onChange(
      documents.map(doc => 
        doc.id === id ? { ...doc, type: newType } : doc
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Документы и сертификаты</h3>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center text-sm text-[#48a9a6] hover:text-[#388a87]"
        >
          <FaPlus size={14} className="mr-1" /> Добавить документ
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
          className="hidden"
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {documents.length === 0 ? (
          <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded-lg text-center">
            Нет загруженных документов
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {doc.file ? (
                    getDocumentIcon(doc.file)
                  ) : (
                    <FaFileUpload size={18} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-grow">
                  <input
                    type="text"
                    value={doc.name}
                    onChange={(e) => handleNameChange(doc.id, e.target.value)}
                    className="w-full border-none bg-transparent p-0 text-sm font-medium focus:outline-none focus:ring-0"
                    placeholder="Название документа"
                  />
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <select
                      value={doc.type}
                      onChange={(e) => handleTypeChange(doc.id, e.target.value)}
                      className="text-xs bg-transparent border-none p-0 pr-5 focus:outline-none focus:ring-0"
                    >
                      <option value="diploma">Диплом</option>
                      <option value="certificate">Сертификат</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.file && (
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                      title="Скачать"
                    >
                      <FaFileDownload size={16} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Удалить"
                  >
                    <FaTrash size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 