// Увеличиваем лимит слушателей событий для предотвращения предупреждений о возможных утечках памяти
require('events').EventEmitter.defaultMaxListeners = 20;

// Экспортируем функцию для явного вызова в других местах, если потребуется
export function configureEventEmitter(maxListeners = 20) {
  require('events').EventEmitter.defaultMaxListeners = maxListeners;
}

// Автоматически вызываем при импорте файла
configureEventEmitter(); 