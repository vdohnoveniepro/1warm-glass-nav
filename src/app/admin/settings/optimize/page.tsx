'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/ui/Loading';
import SettingsCard from '@/components/admin/SettingsCard';
import toastService from '@/components/ui/Toast';
import AdminTitle from '@/components/admin/AdminTitle';

// Тип для настроек оптимизации
interface OptimizationSettings {
  caching: {
    enabled: boolean;
    apiCacheTTL: number;
    staticAssetsTTL: number;
    browserCacheControl: boolean;
  };
  preloading: {
    enabled: boolean;
    prefetchLinks: boolean;
    preconnect: boolean;
  };
  images: {
    lazyLoad: boolean;
    optimizeOnUpload: boolean;
    convertToWebP: boolean;
    quality: number;
  };
  javascript: {
    minify: boolean;
    splitChunks: boolean;
    treeshaking: boolean;
  };
  css: {
    minify: boolean;
    purgeUnused: boolean;
  };
}

export default function OptimizeSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<OptimizationSettings | null>(null);

  // Загрузка настроек оптимизации
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/admin/optimize');
        if (!response.ok) {
          throw new Error('Не удалось загрузить настройки оптимизации');
        }
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
        toastService.error('Ошибка при загрузке настроек оптимизации');
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Сохранение настроек
  const saveSettings = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить настройки');
      }

      toastService.success('Настройки оптимизации успешно сохранены');
      router.refresh();
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      toastService.error('Ошибка при сохранении настроек оптимизации');
    } finally {
      setIsSaving(false);
    }
  };

  // Очистка кэша и обновление всех страниц
  const clearCache = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/optimize', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Не удалось очистить кэш');
      }

      toastService.success('Кэш успешно очищен, страницы перевалидированы');
      router.refresh();
    } catch (error) {
      console.error('Ошибка при очистке кэша:', error);
      toastService.error('Ошибка при очистке кэша');
    } finally {
      setIsSaving(false);
    }
  };

  // Обработчик изменения настроек кэширования
  const handleCachingChange = (key: keyof OptimizationSettings['caching'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      caching: {
        ...settings.caching,
        [key]: value,
      },
    });
  };

  // Обработчик изменения настроек предзагрузки
  const handlePreloadingChange = (key: keyof OptimizationSettings['preloading'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      preloading: {
        ...settings.preloading,
        [key]: value,
      },
    });
  };

  // Обработчик изменения настроек изображений
  const handleImagesChange = (key: keyof OptimizationSettings['images'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      images: {
        ...settings.images,
        [key]: value,
      },
    });
  };

  // Обработчик изменения настроек JavaScript
  const handleJavascriptChange = (key: keyof OptimizationSettings['javascript'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      javascript: {
        ...settings.javascript,
        [key]: value,
      },
    });
  };

  // Обработчик изменения настроек CSS
  const handleCssChange = (key: keyof OptimizationSettings['css'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      css: {
        ...settings.css,
        [key]: value,
      },
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!settings) {
    return <div className="text-center p-4">Ошибка загрузки настроек</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <AdminTitle title="Настройки оптимизации" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Настройки кэширования */}
        <SettingsCard title="Кэширование" description="Настройки кэширования для улучшения производительности">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Включить кэширование</label>
              <input
                type="checkbox"
                checked={settings.caching.enabled}
                onChange={(e) => handleCachingChange('enabled', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">API кэш (секунды)</label>
              <input
                type="number"
                value={settings.caching.apiCacheTTL}
                onChange={(e) => handleCachingChange('apiCacheTTL', parseInt(e.target.value) || 0)}
                className="input input-bordered w-full"
                disabled={!settings.caching.enabled}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Кэш статических ресурсов (секунды)</label>
              <input
                type="number"
                value={settings.caching.staticAssetsTTL}
                onChange={(e) => handleCachingChange('staticAssetsTTL', parseInt(e.target.value) || 0)}
                className="input input-bordered w-full"
                disabled={!settings.caching.enabled}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Контроль кэша браузера</label>
              <input
                type="checkbox"
                checked={settings.caching.browserCacheControl}
                onChange={(e) => handleCachingChange('browserCacheControl', e.target.checked)}
                className="toggle"
                disabled={!settings.caching.enabled}
              />
            </div>
          </div>
        </SettingsCard>

        {/* Настройки предзагрузки */}
        <SettingsCard title="Предзагрузка" description="Настройки предзагрузки для ускорения навигации">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Включить предзагрузку</label>
              <input
                type="checkbox"
                checked={settings.preloading.enabled}
                onChange={(e) => handlePreloadingChange('enabled', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Предзагрузка ссылок</label>
              <input
                type="checkbox"
                checked={settings.preloading.prefetchLinks}
                onChange={(e) => handlePreloadingChange('prefetchLinks', e.target.checked)}
                className="toggle"
                disabled={!settings.preloading.enabled}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Предварительное соединение</label>
              <input
                type="checkbox"
                checked={settings.preloading.preconnect}
                onChange={(e) => handlePreloadingChange('preconnect', e.target.checked)}
                className="toggle"
                disabled={!settings.preloading.enabled}
              />
            </div>
          </div>
        </SettingsCard>

        {/* Настройки изображений */}
        <SettingsCard title="Изображения" description="Настройки оптимизации изображений">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Ленивая загрузка</label>
              <input
                type="checkbox"
                checked={settings.images.lazyLoad}
                onChange={(e) => handleImagesChange('lazyLoad', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Оптимизация при загрузке</label>
              <input
                type="checkbox"
                checked={settings.images.optimizeOnUpload}
                onChange={(e) => handleImagesChange('optimizeOnUpload', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Конвертация в WebP</label>
              <input
                type="checkbox"
                checked={settings.images.convertToWebP}
                onChange={(e) => handleImagesChange('convertToWebP', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Качество изображений (%)</label>
              <input
                type="range"
                min="30"
                max="100"
                value={settings.images.quality}
                onChange={(e) => handleImagesChange('quality', parseInt(e.target.value))}
                className="range"
              />
              <div className="text-center">{settings.images.quality}%</div>
            </div>
          </div>
        </SettingsCard>

        {/* Настройки JavaScript */}
        <SettingsCard title="JavaScript" description="Настройки оптимизации JavaScript">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Минификация</label>
              <input
                type="checkbox"
                checked={settings.javascript.minify}
                onChange={(e) => handleJavascriptChange('minify', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Разделение чанков</label>
              <input
                type="checkbox"
                checked={settings.javascript.splitChunks}
                onChange={(e) => handleJavascriptChange('splitChunks', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Tree Shaking</label>
              <input
                type="checkbox"
                checked={settings.javascript.treeshaking}
                onChange={(e) => handleJavascriptChange('treeshaking', e.target.checked)}
                className="toggle"
              />
            </div>
          </div>
        </SettingsCard>

        {/* Настройки CSS */}
        <SettingsCard title="CSS" description="Настройки оптимизации CSS">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Минификация</label>
              <input
                type="checkbox"
                checked={settings.css.minify}
                onChange={(e) => handleCssChange('minify', e.target.checked)}
                className="toggle"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Удаление неиспользуемых стилей</label>
              <input
                type="checkbox"
                checked={settings.css.purgeUnused}
                onChange={(e) => handleCssChange('purgeUnused', e.target.checked)}
                className="toggle"
              />
            </div>
          </div>
        </SettingsCard>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="btn btn-primary flex-1"
        >
          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>

        <button
          onClick={clearCache}
          disabled={isSaving}
          className="btn btn-secondary flex-1"
        >
          {isSaving ? 'Очистка...' : 'Очистить кэш и обновить страницы'}
        </button>
      </div>
    </div>
  );
} 