import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { specialistsAPI } from '@/database/api/specialists';
import { usersAdapter } from '@/database/adapters';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/models/types';
import { processImageFromBase64, saveOriginalImage } from '@/lib/imageProcessing';
import { ApiResponse } from '@/models/types';

/**
 * GET /api/auth/me/specialist - получение профиля специалиста текущего пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("next-auth.session-token")?.value || cookieStore.get("__Secure-next-auth.session-token")?.value;
    const userEmail = cookieStore.get("user_email")?.value;

    if (!sessionToken && !userEmail) {
      return NextResponse.json({
        success: false,
        error: "Не авторизован",
      }, { status: 401 });
    }

    // Получаем пользователя
    const user = await usersAdapter.getByEmail(userEmail || "");

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Пользователь не найден",
      }, { status: 404 });
    }

    // Проверяем, есть ли связанный специалист
    if (!user.specialistId) {
      console.log(`[API] Пользователь ${user.id} имеет роль специалиста, но не имеет связанного профиля специалиста`);
      
      // Проверяем, есть ли у пользователя роль SPECIALIST
      let userRoles = [];
      
      // Проверяем формат ролей и преобразуем в массив, если необходимо
      if (user.roles) {
        if (Array.isArray(user.roles)) {
          userRoles = user.roles;
        } else if (typeof user.roles === 'string') {
          try {
            // Пробуем распарсить JSON
            userRoles = JSON.parse(user.roles);
          } catch (e) {
            // Если не удалось распарсить, используем как одну роль
            userRoles = [user.roles];
          }
        } else {
          // Если неизвестный формат, используем основную роль
          userRoles = [user.role.toLowerCase()];
        }
      } else {
        // Если ролей нет, используем основную роль
        userRoles = [user.role.toLowerCase()];
      }
      
      // Теперь когда у нас точно есть массив, можно использовать map
      const isSpecialist = userRoles.some(r => 
        typeof r === 'string' && r.toLowerCase() === 'specialist'
      ) || user.role.toLowerCase() === 'specialist';
      
      if (isSpecialist) {
        // Проверяем, есть ли уже специалист с таким userId
        const existingSpecialist = await specialistsAPI.getByUserId(user.id);
        
        if (existingSpecialist) {
          console.log(`[API] Найден существующий профиль специалиста с userId=${user.id}, ID: ${existingSpecialist.id}`);
          
          // Обновляем пользователя, добавляя связь со специалистом
          const updatedUser = await usersAdapter.update(user.id, { 
            specialistId: existingSpecialist.id,
            role: UserRole.SPECIALIST
          });
          
          return NextResponse.json({
            success: true,
            data: existingSpecialist,
          });
        }

        // Создаем новый профиль специалиста для пользователя
        console.log(`[API] Автоматически создаем профиль специалиста для пользователя ${user.id}`);
        
        const newSpecialist = await specialistsAPI.create({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          photo: user.photo || null,
          description: '',
          position: 'Специалист',
          userId: user.id,
          experience: 0,
          order: 9999, // Ставим в конец списка
          additionalPositions: []
        });
        
        if (newSpecialist) {
          // Обновляем пользователя, добавляя связь со специалистом
          const updatedUser = await usersAdapter.update(user.id, { 
            specialistId: newSpecialist.id,
            role: UserRole.SPECIALIST
          });
          
          console.log(`[API] Профиль специалиста создан, ID: ${newSpecialist.id}`);
          
          return NextResponse.json({
            success: true,
            data: newSpecialist,
          });
        }
      }
      
      return NextResponse.json({
        success: false,
        error: "Специалист не найден",
      }, { status: 404 });
    }

    // Получаем специалиста
    const specialist = await specialistsAPI.getById(user.specialistId);

    if (!specialist) {
      // Исправляем несоответствие в данных пользователя
      console.error(`Ошибка: у пользователя ID=${user.id} указан specialistId=${user.specialistId}, но такого специалиста не существует.`);
      
      // Обновляем данные пользователя, убирая некорректную ссылку
      const updatedUser = {
        ...user,
        specialistId: undefined,
        role: UserRole.USER
      };
      
      await usersAdapter.update(user.id, updatedUser);
      
      return NextResponse.json({
        success: false,
        error: "Специалист не найден. Данные пользователя обновлены.",
      }, { status: 404 });
    }

    // Проверка, что специалист действительно связан с этим пользователем
    if (specialist.userId && specialist.userId !== user.id) {
      console.error(`Ошибка: Специалист ID=${specialist.id} связан с другим пользователем ID=${specialist.userId}, а не с текущим ID=${user.id}`);
      
      return NextResponse.json({
        success: false,
        error: "Специалист связан с другим пользователем",
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: specialist,
    });
  } catch (error) {
    console.error("Ошибка получения данных специалиста:", error);
    return NextResponse.json({
      success: false,
      error: "Внутренняя ошибка сервера",
    }, { status: 500 });
  }
}

/**
 * PUT /api/auth/me/specialist - обновить профиль специалиста для текущего пользователя
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const email = cookieStore.get('user_email')?.value;

    if (!token || !email) {
      return NextResponse.json(
        { success: false, error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const user = await usersAdapter.getByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (!user.specialistId) {
      return NextResponse.json(
        { success: false, error: 'У пользователя нет привязанного специалиста' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Не позволяем менять userId
    if (body.userId && body.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Нельзя изменить привязку к пользователю' },
        { status: 403 }
      );
    }

    // Обработка фотографий
    if (body.photo && body.photo.startsWith('data:')) {
      const photoPath = await saveOriginalImage(body.photo, 'specialists');
      if (photoPath) {
        body.photo = photoPath;
      }
    }

    if (body.backgroundImage && body.backgroundImage.startsWith('data:')) {
      const bgPath = await saveOriginalImage(body.backgroundImage, 'specialists');
      if (bgPath) {
        body.backgroundImage = bgPath;
      }
    }

    // Обновляем специалиста
    const updatedSpecialist = await specialistsAPI.update(user.specialistId, body);

    if (!updatedSpecialist) {
      return NextResponse.json(
        { success: false, error: 'Не удалось обновить специалиста' },
        { status: 500 }
      );
    }

    // Синхронизируем данные с пользователем
    // Расширяем синхронизацию, чтобы профиль специалиста всегда имел приоритет
    const userUpdate = {
      ...(body.firstName && { firstName: body.firstName }),
      ...(body.lastName && { lastName: body.lastName }),
      ...(body.photo && { photo: body.photo }),
      ...(body.photo && { avatar: body.photo }) // Дублируем фото в поле avatar для совместимости
    };

    // Если есть данные для обновления, обновляем профиль пользователя
    if (Object.keys(userUpdate).length > 0) {
      try {
        const updatedUser = await usersAdapter.update(user.id, userUpdate);
        if (!updatedUser) {
          console.error('Ошибка при синхронизации данных пользователя');
        } else {
          console.log('Профиль пользователя успешно синхронизирован с профилем специалиста:', {
            firstName: userUpdate.firstName,
            lastName: userUpdate.lastName,
            photo: userUpdate.photo ? 'Обновлено' : 'Без изменений'
          });
        }
      } catch (error) {
        console.error('Ошибка при синхронизации данных пользователя:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedSpecialist
    });

  } catch (error) {
    console.error('Ошибка при обновлении специалиста:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении специалиста' },
      { status: 500 }
    );
  }
}

/**
 * POST запрос для создания привязки специалиста к текущему пользователю
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const email = cookieStore.get('user_email')?.value;

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const user = await usersAdapter.getByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли уже у пользователя привязанный специалист
    if (user.specialistId) {
      const specialist = await specialistsAPI.getById(user.specialistId);
      if (specialist) {
        return NextResponse.json(
          { error: 'У пользователя уже есть привязанный специалист' },
          { status: 409 }
        );
      }
    }

    const body = await request.json();
    
    // Обработка фотографий
    if (body.photo && body.photo.startsWith('data:')) {
      const photoPath = await saveOriginalImage(body.photo, 'specialists');
      if (photoPath) {
        body.photo = photoPath;
      }
    }

    if (body.backgroundImage && body.backgroundImage.startsWith('data:')) {
      const bgPath = await saveOriginalImage(body.backgroundImage, 'specialists');
      if (bgPath) {
        body.backgroundImage = bgPath;
      }
    }

    // Устанавливаем связь с текущим пользователем
    body.userId = user.id;
    
    // Создаем нового специалиста
    const newSpecialist = await specialistsAPI.create(body);
    
    if (!newSpecialist) {
      return NextResponse.json(
        { error: 'Не удалось создать специалиста' },
        { status: 500 }
      );
    }
    
    // Обновляем пользователя, добавляя связь со специалистом и меняя роль
    const updatedUser = await usersAdapter.update(user.id, { 
      specialistId: newSpecialist.id,
      role: UserRole.SPECIALIST,
      ...(body.photo && { photo: body.photo }),
      ...(body.photo && { avatar: body.photo }) // Дублируем фото в поле avatar для совместимости
    });
    
    if (!updatedUser) {
      // Если не удалось обновить пользователя, удаляем созданного специалиста
      await specialistsAPI.delete(newSpecialist.id);
      return NextResponse.json(
        { success: false, error: 'Не удалось обновить пользователя' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: newSpecialist
    });
  } catch (error) {
    console.error('Ошибка при создании специалиста:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании специалиста' },
      { status: 500 }
    );
  }
}