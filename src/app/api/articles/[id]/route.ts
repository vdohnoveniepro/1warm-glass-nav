import { NextRequest, NextResponse } from "next/server";
import { articlesAPI } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/models/types";

// Получение статьи по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`Запрос на получение статьи с ID: ${id}`);
    
    const article = articlesAPI.getById(id);
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: "Статья не найдена" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error(`Ошибка при получении статьи: ${error}`);
    return NextResponse.json(
      { success: false, message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

// Удаление статьи по ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка авторизации
    const user = await getCurrentUser();
    
    if (!user) {
      console.log("Отказано в доступе: пользователь не авторизован");
      return NextResponse.json(
        { success: false, message: "Требуется авторизация" },
        { status: 401 }
      );
    }
    
    // Специальная проверка для пользователя bakeevd@yandex.ru
    if (user.email === 'bakeevd@yandex.ru') {
      console.log('Специальный доступ разрешен для bakeevd@yandex.ru');
    }
    // Для всех остальных пользователей проверяем роль админа
    else if (user.role !== UserRole.ADMIN) {
      console.log(`Отказано в доступе: недостаточно прав. Роль пользователя: ${user.role}`);
      return NextResponse.json(
        { success: false, message: "Недостаточно прав для выполнения операции" },
        { status: 403 }
      );
    }
    
    const id = params.id;
    console.log(`Запрос на удаление статьи с ID: ${id} от пользователя ${user.email}`);
    
    // Проверяем существование статьи
    const article = articlesAPI.getById(id);
    if (!article) {
      console.log(`Статья с ID ${id} не найдена`);
      return NextResponse.json(
        { success: false, message: "Статья не найдена" },
        { status: 404 }
      );
    }
    
    // Удаляем статью
    const deleted = articlesAPI.delete(id);
    
    if (!deleted) {
      console.log(`Ошибка при удалении статьи с ID ${id}`);
      return NextResponse.json(
        { success: false, message: "Не удалось удалить статью" },
        { status: 500 }
      );
    }
    
    console.log(`Статья с ID ${id} успешно удалена`);
    return NextResponse.json({ 
      success: true, 
      message: "Статья успешно удалена" 
    });
  } catch (error) {
    console.error(`Ошибка при удалении статьи: ${error}`);
    return NextResponse.json(
      { success: false, message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

// Обновление статьи по ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка авторизации
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Требуется авторизация" },
        { status: 401 }
      );
    }
    
    // Специальная проверка для пользователя bakeevd@yandex.ru
    if (user.email === 'bakeevd@yandex.ru') {
      console.log('Специальный доступ разрешен для bakeevd@yandex.ru');
    }
    // Для всех остальных пользователей проверяем роль админа
    else if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Недостаточно прав для выполнения операции" },
        { status: 403 }
      );
    }
    
    const id = params.id;
    const data = await request.json();
    
    // Проверяем существование статьи
    const article = articlesAPI.getById(id);
    if (!article) {
      return NextResponse.json(
        { success: false, message: "Статья не найдена" },
        { status: 404 }
      );
    }
    
    // Обновляем статью
    const updatedArticle = articlesAPI.update(id, data);
    
    if (!updatedArticle) {
      return NextResponse.json(
        { success: false, message: "Не удалось обновить статью" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Статья успешно обновлена",
      data: updatedArticle
    });
  } catch (error) {
    console.error(`Ошибка при обновлении статьи: ${error}`);
    return NextResponse.json(
      { success: false, message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
} 