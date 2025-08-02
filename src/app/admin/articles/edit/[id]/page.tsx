'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import RichTextEditor, { RichTextEditorRef } from '@/components/RichTextEditor';
import { toast } from '@/components/ui/Toast';
import { FaCheck, FaTimes, FaPlus, FaImage, FaPencilAlt, FaLightbulb, FaSpinner, FaMagic, FaChevronDown, FaChevronRight, FaExclamationTriangle, FaRobot, FaSave, FaUpload } from 'react-icons/fa';
import { MdOutlineAutoFixHigh } from 'react-icons/md';
import MistralAIAssistant from './MistralAIAssistant';

// Типы данных
type ArticleCategory = string;

interface Service {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  price: number;
  duration: number;
  color?: string;
  order?: number;
  isArchived?: boolean;
  specialists?: any[];
  updatedAt?: string;
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  specialization: string;
  // Другие свойства специалиста...
}

type FormData = {
  title: string;
  excerpt: string;
  content: string;
  category: ArticleCategory;
  image: File | null;
  imagePreview: string;
  status: 'draft' | 'published';
  specialistId: string;
  customCategory?: string;
};

// Компонент для категории статьи
const CategoryTag = ({ category }: { category: ArticleCategory }) => {
  const categoryMap: Record<string, { label: string, color: string }> = {
    'inspiration': { label: 'Вдохновение', color: 'bg-purple-100 text-purple-800' },
    'вселенская терапия': { label: 'ВсеЛенская терапия', color: 'bg-indigo-100 text-indigo-800' },
    'ВсеЛенская терапия': { label: 'ВсеЛенская терапия', color: 'bg-indigo-100 text-indigo-800' },
    // Другие категории могут быть добавлены здесь
  };
  
  const { label, color } = categoryMap[category] || { label: category, color: 'bg-gray-100 text-gray-800' };
  
  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>
      {label}
    </span>
  );
};

// Компонент для отображения состояния загрузки
const SkeletonLoader = () => (
  <div className="flex gap-2 items-center">
    <div className="w-4 h-4 rounded-full animate-pulse bg-gray-300"></div>
    <span className="text-gray-400">Загрузка категорий...</span>
  </div>
);

// Компонент модального окна для генерации обложки
const BannerGenerator = ({ 
  isOpen, 
  onClose, 
  onApplyImage 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onApplyImage: (imageUrl: string) => void;
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Параметры для генерации изображений с FusionBrain
  const [imageWidth, setImageWidth] = useState<number>(768);
  const [imageHeight, setImageHeight] = useState<number>(432);
  const [imageStyle, setImageStyle] = useState<string>('DEFAULT');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('16:9');
  const [showAdvancedImageSettings, setShowAdvancedImageSettings] = useState(false);
  const [pipelineId, setPipelineId] = useState<string>('');
  const [generationUuid, setGenerationUuid] = useState<string>('');
  
  // API ключи для FusionBrain
  const FUSION_BRAIN_API_KEY = '80810B8110B4948751EE149B79323C97';
  const FUSION_BRAIN_SECRET_KEY = '82CD04179C21806452EE34C351A882F7';
  const FUSION_BRAIN_URL = 'https://api-key.fusionbrain.ai/';
  
  // Доступные стили для генерации изображений
  const imageStyles = [
    { name: 'DEFAULT', title: 'Свой стиль' },
    { name: 'KANDINSKY', title: 'Кандинский' },
    { name: 'UHD', title: 'Детальное фото' },
    { name: 'ANIME', title: 'Аниме' }
  ];
  
  // Соотношения сторон для изображений
  const aspectRatios = [
    { name: '1:1', width: 512, height: 512 },
    { name: '3:2', width: 768, height: 512 },
    { name: '2:3', width: 512, height: 768 },
    { name: '16:9', width: 768, height: 432 },
    { name: '9:16', width: 432, height: 768 }
  ];
  
  // Получаем pipeline_id при первой загрузке компонента
  useEffect(() => {
    if (isOpen && !pipelineId) {
      getPipelineId();
    }
  }, [isOpen, pipelineId]);
  
  // Функция для получения pipeline_id
  const getPipelineId = async () => {
    try {
      const headers = {
        'X-Key': `Key ${FUSION_BRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSION_BRAIN_SECRET_KEY}`
      };
      
      const response = await fetch(`${FUSION_BRAIN_URL}key/api/v1/pipelines`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при получении pipeline_id: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        setPipelineId(data[0].id);
      } else {
        throw new Error('Не удалось получить pipeline_id');
      }
    } catch (err) {
      console.error('Ошибка при получении pipeline_id:', err);
      setError(`Ошибка инициализации API для генерации изображений: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };
  
  // Функция для обновления размеров при изменении соотношения сторон
  const handleAspectRatioChange = (ratio: string) => {
    setImageAspectRatio(ratio);
    const selectedRatio = aspectRatios.find(r => r.name === ratio);
    if (selectedRatio) {
      setImageWidth(selectedRatio.width);
      setImageHeight(selectedRatio.height);
    }
  };
  
  // Функция для генерации изображений с FusionBrain API
  const generateBannerImage = async () => {
    if (!prompt.trim()) {
      setError('Пожалуйста, опишите обложку');
      return;
    }
    
    if (!pipelineId) {
      setError('API для генерации изображений не инициализирован. Попробуйте позже.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    setGeneratedImageUrl('');
    setGenerationUuid('');
    
    // Добавляем анимацию загрузки
    const loadingElement = document.getElementById('banner-generate-preview');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg h-full">
          <div class="mb-4">
            <svg class="animate-spin h-12 w-12 text-[#48a9a6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p class="text-gray-700 text-center">Генерируем обложку для статьи...<br>Это может занять до 30 секунд</p>
        </div>
      `;
    }
    
    try {
      // Заголовки для авторизации
      const headers = {
        'X-Key': `Key ${FUSION_BRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSION_BRAIN_SECRET_KEY}`
      };
      
      // Параметры запроса
      const params = {
        type: 'GENERATE',
        numImages: 1,
        width: imageWidth,
        height: imageHeight,
        style: imageStyle,
        negativePromptDecoder: negativePrompt || undefined,
        generateParams: {
          query: prompt
        }
      };
      
      // Формируем FormData для отправки
      const formData = new FormData();
      formData.append('pipeline_id', pipelineId);
      formData.append('params', new Blob([JSON.stringify(params)], { type: 'application/json' }));
      
      // Отправляем запрос
      const response = await fetch(`${FUSION_BRAIN_URL}key/api/v1/pipeline/run`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API вернул ошибку: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data && data.uuid) {
        setGenerationUuid(data.uuid);
        // Начинаем проверять статус
        checkGenerationStatus(data.uuid);
      } else {
        throw new Error('Неожиданный формат ответа от API');
      }
    } catch (err) {
      console.error('Ошибка при генерации изображения:', err);
      setError(`Ошибка: ${err instanceof Error ? err.message : 'Что-то пошло не так'}`);
      setIsGenerating(false);
      
      // Сбрасываем анимацию загрузки
      const previewElement = document.getElementById('banner-generate-preview');
      if (previewElement) {
        previewElement.innerHTML = '<div class="flex items-center justify-center h-full bg-gray-100 rounded-lg"><span class="text-gray-400">Предпросмотр</span></div>';
      }
    }
  };
  
  // Функция для проверки статуса генерации изображения
  const checkGenerationStatus = async (uuid: string, attemptCount = 0) => {
    if (attemptCount > 20) {
      setError('Превышено время ожидания генерации изображения');
      setIsGenerating(false);
      setCheckingStatus(false);
      return;
    }
    
    setCheckingStatus(true);
    
    try {
      const headers = {
        'X-Key': `Key ${FUSION_BRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSION_BRAIN_SECRET_KEY}`
      };
      
      const response = await fetch(`${FUSION_BRAIN_URL}key/api/v1/pipeline/status/${uuid}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при проверке статуса: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Обновляем анимацию с процентами выполнения (если есть)
      const previewElement = document.getElementById('banner-generate-preview');
      if (previewElement && data.status === 'PROCESSING' && data.progress) {
        const progressText = `Генерируем обложку... ${Math.round(data.progress * 100)}%`;
        previewElement.innerHTML = `
          <div class="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg h-full">
            <div class="mb-4">
              <svg class="animate-spin h-12 w-12 text-[#48a9a6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p class="text-gray-700 text-center">${progressText}<br>Это может занять до 30 секунд</p>
          </div>
        `;
      }
      
      if (data.status === 'DONE') {
        // Изображение готово
        if (data.result && data.result.files && data.result.files.length > 0) {
          // Получаем base64 изображения
          const imageBase64 = data.result.files[0];
          
          // Сохраняем изображение на сервере
          try {
            const saveResponse = await fetch('/api/images/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageData: imageBase64,
                fileName: `banner_${Date.now()}.png`,
                altText: prompt
              }),
            });
            
            if (saveResponse.ok) {
              const { imageUrl } = await saveResponse.json();
              // Обновляем предпросмотр
              setGeneratedImageUrl(imageUrl);
              
              // Отображаем изображение в превью
              const previewElement = document.getElementById('banner-generate-preview');
              if (previewElement) {
                previewElement.innerHTML = `<img src="${imageUrl}" alt="${prompt}" class="object-cover w-full h-full rounded-lg" />`;
              }
            } else {
              // Если сохранить не удалось, используем оригинальный base64
              setGeneratedImageUrl(imageBase64);
              
              // Отображаем изображение в превью
              const previewElement = document.getElementById('banner-generate-preview');
              if (previewElement) {
                previewElement.innerHTML = `<img src="${imageBase64}" alt="${prompt}" class="object-cover w-full h-full rounded-lg" />`;
              }
            }
          } catch (saveError) {
            console.error('Ошибка при сохранении изображения:', saveError);
            // В случае ошибки, все равно показываем изображение как base64
            setGeneratedImageUrl(imageBase64);
            
            // Отображаем изображение в превью
            const previewElement = document.getElementById('banner-generate-preview');
            if (previewElement) {
              previewElement.innerHTML = `<img src="${imageBase64}" alt="${prompt}" class="object-cover w-full h-full rounded-lg" />`;
            }
          }
        } else {
          throw new Error('Изображение сгенерировано, но не получено');
        }
        
        setIsGenerating(false);
        setCheckingStatus(false);
      } else if (data.status === 'FAIL') {
        // Ошибка генерации
        throw new Error(`Ошибка генерации изображения: ${data.errorDescription || 'Неизвестная ошибка'}`);
      } else {
        // Продолжаем проверять
        setTimeout(() => {
          checkGenerationStatus(uuid, attemptCount + 1);
        }, 2000); // Проверяем каждые 2 секунды
      }
    } catch (err) {
      console.error('Ошибка при проверке статуса генерации:', err);
      setError(`Ошибка: ${err instanceof Error ? err.message : 'Что-то пошло не так'}`);
      setIsGenerating(false);
      setCheckingStatus(false);
      
      // Сбрасываем анимацию загрузки
      const previewElement = document.getElementById('banner-generate-preview');
      if (previewElement) {
        previewElement.innerHTML = '<div class="flex items-center justify-center h-full bg-gray-100 rounded-lg"><span class="text-gray-400">Предпросмотр</span></div>';
      }
    }
  };
  
  // Применение сгенерированного изображения
  const applyGeneratedImage = () => {
    if (generatedImageUrl) {
      onApplyImage(generatedImageUrl);
      onClose();
    }
  };
  
  // Если модальное окно закрыто, не рендерим ничего
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
          <h3 className="text-xl font-semibold flex items-center">
            <FaRobot className="mr-2" /> 
            ИИ-помощник (Gemini)
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание обложки
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите, какую обложку вы хотите сгенерировать. Например: Закат над озером в горах, яркие цвета"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                rows={3}
              />
            </div>
            
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowAdvancedImageSettings(!showAdvancedImageSettings)}
                className="flex items-center text-[#48a9a6] hover:underline mb-2"
              >
                {showAdvancedImageSettings ? <FaChevronDown className="mr-1" /> : <FaChevronRight className="mr-1" />}
                {showAdvancedImageSettings ? 'Скрыть дополнительные настройки' : 'Показать дополнительные настройки'}
              </button>
              
              {showAdvancedImageSettings && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Негативный промпт (что исключить)
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Что нужно исключить из генерации, например: низкое качество, размытость, искажения"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      rows={2}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Стиль изображения
                    </label>
                    <select
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    >
                      {imageStyles.map(style => (
                        <option key={style.name} value={style.name}>
                          {style.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Соотношение сторон
                    </label>
                    <select
                      value={imageAspectRatio}
                      onChange={(e) => handleAspectRatioChange(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                    >
                      {aspectRatios.map(ratio => (
                        <option key={ratio.name} value={ratio.name}>
                          {ratio.name} ({ratio.width}x{ratio.height})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ширина (px)
                      </label>
                      <input
                        type="number"
                        value={imageWidth}
                        onChange={(e) => setImageWidth(parseInt(e.target.value))}
                        min={128}
                        max={1024}
                        step={64}
                        className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Высота (px)
                      </label>
                      <input
                        type="number"
                        value={imageHeight}
                        onChange={(e) => setImageHeight(parseInt(e.target.value))}
                        min={128}
                        max={1024}
                        step={64}
                        className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Рекомендуется использовать значения, кратные 64. Максимальный размер: 1024×1024
                  </div>
                </div>
              )}
            </div>
            
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            
            <div className="mt-auto">
              <button
                onClick={generateBannerImage}
                disabled={isGenerating || !prompt.trim()}
                className={`w-full px-4 py-2 rounded-lg bg-[#48a9a6] text-white flex items-center justify-center ${
                  isGenerating || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#48a9a6]/90'
                }`}
              >
                {isGenerating ? (
                  <>
                    <FaSpinner className="mr-2 animate-spin" /> 
                    {checkingStatus ? 'Ожидание результата...' : 'Генерация...'}
                  </>
                ) : (
                  <>
                    <FaMagic className="mr-2" /> 
                    Сгенерировать обложку
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Предпросмотр изображения
            </label>
            <div 
              id="banner-generate-preview"
              className="w-full h-64 border border-gray-200 rounded-lg overflow-hidden mb-4"
            >
              <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
                <span className="text-gray-400">Предпросмотр</span>
              </div>
            </div>
            
            <button
              onClick={applyGeneratedImage}
              disabled={!generatedImageUrl || isGenerating}
              className={`w-full px-4 py-2 rounded-lg bg-[#48a9a6] text-white flex items-center justify-center mt-auto ${
                !generatedImageUrl || isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#48a9a6]/90'
              }`}
            >
              <FaCheck className="mr-2" /> 
              Применить как обложку
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент модального окна ИИ-дополнения (VPN)
const AIWritingAssistant = ({ 
  isOpen, 
  onClose, 
  onApplyText,
  onAppendText,
  currentContent 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onApplyText: (text: string) => void;
  onAppendText: (text: string) => void;
  currentContent: string;
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'generate' | 'improve' | 'ideas' | 'image'>('generate');
  const [improveOption, setImproveOption] = useState<string>('grammar');
  
  // Отдельные состояния для каждого режима работы
  const [generateContent, setGenerateContent] = useState('');
  const [improveContent, setImproveContent] = useState('');
  const [ideasContent, setIdeasContent] = useState('');
  const [imageContent, setImageContent] = useState('');
  
  // Параметры для генерации изображений с FusionBrain
  const [imageWidth, setImageWidth] = useState<number>(512);
  const [imageHeight, setImageHeight] = useState<number>(512);
  const [imageStyle, setImageStyle] = useState<string>('DEFAULT');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('1:1');
  const [showAdvancedImageSettings, setShowAdvancedImageSettings] = useState(false);
  const [pipelineId, setPipelineId] = useState<string>('');
  const [generationUuid, setGenerationUuid] = useState<string>('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Обновляем generatedContent при изменении режима работы
  useEffect(() => {
    console.log('Режим изменился на:', mode);
    console.log('Состояния содержимого:', {
      generate: generateContent ? 'есть содержимое' : 'пусто',
      improve: improveContent ? 'есть содержимое' : 'пусто',
      ideas: ideasContent ? 'есть содержимое' : 'пусто',
      image: imageContent ? 'есть содержимое' : 'пусто'
    });
    
    switch(mode) {
      case 'generate':
        setGeneratedContent(generateContent);
        break;
      case 'improve':
        setGeneratedContent(improveContent);
        break;
      case 'ideas':
        setGeneratedContent(ideasContent);
        break;
      case 'image':
        setGeneratedContent(imageContent);
        break;
    }
  }, [mode, generateContent, improveContent, ideasContent, imageContent]);
  
  // API ключи для FusionBrain
  const FUSION_BRAIN_API_KEY = '80810B8110B4948751EE149B79323C97';
  const FUSION_BRAIN_SECRET_KEY = '82CD04179C21806452EE34C351A882F7';
  const FUSION_BRAIN_URL = 'https://api-key.fusionbrain.ai/';
  
  // Доступные стили для генерации изображений
  const imageStyles = [
    { name: 'DEFAULT', title: 'Свой стиль' },
    { name: 'KANDINSKY', title: 'Кандинский' },
    { name: 'UHD', title: 'Детальное фото' },
    { name: 'ANIME', title: 'Аниме' }
  ];
  
  // Соотношения сторон для изображений
  const aspectRatios = [
    { name: '1:1', width: 512, height: 512 },
    { name: '3:2', width: 768, height: 512 },
    { name: '2:3', width: 512, height: 768 },
    { name: '16:9', width: 768, height: 432 },
    { name: '9:16', width: 432, height: 768 }
  ];
  
  // Получаем pipeline_id при первой загрузке компонента
  useEffect(() => {
    if (mode === 'image' && !pipelineId) {
      getPipelineId();
    }
  }, [mode, pipelineId]);
  
  // Функция для получения pipeline_id
  const getPipelineId = async () => {
    try {
      const headers = {
        'X-Key': `Key ${FUSION_BRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSION_BRAIN_SECRET_KEY}`
      };
      
      const response = await fetch(`${FUSION_BRAIN_URL}key/api/v1/pipelines`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при получении pipeline_id: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        setPipelineId(data[0].id);
      } else {
        throw new Error('Не удалось получить pipeline_id');
      }
    } catch (err) {
      console.error('Ошибка при получении pipeline_id:', err);
      setError(`Ошибка инициализации API для генерации изображений: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };
  
  // Функция для обновления размеров при изменении соотношения сторон
  const handleAspectRatioChange = (ratio: string) => {
    setImageAspectRatio(ratio);
    const selectedRatio = aspectRatios.find(r => r.name === ratio);
    if (selectedRatio) {
      setImageWidth(selectedRatio.width);
      setImageHeight(selectedRatio.height);
    }
  };
  
  // Варианты улучшения текста
  const improveOptions = [
    { id: 'grammar', title: 'Исправить грамматику', prompt: 'Проверь следующий текст на предмет ошибок, грамматических неточностей, пунктуации и т.д. Исправь все найденные ошибки, сохраняя смысл и содержание.' },
    { id: 'style', title: 'Стиль', prompt: 'Полностью измени стиль следующего текста, сохраняя основное содержание и смысл. Сделай его уникальным и оригинальным.' },
    { id: 'expand', title: 'Расширить текст', prompt: 'Значительно увеличь объем следующего текста, добавив больше деталей, примеров, пояснений и дополнительной информации. Сделай текст более информативным и полным.' },
    { id: 'rewrite', title: 'Переписать', prompt: 'Полностью перепиши и переработай следующий текст, сохраняя основной смысл и ключевые моменты, но используя другие слова, структуру и подход.' },
    { id: 'custom', title: 'Свой стиль', prompt: '' }
  ];
  
  // Примеры промптов для разных режимов
  const promptExamples = {
    generate: 'Напиши статью о преимуществах медитации для снятия стресса',
    improve: 'Дополнительные указания (необязательно)',
    ideas: 'Предложи 5 идей для статьи о здоровом образе жизни',
    image: 'Закат над горами с озером на переднем плане, реалистичный стиль'
  };

  // Функция для работы с API Gemini для текста
  const generateWithAI = async () => {
    if (mode === 'improve' && improveOption === 'custom' && !prompt.trim()) {
      setError('Для опции "Свой стиль" необходимо заполнить дополнительные указания');
      return;
    }
    
    if (!prompt.trim() && mode !== 'improve') {
      setError('Пожалуйста, введите запрос для ИИ');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      console.log('Генерация начата. Режим:', mode, 'Промпт:', prompt);
      let promptToSend = prompt;
      
      // Формируем запрос в зависимости от выбранного режима
      if (mode === 'improve' && currentContent) {
        // Выбираем подходящий промпт для улучшения текста
        let improvePrompt = '';
        if (improveOption === 'custom') {
          if (!prompt.trim()) {
            setError('Для опции "Свой стиль" необходимо заполнить дополнительные указания');
            setIsGenerating(false);
            return;
          }
          improvePrompt = prompt;
        } else {
          const selectedOption = improveOptions.find(opt => opt.id === improveOption);
          improvePrompt = selectedOption ? selectedOption.prompt : '';
          // Добавляем дополнительные указания, если они есть
          if (prompt.trim()) {
            improvePrompt += ' ' + prompt;
          }
        }
        
        promptToSend = `${improvePrompt}\n\nВот текст, который нужно улучшить:\n${currentContent}`;
      } else if (mode === 'ideas') {
        promptToSend = `Предложи идеи для статьи на тему: ${promptToSend}. Дай несколько вариантов заголовков и структуры.`;
      } else if (mode === 'generate') {
        promptToSend = `Напиши профессиональную статью для блога на тему: ${promptToSend}. 
          
Требования:
1. Используй HTML-разметку для структурирования контента: заголовки h2 и h3, параграфы p, списки ul/li, жирный текст (strong), курсив (em).
2. Не используй никаких внешних тегов html, body, head, style, script и т.д. - только содержимое статьи.
3. Статья должна быть информативной и полезной, содержать практические советы.
4. Добавь подзаголовки для разделения текста на логические части.
5. Добавь вступление, основную часть и заключение.
6. Не нужно никаких комментариев или пояснений к HTML коду.
7. Не включай фразы типа "Вот статья", "Надеюсь, эта статья поможет" или подобные.

Пример правильного формата:
<h2>Заголовок статьи</h2>
<p>Текст вступления...</p>
<h3>Подзаголовок</h3>
<p>Основной текст...</p>`;
      } else if (mode === 'image') {
        // Для изображений используем API FusionBrain
        generateImageWithFusionBrain();
        return;
      }
      
      console.log('Отправляемый запрос к Gemini:', promptToSend.substring(0, 100) + '...');
      
      // Используем модель gemini-2.0-flash, которая доступна с текущим API ключом
      const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCv6hKJNiZ5_CuMA007vcrNx374wK67hY4';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptToSend }]
          }]
        }),
      });
      
      // Отладочное логирование статуса ответа API
      console.log('Gemini API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`API вернул ошибку: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Добавляем отладочное логирование данных API
      console.log('Gemini API response data:', JSON.stringify(data).substring(0, 200) + '...');
      
      if (
        data &&
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0 &&
        data.candidates[0].content.parts[0].text
      ) {
        let generatedText = data.candidates[0].content.parts[0].text;
        console.log('Получен ответ. Длина текста:', generatedText.length);
        
        // Удаляем все метаданные и пояснения, если они есть
        generatedText = generatedText.replace(/```html\n|\n```|```/g, '');
        
        // Сохраняем результат в соответствующее состояние в зависимости от режима
        if (mode === 'generate') {
          setGenerateContent(generatedText);
        } else if (mode === 'improve') {
          setImproveContent(generatedText);
        } else if (mode === 'ideas') {
          setIdeasContent(generatedText);
        }
      } else {
        throw new Error('Ответ от API не содержит текста');
      }
    } catch (error) {
      console.error('Ошибка при генерации контента:', error);
      setError(`Ошибка: ${error instanceof Error ? error.message : 'Произошла неизвестная ошибка'}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Функция для переключения режима работы
  const handleModeChange = (newMode: 'generate' | 'improve' | 'ideas' | 'image') => {
    setMode(newMode);
    setError('');
  };
  
  // Функция для генерации изображения с помощью FusionBrain
  const generateImageWithFusionBrain = async () => {
    if (!pipelineId) {
      setError('Pipeline ID не найден. Пожалуйста, попробуйте перезагрузить страницу.');
      setIsGenerating(false);
      return;
    }
    
    if (!prompt.trim()) {
      setError('Пожалуйста, опишите изображение');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    setGeneratedContent('');
    
    // Добавляем анимацию загрузки
    const loadingAnimation = `
      <div class="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div class="mb-4">
          <svg class="animate-spin h-12 w-12 text-[#48a9a6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p class="text-gray-700 text-center">Генерируем изображение по вашему запросу...<br>Это может занять до 30 секунд</p>
      </div>
    `;
    setGeneratedContent(loadingAnimation);
    setImageContent(loadingAnimation);
    
    try {
      // Заголовки для авторизации
      const headers = {
        'X-Key': `Key ${FUSION_BRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSION_BRAIN_SECRET_KEY}`
      };
      
      // Параметры запроса
      const params = {
        type: 'GENERATE',
        numImages: 1,
        width: imageWidth,
        height: imageHeight,
        style: imageStyle,
        negativePromptDecoder: negativePrompt || undefined,
        generateParams: {
          query: prompt
        }
      };
      
      // Формируем FormData для отправки
      const formData = new FormData();
      formData.append('pipeline_id', pipelineId);
      formData.append('params', new Blob([JSON.stringify(params)], { type: 'application/json' }));
      
      // Отправляем запрос
      const response = await fetch(`${FUSION_BRAIN_URL}key/api/v1/pipeline/run`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API вернул ошибку: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data && data.uuid) {
        // Начинаем проверять статус
        checkGenerationStatus(data.uuid);
      } else {
        throw new Error('Неожиданный формат ответа от API');
      }
    } catch (err) {
      console.error('Ошибка при генерации изображения:', err);
      setError(`Ошибка генерации изображения: ${err instanceof Error ? err.message : 'Что-то пошло не так'}`);
      setIsGenerating(false);
      setGeneratedContent('');
    }
  };
  
  // Функция для проверки статуса генерации изображения
  const checkGenerationStatus = async (uuid: string, attemptCount = 0) => {
    if (attemptCount > 20) {
      setError('Превышено время ожидания генерации изображения');
      setIsGenerating(false);
      setCheckingStatus(false);
      setGeneratedContent('');
      return;
    }
    
    setCheckingStatus(true);
    
    try {
      const headers = {
        'X-Key': `Key ${FUSION_BRAIN_API_KEY}`,
        'X-Secret': `Secret ${FUSION_BRAIN_SECRET_KEY}`
      };
      
      const response = await fetch(`${FUSION_BRAIN_URL}key/api/v1/pipeline/status/${uuid}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при проверке статуса: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'DONE') {
        // Изображение готово
        if (data.result && data.result.files && data.result.files.length > 0) {
          // Получаем base64 изображения
          const imageBase64 = data.result.files[0];
          
          // Сохраняем изображение на сервере
          try {
            const saveResponse = await fetch('/api/images/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageData: imageBase64,
                fileName: `ai_generated_${Date.now()}.png`,
                altText: prompt
              }),
            });
            
            if (saveResponse.ok) {
              const { imageUrl } = await saveResponse.json();
              
              // Создаем HTML для отображения изображения с использованием сохраненного URL
              const imgHtml = `<img src="${imageUrl}" alt="${prompt}" style="max-width: 100%; height: auto; margin: 0 auto; display: block;">`;
              setGeneratedContent(imgHtml);
              setImageContent(imgHtml); // Сохраняем результат в imageContent
            } else {
              // Если сохранить не удалось, используем оригинальный base64
              const imgHtml = `<img src="${imageBase64}" alt="${prompt}" style="max-width: 100%; height: auto; margin: 0 auto; display: block;">`;
              setGeneratedContent(imgHtml);
              setImageContent(imgHtml); // Сохраняем результат в imageContent
            }
          } catch (saveError) {
            console.error('Ошибка при сохранении изображения:', saveError);
            // В случае ошибки, все равно показываем изображение как base64
            const imgHtml = `<img src="${imageBase64}" alt="${prompt}" style="max-width: 100%; height: auto; margin: 0 auto; display: block;">`;
            setGeneratedContent(imgHtml);
            setImageContent(imgHtml); // Сохраняем результат в imageContent
          }
        } else {
          throw new Error('Изображение сгенерировано, но не получено');
        }
        
        setIsGenerating(false);
        setCheckingStatus(false);
      } else if (data.status === 'FAIL') {
        // Ошибка генерации
        throw new Error(`Ошибка генерации изображения: ${data.errorDescription || 'Неизвестная ошибка'}`);
      } else {
        // Обновляем анимацию с процентами выполнения (если есть)
        let progressText = "Генерируем изображение...";
        if (data.status === 'PROCESSING' && data.progress) {
          progressText = `Генерируем изображение... ${Math.round(data.progress * 100)}%`;
        }
        
        const loadingHtml = `
          <div class="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
            <div class="mb-4">
              <svg class="animate-spin h-12 w-12 text-[#48a9a6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p class="text-gray-700 text-center">${progressText}<br>Это может занять до 30 секунд</p>
          </div>
        `;
        setGeneratedContent(loadingHtml);
        setImageContent(loadingHtml);
        
        // Продолжаем проверять
        setTimeout(() => {
          checkGenerationStatus(uuid, attemptCount + 1);
        }, 2000); // Проверяем каждые 2 секунды
      }
    } catch (err) {
      console.error('Ошибка при проверке статуса генерации:', err);
      setError(`Ошибка генерации изображения: ${err instanceof Error ? err.message : 'Что-то пошло не так'}`);
      setIsGenerating(false);
      setCheckingStatus(false);
      setGeneratedContent('');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
          <h3 className="text-xl font-semibold flex items-center">
            <FaRobot className="mr-2" /> 
            ИИ-помощник (Gemini)
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          <div className="w-full md:w-1/3 p-4 border-r overflow-y-auto">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выберите режим работы
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button 
                  onClick={() => handleModeChange('generate')}
                  className={`py-2 px-3 text-sm rounded-lg flex items-center justify-center ${
                    mode === 'generate' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <FaPencilAlt className="mr-2 text-xs" /> Статья
                </button>
                <button 
                  onClick={() => handleModeChange('improve')}
                  className={`py-2 px-3 text-sm rounded-lg flex items-center justify-center ${
                    mode === 'improve' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <MdOutlineAutoFixHigh className="mr-2" /> Улучшить
                </button>
                <button 
                  onClick={() => handleModeChange('ideas')}
                  className={`py-2 px-3 text-sm rounded-lg flex items-center justify-center ${
                    mode === 'ideas' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <FaLightbulb className="mr-2 text-xs" /> Идеи
                </button>
                <button
                  onClick={() => handleModeChange('image')}
                  className={`py-2 px-3 text-sm rounded-lg flex items-center justify-center ${
                    mode === 'image' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <FaImage className="mr-2 text-xs" /> Изображение
                </button>
              </div>
            </div>
            
            {mode === 'improve' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Способ улучшения
                </label>
                <select
                  value={improveOption}
                  onChange={(e) => setImproveOption(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-pink-500"
                >
                  {improveOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {mode === 'image' && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Стиль изображения
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowAdvancedImageSettings(!showAdvancedImageSettings)}
                    className="text-xs text-purple-500 hover:text-pink-500 flex items-center"
                  >
                    {showAdvancedImageSettings ? <FaChevronDown className="mr-1" /> : <FaChevronRight className="mr-1" />}
                    {showAdvancedImageSettings ? 'Скрыть настройки' : 'Дополнительные настройки'}
                  </button>
                </div>
                
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-pink-500 mb-3"
                >
                  {imageStyles.map((style) => (
                    <option key={style.name} value={style.name}>
                      {style.title}
                    </option>
                  ))}
                </select>
                
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Соотношение сторон
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {aspectRatios.map((ratio) => (
                      <button 
                        key={ratio.name}
                        type="button" 
                        onClick={() => {
                          setImageAspectRatio(ratio.name);
                          setImageWidth(ratio.width);
                          setImageHeight(ratio.height);
                        }}
                        className={`px-3 py-1 text-xs rounded ${
                          imageAspectRatio === ratio.name
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {ratio.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {showAdvancedImageSettings && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Негативный промпт
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Введите, что НЕ должно быть на изображении"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-pink-500"
                      rows={2}
                    />
                    
                    <div className="flex gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ширина (px)
                        </label>
                        <input
                          type="number"
                          value={imageWidth}
                          onChange={(e) => setImageWidth(parseInt(e.target.value))}
                          min={128}
                          max={1024}
                          step={64}
                          className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-pink-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Высота (px)
                        </label>
                        <input 
                          type="number"
                          value={imageHeight}
                          onChange={(e) => setImageHeight(parseInt(e.target.value))}
                          min={128}
                          max={1024}
                          step={64}
                          className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-pink-500"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2">
                      Рекомендуется использовать значения, кратные 64. Максимальный размер: 1024×1024
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mode === 'generate' ? 'Опишите желаемую статью' : 
                 mode === 'improve' ? 'Дополнительные указания (опционально)' : 
                 mode === 'ideas' ? 'Тема для идей' : 
                 'Опишите желаемое изображение'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'generate' ? 'Например: Здоровые привычки для повышения продуктивности' : 
                             mode === 'improve' ? 'Например: Сделать текст более энергичным' : 
                             mode === 'ideas' ? 'Например: Тренды в веб-дизайне' : 
                             'Например: Закат над горами с озером на переднем плане, реалистичный стиль'}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-pink-500"
                rows={5}
              />
            </div>
            
            {error && (
              <div className="mt-2 mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start">
                <FaExclamationTriangle className="mt-1 mr-2 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}
            
            <div className="mt-auto">
              <button 
                onClick={generateWithAI}
                disabled={isGenerating || (mode === 'improve' && improveOption === 'custom' && !prompt.trim()) || (mode !== 'improve' && !prompt.trim())}
                className={`w-full py-2 rounded-lg flex items-center justify-center 
                  ${isGenerating || (mode === 'improve' && improveOption === 'custom' && !prompt.trim()) || (mode !== 'improve' && !prompt.trim())
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    {checkingStatus ? 'Ожидание...' : 'Генерация...'}
                  </>
                ) : (
                  <>
                    {mode === 'generate' ? <FaPencilAlt className="mr-2" /> : 
                    mode === 'improve' ? <MdOutlineAutoFixHigh className="mr-2" /> : 
                    mode === 'ideas' ? <FaLightbulb className="mr-2" /> : 
                    <FaImage className="mr-2" />}
                    {mode === 'generate' ? 'Написать статью' : 
                    mode === 'improve' ? 'Улучшить текст' : 
                    mode === 'ideas' ? 'Предложить идеи' : 
                    'Создать изображение'}
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-2/3 p-4 flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Результат</h3>
            
            <div className="flex-grow overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-white max-h-[40vh] md:max-h-[50vh]">
              {generatedContent ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                />
              ) : (
                <div className="text-gray-400 text-center h-full flex items-center justify-center">
                  <p>
                    {isGenerating ? 
                      'Генерация контента...' : 
                      'Здесь появится сгенерированный контент'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                disabled={!generatedContent}
                onClick={() => onApplyText(generatedContent)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
                  !generatedContent 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                }`}
              >
                <FaCheck className="mr-2" /> Применить (заменить)
              </button>
              <button 
                disabled={!generatedContent}
                onClick={() => onAppendText(generatedContent)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
                  !generatedContent 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                <FaPlus className="mr-2" /> Добавить к тексту
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading } = useAuth();
  const editorRef = useRef<RichTextEditorRef>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const articleId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Состояние для обработки ошибок
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Состояния страницы
  const [formData, setFormData] = useState<FormData>({
    title: '',
    excerpt: '',
    content: '',
    category: 'inspiration',
    image: null,
    imagePreview: '',
    status: 'draft',
    specialistId: '',
    customCategory: ''
  });
  
  // Состояния для работы страницы
  const [categories, setCategories] = useState<string[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSpecialists, setLoadingSpecialists] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBannerGeneratorOpen, setIsBannerGeneratorOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isMistralAIAssistantOpen, setIsMistralAIAssistantOpen] = useState(false);
  const [isLoading404, setIsLoading404] = useState(true);
  const [articleNotFound, setArticleNotFound] = useState(false);
  
  // Максимальная длина краткого описания
  const MAX_EXCERPT_LENGTH = 200;
  
  // Загрузка данных статьи при монтировании компонента
  useEffect(() => {
    if (articleId && !isLoading && user) {
      fetchArticle();
    }
  }, [articleId, isLoading, user]);
  
  // Загрузка статьи по ID
  const fetchArticle = async () => {
    setIsLoading404(true);
    try {
      const response = await fetch(`/api/articles/${articleId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setArticleNotFound(true);
        }
        throw new Error(`Статья не найдена (статус: ${response.status})`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        const article = data.data;
        
        // Проверяем права доступа к редактированию
        const userRole = user?.role?.toUpperCase();
        const isAdmin = userRole === 'ADMIN';
        const isAuthorSpecialist = user?.specialistId === article.specialistId;
        const isEmailBakeev = user?.email === 'bakeevd@yandex.ru';
        
        // Если пользователь не администратор и не автор статьи, и не bakeevd@yandex.ru, запрещаем доступ
        if (!isAdmin && !isAuthorSpecialist && !isEmailBakeev) {
          console.log('Доступ запрещен: пользователь не является администратором или автором статьи');
          toast.error('У вас нет прав для редактирования этой статьи');
          router.push('/cabinet/articles');
          return;
        }
        
        // Заполняем форму данными статьи
        setFormData({
          title: article.title || '',
          excerpt: article.excerpt || '',
          content: article.content || '',
          category: article.category || 'inspiration',
          image: null,
          imagePreview: article.banner || '',
          status: article.status || 'draft',
          specialistId: article.specialistId || '',
          customCategory: ''
        });
      } else {
        setArticleNotFound(true);
        throw new Error('Не удалось загрузить данные статьи');
      }
    } catch (error) {
      console.error('Ошибка при загрузке статьи:', error);
      if (error instanceof Error) {
        toast.error(`Ошибка при загрузке статьи: ${error.message}`);
      } else {
        toast.error('Ошибка при загрузке статьи');
      }
    } finally {
      setIsLoading404(false);
    }
  };
  
  // Загрузка услуг (категорий) и специалистов
  useEffect(() => {
    // Функция для загрузки услуг
    const fetchServices = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetch('/api/services');
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке услуг');
        }
        
        const data = await response.json();
        setCategories([
          'inspiration', // Вдохновение
          ...data.map((service: Service) => service.name.toLowerCase())
        ]);
      } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    // Функция для загрузки специалистов
    const fetchSpecialists = async () => {
      setLoadingSpecialists(true);
      try {
        const response = await fetch('/api/specialists');
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке специалистов');
        }
        
        const data = await response.json();
        setSpecialists(data);
      } catch (error) {
        console.error('Ошибка при загрузке специалистов:', error);
      } finally {
        setLoadingSpecialists(false);
      }
    };
    
    if (!isLoading && user) {
      fetchServices();
      fetchSpecialists();
    }
  }, [isLoading, user]);
  
  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Для краткого описания ограничиваем длину
    if (name === 'excerpt' && value.length > MAX_EXCERPT_LENGTH) {
      return; // Не обновляем состояние, если превышена максимальная длина
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Обработчик изменения контента статьи (редактор)
  const handleContentChange = (value: string) => {
    setFormData(prev => ({ ...prev, content: value }));
    if (errors.content) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.content;
        return newErrors;
      });
    }
  };
  
  // Обработчик загрузки изображения
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string
        }));
      };
      
      reader.readAsDataURL(file);
      
      // Очищаем ошибку при загрузке изображения
      if (errors.image) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };
  
  // Обработчик кнопки для выбора изображения
  const triggerFileInput = () => {
    const fileInput = document.getElementById('imageInput');
    if (fileInput) {
      fileInput.click();
    }
  };
  
  // Обработчик для вставки изображения в редактор
  const handleInsertImage = (url: string) => {
    if (editorRef.current) {
      editorRef.current.insertImage(url);
    }
  };
  
  // Функции форматирования текста
  const handleFormatText = (format: string) => {
    if (editorRef.current) {
      editorRef.current.format(format);
    }
  };
  
  // Валидация формы перед отправкой
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Пожалуйста, введите заголовок';
    }
    
    if (!formData.excerpt.trim()) {
      newErrors.excerpt = 'Пожалуйста, введите короткое описание';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Пожалуйста, введите содержание статьи';
    }
    
    if (!formData.image && !formData.imagePreview) {
      newErrors.image = 'Пожалуйста, загрузите изображение обложки';
    }
    
    if (formData.category === 'customCategory' && !formData.customCategory) {
      newErrors.customCategory = 'Пожалуйста, введите название категории';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация формы
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Подготавливаем данные статьи для обновления
      const articleData: any = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        status: formData.status
      };
      
      // Добавляем категорию
      const category = formData.category === 'custom' 
        ? formData.customCategory || '' 
        : formData.category || '';
      articleData.category = category;
      
      // Добавляем ID специалиста, если выбран
      if (formData.specialistId) {
        articleData.specialistId = formData.specialistId;
      }
      
      // Добавляем URL изображения, если оно изменилось
      if (formData.imagePreview) {
        articleData.banner = formData.imagePreview;
      }
      
      // Отправляем данные на сервер
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        body: articleData
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Статья успешно обновлена');
        
        // Определяем, куда перенаправить пользователя после редактирования статьи
        const userRole = user?.role?.toUpperCase();
        if (userRole === 'ADMIN') {
          // Администратора перенаправляем на страницу управления статьями в админке
        router.push('/admin/articles');
        } else {
          // Специалиста перенаправляем на страницу его статей в личном кабинете
          router.push('/cabinet/articles');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Произошла ошибка при обновлении статьи');
      }
    } catch (error) {
      console.error('Ошибка при обновлении статьи:', error);
      toast.error('Ошибка при обновлении статьи. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Обработчик применения сгенерированного баннера
  const handleApplyGeneratedBanner = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      imagePreview: imageUrl
    }));
    
    // Очищаем ошибку, если была
    if (errors.image) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.image;
        return newErrors;
      });
    }
  };
  
  // Обработчик применения сгенерированного текста
  const handleApplyGeneratedText = (text: string) => {
    // Заменяем содержимое редактора
    setFormData(prev => ({
      ...prev,
      content: text
    }));
    
    // Очищаем ошибку, если была
    if (errors.content) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.content;
        return newErrors;
      });
    }
  };
  
  // Обработчик добавления сгенерированного текста
  const handleAppendGeneratedText = (text: string) => {
    // Используем ref редактора для вставки текста в позицию курсора
    if (editorRef.current) {
      editorRef.current.insertContentAtCursor(text);
    } else {
      // Запасной вариант: добавляем к содержимому редактора
      setFormData(prev => ({
        ...prev,
        content: prev.content + text
      }));
    }
    
    // Очищаем ошибку, если была
    if (errors.content) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.content;
        return newErrors;
      });
    }
  };
  
  // Если пользователь не авторизован или не администратор, отображаем сообщение
  if (isLoading || isLoading404) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-[#48a9a6] rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Проверка на 404
  if (articleNotFound) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Статья не найдена</h1>
          <p className="text-gray-600 mb-6">Запрашиваемая статья не существует или была удалена.</p>
          <Link href="/admin/articles" className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#48a9a6]/90 transition-colors">
            Вернуться к списку статей
          </Link>
        </div>
      </div>
    );
  }
  
  // Защита маршрута: только для админов
  if (!user || user.role !== 'admin') {
    return null;
  }
  
  return (
    <div className="px-2 sm:px-4 md:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          {articleId ? 'Редактирование статьи' : 'Добавление статьи'}
        </h1>
        {/* Меняем ссылку, чтобы она учитывала роль пользователя */}
        {user && user.role?.toUpperCase() === 'ADMIN' ? (
          <Link 
            href="/admin/articles" 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
          Назад к списку статей
        </Link>
        ) : (
          <Link 
            href="/cabinet/articles" 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Назад к моим статьям
          </Link>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <FaSpinner className="animate-spin h-8 w-8 text-[#48a9a6] mb-4" />
            <p className="text-gray-500">Загрузка статьи...</p>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-400 mr-3" />
            <p className="text-red-700">{errorMessage}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg overflow-hidden mb-24">
          {/* Баннер статьи */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium mb-4">Обложка статьи</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="relative w-full sm:w-1/3 h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                {formData.imagePreview ? (
                  <>
                    <Image
                      src={formData.imagePreview}
                      alt="Предпросмотр обложки"
                      fill
                      style={{ objectFit: 'cover' }}
                      className="rounded-lg"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          image: null,
                          imagePreview: '',
                        });
                      }}
                    >
                      <FaTimes className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <FaImage className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Нет изображения</p>
                  </div>
                )}
              </div>
              <div className="w-full sm:w-2/3 flex flex-col gap-3">
                <p className="text-sm text-gray-600">
                  Загрузите изображение для обложки статьи.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    id="imageUpload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={imageInputRef}
                  />
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                  >
                    <FaUpload className="mr-2 h-4 w-4" />
                    Загрузить изображение
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBannerGeneratorOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-[#48a9a6] text-sm font-medium rounded-md text-white bg-[#48a9a6] hover:bg-[#3a8a87] shadow-sm"
                  >
                    <FaLightbulb className="mr-2 h-4 w-4" />
                    Сгенерировать обложку
                  </button>
                </div>
                {errors.image && (
                  <p className="text-sm text-red-600">{errors.image}</p>
                )}
              </div>
            </div>
          </div>
        
          {/* Форма для заполнения данных статьи */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold mb-4">Данные статьи</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="w-full md:col-span-2 space-y-4">
                {/* Заголовок статьи */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Заголовок статьи*
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Введите заголовок статьи"
                  />
                  {errors.title && (
                    <div className="mt-1 text-red-500 text-sm">{errors.title}</div>
                  )}
                </div>
                
                {/* Короткое описание */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
                      Краткое описание*
                    </label>
                    <span className="text-xs text-gray-500">
                      {formData.excerpt.length}/{MAX_EXCERPT_LENGTH} символов
                    </span>
                  </div>
                  <textarea
                    id="excerpt"
                    name="excerpt"
                    rows={3}
                    value={formData.excerpt}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent ${
                      errors.excerpt ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Краткое описание статьи (будет отображаться в списке)"
                    maxLength={MAX_EXCERPT_LENGTH}
                  />
                  {errors.excerpt && (
                    <div className="mt-1 text-red-500 text-sm">{errors.excerpt}</div>
                  )}
                </div>
                
                {/* Категория и специалист */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Категория*
                    </label>
                    {loadingCategories ? (
                      <SkeletonLoader />
                    ) : (
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent ${
                          errors.category ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category === 'inspiration' ? 'Вдохновение' : category}
                          </option>
                        ))}
                        <option value="customCategory">Другая категория</option>
                      </select>
                    )}
                    
                    {formData.category === 'customCategory' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          name="customCategory"
                          value={formData.customCategory}
                          onChange={handleChange}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent ${
                            errors.customCategory ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Введите название категории"
                        />
                        {errors.customCategory && (
                          <div className="mt-1 text-red-500 text-sm">{errors.customCategory}</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="specialistId" className="block text-sm font-medium text-gray-700 mb-1">
                      Специалист (автор статьи)
                    </label>
                    {loadingSpecialists ? (
                      <SkeletonLoader />
                    ) : (
                      <select
                        id="specialistId"
                        name="specialistId"
                        value={formData.specialistId}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#48a9a6] focus:border-transparent border-gray-300"
                      >
                        <option value="">Выберите специалиста (необязательно)</option>
                        {specialists.map(specialist => (
                          <option key={specialist.id} value={specialist.id}>
                            {specialist.firstName} {specialist.lastName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Статус публикации
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="published"
                        checked={formData.status === 'published'}
                        onChange={handleChange}
                        className="form-radio text-[#48a9a6] focus:ring-[#48a9a6]"
                      />
                      <span>Опубликована</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={formData.status === 'draft'}
                        onChange={handleChange}
                        className="form-radio text-[#48a9a6] focus:ring-[#48a9a6]"
                      />
                      <span>Черновик</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Редактор содержимого */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex flex-col mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Содержание статьи</h2>
              <div className="flex gap-2 mb-3">
                <button 
                  type="button" 
                  onClick={() => setIsMistralAIAssistantOpen(true)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-md font-medium"
                >
                  <FaRobot size={16} className="text-white" /> ИИ-помощник
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAIAssistantOpen(true)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#48a9a6] to-[#3d8e8c] text-white rounded-lg hover:shadow-lg hover:from-[#3d8e8c] hover:to-[#327775] transition-all duration-300 flex items-center justify-center gap-2 shadow-md font-medium"
                >
                  <FaRobot size={16} className="text-white" /> ИИ-доп.(VPN)
                </button>
              </div>
            </div>
              
            {/* Удаляем панель инструментов, оставляем только редактор */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <RichTextEditor
                ref={editorRef}
                value={formData.content}
                onChange={handleContentChange}
                onInsertImage={handleInsertImage}
                className="min-h-[400px]"
              />
            </div>
            
            {errors.content && (
              <div className="mt-2 text-red-500 text-sm">{errors.content}</div>
            )}
          </div>
          
          {/* Кнопка сохранения */}
          <div className="flex justify-end p-6 bg-gray-50 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-lg flex items-center ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#48a9a6] hover:bg-[#48a9a6]/90'
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
      
      {/* Модальные окна */}
      <BannerGenerator
        isOpen={isBannerGeneratorOpen}
        onClose={() => setIsBannerGeneratorOpen(false)}
        onApplyImage={handleApplyGeneratedBanner}
      />
      
      <AIWritingAssistant 
        isOpen={isAIAssistantOpen} 
        onClose={() => setIsAIAssistantOpen(false)} 
        onApplyText={handleApplyGeneratedText}
        onAppendText={handleAppendGeneratedText}
        currentContent={formData.content}
      />
      
      <MistralAIAssistant 
        isOpen={isMistralAIAssistantOpen} 
        onClose={() => setIsMistralAIAssistantOpen(false)} 
        onApplyText={handleApplyGeneratedText}
        onAppendText={handleAppendGeneratedText}
        currentContent={formData.content}
      />
    </div>
  );
} 