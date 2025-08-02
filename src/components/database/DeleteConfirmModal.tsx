import { FaTrash, FaTimes } from 'react-icons/fa';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  tableName: string;
  recordInfo: string;
  isDeleting: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  tableName,
  recordInfo,
  isDeleting
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-red-600">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-center mb-4 text-red-500">
            <div className="bg-red-100 p-3 rounded-full">
              <FaTrash size={24} />
            </div>
          </div>
          
          <p className="text-center mb-2">
            Вы действительно хотите удалить эту запись из таблицы <strong>{tableName}</strong>?
          </p>
          
          <p className="text-center text-sm text-gray-600 mb-4">
            {recordInfo}
          </p>
          
          <p className="text-center text-sm text-red-600 mb-4">
            Это действие нельзя отменить.
          </p>
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isDeleting}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center"
          >
            <FaTrash className="mr-2" />
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  );
} 