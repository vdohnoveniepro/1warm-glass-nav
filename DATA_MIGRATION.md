# Миграция базы данных

## Обновление структуры данных

В этом проекте была выполнена миграция базы данных из директории `/data` в директорию `/public/data` для устранения дублирования и стандартизации хранения данных.

### Что было сделано:

1. Все файлы JSON из директории `/data` перенесены в соответствующие поддиректории в `/public/data`:
   - specialists.json → /public/data/specialists/specialists.json
   - services.json → /public/data/services/services.json  
   - appointments.json → /public/data/appointments/appointments.json
   - articles.json → /public/data/articles/articles.json
   - reviews.json → /public/data/reviews/reviews.json
   - events.json → /public/data/events/events.json
   - users.json → /public/data/users/users.json
   - settings.json → /public/data/settings/settings.json

2. Обновлены все пути в коде для использования новой структуры:
   - Обновлены константы путей в `src/lib/api.ts`
   - Исправлены ссылки на файлы в других компонентах и API

3. Все API-функции теперь используют единую структуру директорий `/public/data`.

### Структура базы данных:

```
/public/data/
  ├── specialists/
  │   └── specialists.json
  ├── services/
  │   └── services.json
  ├── appointments/
  │   └── appointments.json
  ├── articles/
  │   └── articles.json
  ├── reviews/
  │   └── reviews.json
  ├── events/
  │   └── events.json
  ├── users/
  │   └── users.json
  └── settings/
      └── settings.json
      └── notifications.json
      └── media.json
      └── appointments.json
```

## Важно!

**Директория `/data` больше не используется и может быть безопасно удалена после подтверждения работоспособности сайта с новой структурой данных.**

## Скрипты миграции

Для выполнения миграции были использованы следующие скрипты:
- `scripts/migrate-data.js` - для копирования файлов в новую структуру
- `scripts/validate-data-paths.js` - для обновления путей в коде

Эти скрипты могут быть полезны в случае необходимости дальнейшей реорганизации структуры данных. 