'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaSave, FaStore, FaImage, FaLink, FaToggleOn, FaToggleOff, FaArrowRight, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import Image from 'next/image';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';
import { SearchParamsProvider } from '@/lib/hooks/useSearchParamsWrapper';

interface ProductItem {
  id: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  enabled: boolean;
}

interface ShopButton {
  id: string;
  enabled: boolean;
  buttonText: string;
  buttonUrl: string;
  buttonImage: string;
  showProducts: boolean;
  products: ProductItem[];
}

interface ShopSettings {
  buttons: ShopButton[];
}

function ShopSettingsContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<ShopSettings>({
    buttons: []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeButtonIndex, setActiveButtonIndex] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productPreviewImage, setProductPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [newProduct, setNewProduct] = useState<Omit<ProductItem, 'id'>>({
    title: '',
    imageUrl: '/images/product-placeholder.jpg',
    productUrl: '',
    enabled: true
  });

  // Добавить новую кнопку магазина
  const addNewShopButton = () => {
    const newButtonId = `button-${Date.now()}`;
    const newButton: ShopButton = {
      id: newButtonId,
      enabled: true,
      buttonText: 'Магазин',
      buttonUrl: 'https://www.wildberries.ru/',
      buttonImage: '/images/shop.jpg',
      showProducts: false,
      products: []
    };

    setSettings(prev => ({
      buttons: [...prev.buttons, newButton]
    }));

    // Устанавливаем новую кнопку как активную
    setActiveButtonIndex(settings.buttons.length);
  };

  // Удалить кнопку магазина
  const deleteShopButton = (index: number) => {
    if (settings.buttons.length <= 1) {
      toast.error('Должна остаться хотя бы одна кнопка магазина');
      return;
    }

    setSettings(prev => ({
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));

    // Если удаляем активную кнопку, переключаемся на первую
    if (activeButtonIndex === index) {
      setActiveButtonIndex(0);
    }
    // Если удаляем кнопку перед активной, корректируем индекс
    else if (activeButtonIndex > index) {
      setActiveButtonIndex(activeButtonIndex - 1);
    }
  };

  // Получаем активную кнопку
  const getActiveButton = (): ShopButton => {
    return settings.buttons[activeButtonIndex] || {
      id: 'default',
      enabled: false,
      buttonText: 'Магазин',
      buttonUrl: 'https://www.wildberries.ru/',
      buttonImage: '/images/shop.jpg',
      showProducts: false,
      products: []
    };
  };

  // Обновить активную кнопку
  const updateActiveButton = (updatedButton: Partial<ShopButton>) => {
    setSettings(prev => {
      const updatedButtons = [...prev.buttons];
      if (updatedButtons[activeButtonIndex]) {
        updatedButtons[activeButtonIndex] = {
          ...updatedButtons[activeButtonIndex],
          ...updatedButton
        };
      }
      return { buttons: updatedButtons };
    });
  };

  // Загрузка настроек магазина
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/shop-settings');
        if (response.ok) {
          const data = await response.json();
          console.log('Загруженные настройки магазина:', data);
          if (data.success && data.data) {
            // Преобразование старого формата в новый при необходимости
            let updatedSettings: ShopSettings;
            
            if (Array.isArray(data.data.buttons)) {
              // Новый формат уже доступен
              updatedSettings = data.data;
            } else {
              // Преобразуем старый формат в новый
              const legacyButton: ShopButton = {
                id: `button-${Date.now()}`,
                enabled: data.data.enabled || false,
                buttonText: data.data.buttonText || 'Магазин',
                buttonUrl: data.data.buttonUrl || 'https://www.wildberries.ru/',
                buttonImage: data.data.buttonImage || '/images/shop.jpg',
                showProducts: data.data.showProducts || false,
                products: data.data.products || []
              };
              
              updatedSettings = {
                buttons: [legacyButton]
              };
            }
            
            setSettings(updatedSettings);
            
            // Сохраняем изображения для предпросмотра
            const previewImgs: Record<string, string> = {};
            updatedSettings.buttons.forEach(button => {
              if (button.buttonImage) {
                previewImgs[button.id] = button.buttonImage;
              }
            });
            setPreviewImages(previewImgs);
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке настроек магазина:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };
    
    fetchSettings();
  }, []);

  // Защита маршрута: только для админов
  useEffect(() => {
    if (!isLoading && user) {
      console.log('Данные пользователя в настройках магазина:', user);
    }
    
    const userRole = user?.role?.toUpperCase();
    
    if (!isLoading && (!user || userRole !== 'ADMIN')) {
      console.log('Доступ запрещен: пользователь не администратор');
      toast.error('У вас нет прав для доступа к настройкам магазина');
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Обработка изменений в форме кнопки
  const handleButtonChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      updateActiveButton({ [name]: checked });
    } else {
      updateActiveButton({ [name]: value });
    }
  };

  // Обработчик для переключателя отображения кнопки
  const handleButtonToggle = () => {
    const activeButton = getActiveButton();
    updateActiveButton({ enabled: !activeButton.enabled });
  };

  // Обработка загрузки изображения для кнопки
  const handleButtonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const imageUrl = event.target.result as string;
          const activeButton = getActiveButton();
          
          // Обновляем изображение для предпросмотра
          setPreviewImages(prev => ({
            ...prev,
            [activeButton.id]: imageUrl
          }));
          
          // Обновляем настройки кнопки
          updateActiveButton({ buttonImage: imageUrl });
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Обработчик для переключателя отображения товаров
  const handleProductsToggle = () => {
    const activeButton = getActiveButton();
    updateActiveButton({ showProducts: !activeButton.showProducts });
  };

  // Добавление нового товара
  const handleAddProduct = () => {
    const activeButton = getActiveButton();
    
    if (!newProduct.title) {
      newProduct.title = 'Товар';
    }
    
    if (!newProduct.productUrl) {
      newProduct.productUrl = activeButton.buttonUrl || 'https://www.wildberries.ru/';
    }

    // Проверка на максимальное количество товаров (4)
    if (activeButton.products.length >= 4) {
      toast.error('Достигнуто максимальное количество товаров (4)');
      return;
    }

    const productId = `product-${Date.now()}`;
    const productToAdd = {
      id: productId,
      ...newProduct
    };

    updateActiveButton({
      products: [...activeButton.products, productToAdd]
    });

    // Сброс формы нового товара
    setNewProduct({
      title: '',
      imageUrl: '/images/product-placeholder.jpg',
      productUrl: '',
      enabled: true
    });
    setProductPreviewImage(null);
    
    // Скрываем форму после добавления
    setShowAddForm(false);
  };

  // Удаление товара
  const handleDeleteProduct = (id: string) => {
    const activeButton = getActiveButton();
    updateActiveButton({
      products: activeButton.products.filter(product => product.id !== id)
    });
  };

  // Редактирование товара
  const handleEditProduct = (product: ProductItem) => {
    setEditingProduct(product);
    setProductPreviewImage(product.imageUrl);
  };

  // Сохранение изменений товара
  const handleSaveProductEdit = () => {
    if (!editingProduct) return;
    const activeButton = getActiveButton();

    updateActiveButton({
      products: activeButton.products.map(product => 
        product.id === editingProduct.id ? editingProduct : product
      )
    });

    setEditingProduct(null);
    setProductPreviewImage(null);
  };

  // Отмена редактирования товара
  const handleCancelProductEdit = () => {
    setEditingProduct(null);
    setProductPreviewImage(null);
  };

  // Обработка загрузки изображения товара
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const imageUrl = event.target.result as string;
          setProductPreviewImage(imageUrl);
          
          if (editingProduct) {
            setEditingProduct(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                imageUrl
              };
            });
          } else {
            setNewProduct(prev => ({
              ...prev,
              imageUrl
            }));
          }
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Обработка изменений в форме товара
  const handleProductChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    isForEdit: boolean = false
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    if (isForEdit && editingProduct) {
      setEditingProduct(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [name]: checked !== undefined ? checked : value
        };
      });
    } else {
      setNewProduct(prev => ({
        ...prev,
        [name]: checked !== undefined ? checked : value
      }));
    }
  };

  // Сохранение настроек
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Создаем FormData для отправки файла и данных
      const formData = new FormData();
      
      // Отправляем полные настройки со всеми кнопками
      formData.append('settingsJson', JSON.stringify(settings));
      
      // Проверяем, есть ли новые файлы изображений
      const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      let hasFiles = false;
      
      fileInputs.forEach((input, index) => {
        if (input.files && input.files[0]) {
          formData.append(`buttonImage_${index}`, input.files[0]);
          formData.append(`buttonId_${index}`, settings.buttons[index]?.id || '');
          hasFiles = true;
        }
      });
      
      // Добавляем флаг, есть ли новые файлы
      formData.append('hasNewImages', hasFiles.toString());
      
      const response = await fetch('/api/admin/shop-settings', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Настройки магазина успешно сохранены');
          
          // Обновляем настройки, если сервер вернул обновленные данные
          if (data.data) {
            setSettings(data.data);
          }
        } else {
          toast.error(`Ошибка при сохранении: ${data.error || 'Неизвестная ошибка'}`);
        }
      } else {
        toast.error('Ошибка при сохранении настроек магазина');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек магазина:', error);
      toast.error('Произошла ошибка при сохранении настроек');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  const userRole = user?.role?.toUpperCase();
  
  if (!user || userRole !== 'ADMIN') {
    return null;
  }

  const activeButton = getActiveButton();
  // Определяем изображение для предпросмотра
  const displayImage = previewImages[activeButton.id] || activeButton.buttonImage || '/images/shop.jpg';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Настройки магазина</h1>
        
        <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
          ← Вернуться в панель управления
        </Link>
      </div>
      
      {/* Список кнопок магазина */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Кнопки магазина</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {settings.buttons.map((button, index) => (
            <div 
              key={button.id} 
              className={`border rounded-md p-3 cursor-pointer transition-all ${
                index === activeButtonIndex ? 'border-[#48a9a6] bg-[#48a9a6]/10 shadow-md' : 'border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => setActiveButtonIndex(index)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium truncate">{button.buttonText}</h3>
                <div className={`h-3 w-3 rounded-full ${button.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {button.products.filter(p => p.enabled).length} товаров
                </span>
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteShopButton(index);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          ))}
          
          {/* Кнопка добавления нового блока */}
          <button
            type="button"
            onClick={addNewShopButton}
            className="border border-dashed border-gray-300 rounded-md p-3 flex flex-col items-center justify-center text-gray-500 hover:text-[#48a9a6] hover:border-[#48a9a6] transition-colors"
          >
            <FaPlus className="mb-1" />
            <span className="text-sm">Добавить кнопку магазина</span>
          </button>
        </div>
      </div>
      
      {/* Настройки активного блока */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold mb-4 text-[#48a9a6]">
            Настройка кнопки: {activeButton.buttonText}
          </h2>
          
          {/* Только переключатель для кнопки магазина */}
          <div className="mb-6">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={handleButtonToggle}
            >
              {activeButton.enabled ? (
                <FaToggleOn className="text-[#48a9a6] text-4xl mr-3" />
              ) : (
                <FaToggleOff className="text-gray-400 text-4xl mr-3" />
              )}
              <label className="text-lg font-medium text-gray-700 cursor-pointer">
                Отображать кнопку магазина на главной странице
              </label>
              
              {/* Скрытый чекбокс для отправки формы */}
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={activeButton.enabled}
                onChange={handleButtonChange}
                className="hidden"
              />
            </div>
          </div>
          
          {/* Текст кнопки */}
          <div className="mb-6">
            <label htmlFor="buttonText" className="block text-sm font-medium text-gray-700 mb-1">
              Текст кнопки
            </label>
            <input
              type="text"
              id="buttonText"
              name="buttonText"
              value={activeButton.buttonText}
              onChange={handleButtonChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
              required
            />
          </div>
          
          {/* URL кнопки */}
          <div className="mb-6">
            <label htmlFor="buttonUrl" className="block text-sm font-medium text-gray-700 mb-1">
              <FaLink className="inline-block mr-1" /> URL кнопки
            </label>
            <input
              type="url"
              id="buttonUrl"
              name="buttonUrl"
              value={activeButton.buttonUrl}
              onChange={handleButtonChange}
              placeholder="https://www.wildberries.ru/ или https://www.ozon.ru/"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Укажите полный URL, включая https://
            </p>
          </div>
          
          {/* Изображение кнопки */}
          <div className="mb-6">
            <label htmlFor="buttonImage" className="block text-sm font-medium text-gray-700 mb-1">
              <FaImage className="inline-block mr-1" /> Изображение для кнопки
            </label>
            
            <div className="mt-2 flex items-center gap-4">
              <div className="relative w-48 h-24 overflow-hidden rounded-md border border-gray-300">
                <Image 
                  src={displayImage} 
                  alt="Предпросмотр изображения" 
                  fill 
                  className="object-cover"
                />
              </div>
              
              <div className="flex-1">
                <input
                  type="file"
                  id={`buttonImage_${activeButtonIndex}`}
                  name="buttonImage"
                  onChange={handleButtonImageChange}
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#48a9a6] file:text-white hover:file:bg-[#3a8a87]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Рекомендуемый размер: 1200x400px. Формат: JPG, PNG, WebP.
                </p>
              </div>
            </div>
          </div>

          {/* Переключатель для отображения товаров */}
          <div className="mb-6 mt-10 border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Товары под кнопкой магазина</h2>
            <div 
              className="flex items-center cursor-pointer" 
              onClick={handleProductsToggle}
            >
              {activeButton.showProducts ? (
                <FaToggleOn className="text-[#48a9a6] text-4xl mr-3" />
              ) : (
                <FaToggleOff className="text-gray-400 text-4xl mr-3" />
              )}
              <label className="text-lg font-medium text-gray-700 cursor-pointer">
                Отображать товары на главной странице
              </label>
              
              {/* Скрытый чекбокс для отправки формы */}
              <input
                type="checkbox"
                id="showProducts"
                name="showProducts"
                checked={activeButton.showProducts}
                onChange={handleButtonChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 pl-12">
              Вы можете добавить от 0 до 4 товаров. Если товары не добавлены, будет показана только кнопка магазина.
            </p>
          </div>

          {/* Список товаров */}
          {activeButton.showProducts && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">
                Управление товарами 
                <span className="ml-2 text-sm text-gray-500">(макс. 4 товара)</span>
              </h3>
              
              {/* Список существующих товаров */}
              {activeButton.products.length > 0 ? (
                <div className={`grid gap-4 mb-6 ${
                  (() => {
                    const productsCount = activeButton.products.length;
                    const gridClasses = {
                      1: 'grid-cols-1',
                      2: 'grid-cols-1 md:grid-cols-2',
                      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
                      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                    };
                    return gridClasses[productsCount as 1|2|3|4] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
                  })()
                }`}>
                  {activeButton.products.map((product) => (
                    <div key={product.id} className="border rounded-md p-3 relative">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium">{product.title}</h4>
                        <div className="flex space-x-2">
                          <button 
                            type="button" 
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                      <div className="relative h-24 w-full mb-2 rounded overflow-hidden">
                        <Image 
                          src={product.imageUrl} 
                          alt={product.title} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                      <div className="text-sm truncate">{product.productUrl}</div>
                      <div className={`absolute top-2 right-2 h-3 w-3 rounded-full ${product.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-md mb-6">
                  <p className="text-gray-500">Товары не добавлены</p>
                  <p className="text-sm text-gray-400 mt-1">Вы можете добавить до 4 товаров или оставить этот раздел пустым</p>
                </div>
              )}
              
              {/* Форма редактирования товара */}
              {editingProduct && (
                <div className="border-t pt-4 mb-6">
                  <h4 className="font-medium mb-3">Редактирование товара</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название товара
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={editingProduct.title}
                        onChange={(e) => handleProductChange(e, true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL товара
                      </label>
                      <input
                        type="url"
                        name="productUrl"
                        value={editingProduct.productUrl}
                        onChange={(e) => handleProductChange(e, true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Изображение товара
                      </label>
                      <input
                        type="file"
                        name="productImage"
                        onChange={handleProductImageChange}
                        accept="image/*"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="productEnabled"
                        name="enabled"
                        checked={editingProduct.enabled}
                        onChange={(e) => handleProductChange(e, true)}
                        className="mr-2"
                      />
                      <label htmlFor="productEnabled" className="text-sm font-medium text-gray-700">
                        Активен
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={handleCancelProductEdit}
                      className="px-3 py-1 border border-gray-300 rounded-md"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProductEdit}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              )}
              
              {/* Кнопки добавления товаров */}
              {!editingProduct && activeButton.products.length < 4 && (
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      // Добавляем товар с дефолтными значениями
                      const productId = `product-${Date.now()}`;
                      updateActiveButton({
                        products: [...activeButton.products, {
                          id: productId,
                          title: 'Товар ' + (activeButton.products.length + 1),
                          imageUrl: '/images/product-placeholder.jpg',
                          productUrl: activeButton.buttonUrl || 'https://www.wildberries.ru/',
                          enabled: true
                        }]
                      });
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded-md flex items-center"
                  >
                    <FaPlus className="mr-2" /> Быстрое добавление
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-[#48a9a6] text-white rounded-md flex items-center"
                  >
                    {showAddForm ? "Скрыть форму" : "Добавить с настройками"}
                  </button>
                </div>
              )}
              
              {/* Форма добавления нового товара (скрытая по умолчанию) */}
              {!editingProduct && activeButton.products.length < 4 && showAddForm && (
                <div className="border rounded-md p-4 mt-4">
                  <h4 className="font-medium mb-3">Добавить новый товар</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название товара
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={newProduct.title}
                        onChange={handleProductChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL товара
                      </label>
                      <input
                        type="url"
                        name="productUrl"
                        value={newProduct.productUrl}
                        onChange={handleProductChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Изображение товара
                      </label>
                      <input
                        type="file"
                        name="productImage"
                        onChange={handleProductImageChange}
                        accept="image/*"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="newProductEnabled"
                        name="enabled"
                        checked={newProduct.enabled}
                        onChange={handleProductChange}
                        className="mr-2"
                      />
                      <label htmlFor="newProductEnabled" className="text-sm font-medium text-gray-700">
                        Активен
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="px-3 py-1 bg-[#48a9a6] text-white rounded-md flex items-center"
                    >
                      <FaPlus className="mr-1" /> Добавить
                    </button>
                  </div>
                </div>
              )}
              
              {/* Сообщение о достижении максимума товаров */}
              {!editingProduct && activeButton.products.length >= 4 && (
                <div className="text-center p-4 bg-amber-50 rounded-md">
                  <p className="text-amber-800">Достигнут лимит в 4 товара</p>
                  <p className="text-sm text-amber-600 mt-1">Чтобы добавить новый товар, удалите один из существующих</p>
                </div>
              )}
            </div>
          )}
          
          {/* Кнопка сохранения */}
          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#48a9a6] flex items-center"
            >
              <FaSave className="mr-2" />
              {isSubmitting ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Предпросмотр */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Предпросмотр активной кнопки</h2>
        
        <div className="bg-[#EAE8E1] p-6 rounded-lg">
          <div className="max-w-3xl mx-auto">
            {activeButton.enabled ? (
              <div className="px-4">
                <div className="block rounded-xl shadow-md overflow-hidden relative h-32 group transition-transform hover:scale-[1.02] duration-200">
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className="w-full h-full relative">
                      <Image 
                        src={displayImage} 
                        alt={activeButton.buttonText} 
                        fill 
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-black/30"></div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center">
                      <FaStore className="w-8 h-8 text-white mr-3" />
                      <h3 className="text-white text-2xl font-bold">{activeButton.buttonText}</h3>
                    </div>
                    <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm ml-4">
                      <FaArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Предпросмотр товаров */}
                {activeButton.showProducts && activeButton.products.length > 0 && (
                  <div className="mt-3">
                    <div className={`grid gap-3 ${
                      (() => {
                        const enabledProductsCount = activeButton.products.filter(p => p.enabled).length;
                        const gridClasses = {
                          1: 'grid-cols-1',
                          2: 'grid-cols-2',
                          3: 'grid-cols-3',
                          4: 'grid-cols-4'
                        };
                        return gridClasses[enabledProductsCount as 1|2|3|4] || 'grid-cols-4';
                      })()
                    }`}>
                      {activeButton.products.filter(p => p.enabled).map((product) => (
                        <div key={product.id} className="relative rounded-lg overflow-hidden shadow-md h-24">
                          <div className="absolute inset-0">
                            <Image 
                              src={product.imageUrl} 
                              alt={product.title} 
                              fill 
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors"></div>
                          </div>
                          <div className="absolute inset-0 flex items-end justify-center pb-2">
                            <div className="text-white text-center p-1 px-2 bg-black/50 backdrop-blur-sm rounded-md text-xs max-w-[90%] overflow-hidden">
                              <span className="font-medium truncate block">{product.title}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-200 p-4 rounded-lg text-center text-gray-500">
                Кнопка магазина отключена и не будет отображаться на главной странице
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopSettingsPage() {
  return (
    <SearchParamsProvider>
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
            <p className="mt-4 text-gray-600">Загрузка настроек магазина...</p>
          </div>
        </div>
      }>
        <ShopSettingsContent />
      </Suspense>
    </SearchParamsProvider>
  );
} 