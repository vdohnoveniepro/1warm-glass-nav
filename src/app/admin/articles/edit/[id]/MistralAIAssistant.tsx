'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaCheck, FaTimes, FaPlus, FaImage, FaPencilAlt, FaLightbulb, 
  FaSpinner, FaChevronDown, FaChevronRight, FaExclamationTriangle, FaRobot 
} from 'react-icons/fa';
import { MdOutlineAutoFixHigh } from 'react-icons/md';

// Интерфейс компонента
interface MistralAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyText: (text: string) => void;
  onAppendText: (text: string) => void;
  currentContent?: string;
}

// Компонент модального окна ИИ-помощник (Mistral)
const MistralAIAssistant = ({ 
  isOpen, 
  onClose, 
  onApplyText,
  onAppendText,
  currentContent = ''
}: MistralAIAssistantProps) => {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Режим работы: generate (статья), improve (улучшение), ideas (идеи), image (изображение)
  const [mode, setMode] = useState<'generate' | 'improve' | 'ideas' | 'image'>('generate');
  
  // Состояния для хранения контента в разных режимах
  const [generateContent, setGenerateContent] = useState('');
  const [improveContent, setImproveContent] = useState('');
  const [ideasContent, setIdeasContent] = useState('');
  const [imageContent, setImageContent] = useState('');
  const [improveOption, setImproveOption] = useState('grammar');
  
  // Параметры для генерации изображений
  const [pipelineId, setPipelineId] = useState('');
  const [imageStyle, setImageStyle] = useState('DEFAULT');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageWidth, setImageWidth] = useState(512);
  const [imageHeight, setImageHeight] = useState(512);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showAdvancedImageSettings, setShowAdvancedImageSettings] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
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
  
  // API ключ для Mistral
  const MISTRAL_API_KEY = 'OLyRmijddZw637e6jLCXR8H7DBOm6idj';
  
  // API ключи для FusionBrain
  const FUSION_BRAIN_API_KEY = '80810B8110B4948751EE149B79323C97';
  const FUSION_BRAIN_SECRET_KEY = '82CD04179C21806452EE34C351A882F7';
  const FUSION_BRAIN_URL = 'https://api-key.fusionbrain.ai/';
  
  // Варианты улучшения текста
  const improveOptions = [
    { id: 'grammar', title: 'Исправить грамматику', prompt: 'Проверь следующий текст на предмет ошибок, грамматических неточностей, пунктуации и т.д. Исправь все найденные ошибки, сохраняя смысл и содержание.' },
    { id: 'style', title: 'Стиль', prompt: 'Полностью измени стиль следующего текста, сохраняя основное содержание и смысл. Сделай его уникальным и оригинальным.' },
    { id: 'expand', title: 'Расширить текст', prompt: 'Значительно увеличь объем следующего текста, добавив больше деталей, примеров, пояснений и дополнительной информации. Сделай текст более информативным и полным.' },
    { id: 'rewrite', title: 'Переписать', prompt: 'Полностью перепиши и переработай следующий текст, сохраняя основной смысл и ключевые моменты, но используя другие слова, структуру и подход.' },
    { id: 'custom', title: 'Свой вариант', prompt: '' }
  ];

  // Получаем pipeline_id при загрузке компонента или переключении на режим изображения
  useEffect(() => {
    if (isOpen && mode === 'image' && !pipelineId) {
      getPipelineId();
    }
  }, [isOpen, mode, pipelineId]);

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

  // Функция для генерации контента с помощью Mistral API
  const generateWithMistralAI = async () => {
    if (isGenerating) return;
    
    // Очищаем предыдущие ошибки
    setError('');
    setIsGenerating(true);
    
    try {
      let finalPrompt = '';
      let responseField = '';
      
      // Формируем промпт в зависимости от режима
      if (mode === 'generate') {
        finalPrompt = `Напиши полноценную статью на тему: ${prompt}`;
        responseField = 'generate';
      } else if (mode === 'improve') {
        // Используем выбранный вариант улучшения или настраиваемый промпт
        const selectedOption = improveOptions.find(opt => opt.id === improveOption);
        if (selectedOption) {
          if (selectedOption.id === 'custom') {
            if (!prompt.trim()) {
              setError('Для опции "Свой вариант" необходимо заполнить дополнительные указания');
              setIsGenerating(false);
              return;
            }
            finalPrompt = `${prompt}\n\nТекст для улучшения:\n${currentContent}`;
          } else {
            finalPrompt = `${selectedOption.prompt}\n\nДополнительные указания: ${prompt}\n\nТекст для улучшения:\n${currentContent}`;
          }
        }
        responseField = 'improve';
      } else if (mode === 'ideas') {
        finalPrompt = `Предложи 5-7 интересных идей для статей на тему: ${prompt}. Для каждой идеи укажи возможное название и краткое описание (2-3 предложения).`;
        responseField = 'ideas';
      } else if (mode === 'image') {
        // Для изображений используем FusionBrain API
        await generateImageWithFusionBrain();
        return;
      }
      
      console.log('Отправляем запрос в Mistral API с промптом:', finalPrompt);
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            { role: 'system', content: 'Ты профессиональный копирайтер и эксперт по созданию контента. Отвечай только на русском языке. Твои ответы должны быть хорошо структурированными, с использованием HTML тегов для форматирования.' },
            { role: 'user', content: finalPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ошибка API Mistral: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Получен ответ от Mistral API:', data);
      
      if (data.choices && data.choices.length > 0) {
        // Форматируем текст, добавляя HTML-теги для абзацев, если их нет
        let content = data.choices[0].message.content;
        
        // Если текст не содержит HTML-теги, добавляем базовое форматирование
        if (!content.includes('<')) {
          content = content
            .split('\n\n')
            .map((para: string) => para ? `<p>${para}</p>` : '')
            .join('');
        }
        
        // Сохраняем результат в соответствующее состояние
        if (responseField === 'generate') {
          setGenerateContent(content);
        } else if (responseField === 'improve') {
          setImproveContent(content);
        } else if (responseField === 'ideas') {
          setIdeasContent(content);
        }
      } else {
        throw new Error('Получен пустой ответ от API Mistral');
      }
    } catch (err) {
      console.error('Ошибка при генерации с помощью Mistral:', err);
      setError(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsGenerating(false);
    }
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

  // Если модальное окно закрыто, не рендерим ничего
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
          <h3 className="text-xl font-semibold flex items-center">
            <FaRobot className="mr-2" /> 
            ИИ-помощник (Mistral)
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
                  onClick={() => setMode('generate')}
                  className={`py-2 px-3 text-sm rounded-lg flex items-center justify-center ${
                    mode === 'generate' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <FaPencilAlt className="mr-2 text-xs" /> Статья
                </button>
                <button 
                  onClick={() => setMode('improve')}
                  className={`py-2 px-3 text-sm rounded-lg flex items-center justify-center ${
                    mode === 'improve' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <MdOutlineAutoFixHigh className="mr-2" /> Улучшить
                </button>
                <button 
                  onClick={() => setMode('ideas')}
                  className={`py-2 px-3 text-sm rounded-lg flex items-center justify-center ${
                    mode === 'ideas' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <FaLightbulb className="mr-2 text-xs" /> Идеи
                </button>
                <button
                  onClick={() => setMode('image')}
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
                onClick={generateWithMistralAI}
                disabled={isGenerating || (mode !== 'improve' && !prompt.trim()) || (mode === 'improve' && improveOption === 'custom' && !prompt.trim())}
                className={`w-full py-2 rounded-lg flex items-center justify-center 
                  ${isGenerating || (mode !== 'improve' && !prompt.trim()) || (mode === 'improve' && improveOption === 'custom' && !prompt.trim())
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

export default MistralAIAssistant; 