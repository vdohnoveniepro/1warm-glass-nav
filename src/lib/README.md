# Адаптер базы данных для проекта

## Миграция с JSON на SQLite

В проекте была выполнена миграция данных из JSON файлов в базу данных SQLite для повышения производительности и обеспечения более надежного доступа к данным.

## Как использовать новую базу данных

Вместо прямого импорта и использования модулей из `src/models/*API.ts` (которые работают с JSON файлами), следует использовать адаптеры из `src/lib/database-adapter.ts`:

```typescript
// Раньше (JSON API):
import { getAllUsers, getUserById } from '@/models/usersAPI';

// Теперь (SQLite API через адаптер):
import { usersAPI } from '@/lib/database-adapter';
const { getAllUsers, getUserById } = usersAPI;
```

## Доступные API через адаптер

- `usersAPI` - для работы с пользователями
- `servicesAPI` - для работы с услугами
- `specialistsAPI` - для работы с специалистами
- `appointmentsAPI` - для работы с записями на прием
- `articlesAPI` - для работы с статьями

## Прямой доступ к базе данных

Если вам нужен прямой доступ к базе данных SQLite для выполнения сложных запросов, которых нет в адаптерах, вы можете использовать:

```typescript
import { db } from '@/database/db';

// Выполнение SQL-запроса
const results = db.prepare('SELECT * FROM users WHERE role = ?').all('admin');
```

## Структура базы данных

Структура базы данных определена в файле `src/database/schema.ts`. Там же находятся и функции для инициализации базы данных. 